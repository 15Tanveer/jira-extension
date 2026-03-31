const ATLASSIAN_AUTH = 'https://auth.atlassian.com';
const ATLASSIAN_API = 'https://api.atlassian.com';
const SCOPES = [
  'read:jira-work',
  'read:project:jira',
  'offline_access'
];

// Set this in chrome.storage.local as "jira_client_id" from the Atlassian 3LO app.
const CONFIG_KEYS = {
  token: 'jira_oauth_token',
  clientId: 'jira_client_id',
  cloudId: 'jira_cloud_id'
};

const enc = new TextEncoder();

async function sha256(plain) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(plain));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function randomString(length = 64) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => charset[v % charset.length]).join('');
}

async function getStorage(keys) {
  return chrome.storage.local.get(keys);
}

async function setStorage(data) {
  return chrome.storage.local.set(data);
}

async function clearStorage(keys) {
  return chrome.storage.local.remove(keys);
}

async function getClientId() {
  const data = await getStorage(CONFIG_KEYS.clientId);
  if (!data[CONFIG_KEYS.clientId]) {
    throw new Error('Missing Atlassian OAuth client id. Add it in extension options/storage.');
  }
  return data[CONFIG_KEYS.clientId];
}

async function exchangeCodeForToken(code, verifier, redirectUri, clientId) {
  const response = await fetch(`${ATLASSIAN_AUTH}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri
    })
  });

  if (!response.ok) {
    throw new Error(`OAuth token exchange failed (${response.status})`);
  }

  const token = await response.json();
  token.expires_at = Date.now() + (token.expires_in - 30) * 1000;
  await setStorage({ [CONFIG_KEYS.token]: token });
  return token;
}

async function refreshToken() {
  const { [CONFIG_KEYS.token]: token } = await getStorage(CONFIG_KEYS.token);
  const clientId = await getClientId();

  if (!token?.refresh_token) {
    throw new Error('No refresh token available, please login again.');
  }

  const response = await fetch(`${ATLASSIAN_AUTH}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: token.refresh_token
    })
  });

  if (!response.ok) {
    await clearStorage([CONFIG_KEYS.token]);
    throw new Error(`Token refresh failed (${response.status}). Please login again.`);
  }

  const nextToken = await response.json();
  nextToken.refresh_token = nextToken.refresh_token || token.refresh_token;
  nextToken.expires_at = Date.now() + (nextToken.expires_in - 30) * 1000;
  await setStorage({ [CONFIG_KEYS.token]: nextToken });
  return nextToken;
}

async function getValidToken() {
  const { [CONFIG_KEYS.token]: token } = await getStorage(CONFIG_KEYS.token);
  if (!token) return null;
  if (Date.now() < token.expires_at) return token;
  return refreshToken();
}

async function getCloudId(accessToken) {
  const existing = await getStorage(CONFIG_KEYS.cloudId);
  if (existing[CONFIG_KEYS.cloudId]) return existing[CONFIG_KEYS.cloudId];

  const response = await fetch(`${ATLASSIAN_AUTH}/oauth/token/accessible-resources`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error('Failed to get Jira cloud resource.');

  const resources = await response.json();
  const jiraResource = resources.find((r) => r.scopes?.includes('read:jira-work')) || resources[0];
  if (!jiraResource?.id) throw new Error('No Jira resource available for this account.');

  await setStorage({ [CONFIG_KEYS.cloudId]: jiraResource.id });
  return jiraResource.id;
}

async function loginWithOAuth() {
  const clientId = await getClientId();
  const redirectUri = chrome.identity.getRedirectURL('atlassian');

  const verifier = randomString(96);
  const challenge = await sha256(verifier);
  const state = randomString(32);

  const authUrl = new URL(`${ATLASSIAN_AUTH}/authorize`);
  authUrl.searchParams.set('audience', 'api.atlassian.com');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('scope', SCOPES.join(' '));
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const redirectedTo = await chrome.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true
  });

  const redirect = new URL(redirectedTo);
  const returnedState = redirect.searchParams.get('state');
  if (state !== returnedState) {
    throw new Error('OAuth state mismatch. Please retry login.');
  }

  const code = redirect.searchParams.get('code');
  if (!code) {
    throw new Error('No authorization code returned by Atlassian.');
  }

  const token = await exchangeCodeForToken(code, verifier, redirectUri, clientId);
  await getCloudId(token.access_token);
  return { loggedIn: true };
}

async function jiraRequest(path, { method = 'GET', body, jqlMaxResults = 100 } = {}) {
  const token = await getValidToken();
  if (!token?.access_token) throw new Error('Not authenticated.');

  const cloudId = await getCloudId(token.access_token);
  const isSearch = path.startsWith('/rest/api/3/search') && method === 'POST';
  const url = `${ATLASSIAN_API}/ex/jira/${cloudId}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Jira API failed (${response.status}): ${text.slice(0, 120)}`);
  }

  const data = await response.json();
  if (isSearch && data.maxResults < jqlMaxResults && data.total > data.issues?.length) {
    return data;
  }
  return data;
}

async function getProjects() {
  const cached = await getStorage('jira_projects_cache');
  if (cached.jira_projects_cache && Date.now() - cached.jira_projects_cache.ts < 5 * 60 * 1000) {
    return cached.jira_projects_cache.projects;
  }

  const projects = await jiraRequest('/rest/api/3/project');
  const simplified = projects
    .map((p) => ({ id: p.id, key: p.key, name: p.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  await setStorage({
    jira_projects_cache: { ts: Date.now(), projects: simplified }
  });

  return simplified;
}

function countBy(issues, predicate) {
  return issues.reduce((acc, issue) => (predicate(issue) ? acc + 1 : acc), 0);
}

function statusCategory(issue) {
  return issue.fields.status.statusCategory?.key || '';
}

async function search(projectKey, jql, fields = ['created', 'status']) {
  const data = await jiraRequest('/rest/api/3/search', {
    method: 'POST',
    body: {
      jql,
      maxResults: 200,
      fields
    }
  });
  return data.issues || [];
}

async function getMetrics(projectKey, periodDays = 14) {
  const now = new Date();
  const from = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const fromIso = from.toISOString();

  const [allIssues, bugs, sprintIssues] = await Promise.all([
    search(projectKey, `project = ${projectKey} ORDER BY created DESC`, ['created', 'status', 'updated']),
    search(projectKey, `project = ${projectKey} AND issuetype = Bug ORDER BY created DESC`, [
      'created',
      'status',
      'resolutiondate',
      'updated'
    ]),
    search(
      projectKey,
      `project = ${projectKey} AND sprint is not EMPTY ORDER BY updated DESC`,
      ['status', 'updated', 'created']
    )
  ]);

  const doneCount = countBy(allIssues, (i) => statusCategory(i) === 'done');
  const inProgressCount = countBy(allIssues, (i) => statusCategory(i) === 'indeterminate');
  const backlogCount = countBy(allIssues, (i) => statusCategory(i) === 'new');

  const openBugs = countBy(bugs, (i) => statusCategory(i) !== 'done');
  const closedBugs = countBy(bugs, (i) => statusCategory(i) === 'done');
  const bugTrendIssues = bugs.filter((i) => new Date(i.fields.created) >= from);

  const blockedCount = countBy(allIssues, (i) => /blocked/i.test(i.fields.status?.name || ''));
  const reopenedCount = countBy(allIssues, (i) => /reopen/i.test(i.fields.status?.name || ''));
  const agingIssuesCount = countBy(
    allIssues,
    (i) => statusCategory(i) !== 'done' && Date.now() - new Date(i.fields.created).getTime() > 10 * 24 * 60 * 60 * 1000
  );

  const recentSprintDone = countBy(
    sprintIssues,
    (i) => statusCategory(i) === 'done' && new Date(i.fields.updated) >= from
  );
  const previousSprintDone = countBy(
    sprintIssues,
    (i) => statusCategory(i) === 'done' && new Date(i.fields.updated) < from && new Date(i.fields.updated) >= new Date(from.getTime() - periodDays * 24 * 60 * 60 * 1000)
  );

  return {
    projectKey,
    totalIssues: allIssues.length,
    doneCount,
    inProgressCount,
    backlogCount,
    bugCount: bugs.length,
    openBugs,
    closedBugs,
    bugTrendIssues,
    blockedCount,
    reopenedCount,
    agingIssuesCount,
    recentSprintDone,
    previousSprintDone,
    generatedAt: new Date().toISOString(),
    periodDays,
    fromIso
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message.action) {
      case 'auth.login':
        sendResponse({ ok: true, data: await loginWithOAuth() });
        break;
      case 'auth.logout':
        await clearStorage([CONFIG_KEYS.token, CONFIG_KEYS.cloudId, 'jira_projects_cache']);
        sendResponse({ ok: true, data: { loggedIn: false } });
        break;
      case 'auth.session': {
        const token = await getValidToken();
        sendResponse({ ok: true, data: { loggedIn: Boolean(token?.access_token) } });
        break;
      }
      case 'jira.projects':
        sendResponse({ ok: true, data: await getProjects() });
        break;
      case 'jira.metrics':
        sendResponse({ ok: true, data: await getMetrics(message.projectKey, message.periodDays ?? 14) });
        break;
      default:
        sendResponse({ ok: false, error: 'Unsupported message action.' });
    }
  })().catch((error) => {
    sendResponse({ ok: false, error: error.message || 'Unexpected error' });
  });
  return true;
});
