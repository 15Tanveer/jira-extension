const DAY_MS = 24 * 60 * 60 * 1000;

export async function sendBackgroundMessage(action, payload = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, ...payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || 'Unknown extension error'));
        return;
      }
      resolve(response.data);
    });
  });
}

export const jiraService = {
  login: () => sendBackgroundMessage('auth.login'),
  logout: () => sendBackgroundMessage('auth.logout'),
  getSession: () => sendBackgroundMessage('auth.session'),
  getProjects: () => sendBackgroundMessage('jira.projects'),
  getProjectMetrics: (projectKey, periodDays = 14) =>
    sendBackgroundMessage('jira.metrics', { projectKey, periodDays })
};

export function computeHealthScore(metrics) {
  const {
    totalIssues = 0,
    bugCount = 0,
    doneCount = 0,
    blockedCount = 0,
    reopenedCount = 0,
    recentSprintDone = 0,
    previousSprintDone = 0,
    agingIssuesCount = 0
  } = metrics;

  if (!totalIssues) {
    return { score: 0, status: 'critical', reason: 'No issues found in this project.' };
  }

  const bugRatio = bugCount / totalIssues;
  const completionRate = doneCount / totalIssues;
  const stabilityRatio = (blockedCount + reopenedCount) / totalIssues;
  const agingRatio = agingIssuesCount / totalIssues;
  const velocityDelta = previousSprintDone
    ? (recentSprintDone - previousSprintDone) / previousSprintDone
    : recentSprintDone > 0
      ? 0.25
      : 0;

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 *
          (0.35 * (1 - bugRatio) +
            0.3 * completionRate +
            0.15 * (1 - stabilityRatio) +
            0.1 * (1 - agingRatio) +
            0.1 * Math.max(0, Math.min(1, 0.5 + velocityDelta / 2)))
      )
    )
  );

  if (score >= 75) {
    return {
      score,
      status: 'good',
      reason: 'Ready for release. Healthy completion and manageable risk profile.'
    };
  }
  if (score >= 50) {
    return {
      score,
      status: 'warning',
      reason: 'Needs attention. Address blockers, aging issues, or bug load before release.'
    };
  }
  return {
    score,
    status: 'critical',
    reason: 'Not ready. High operational risk and insufficient delivery stability.'
  };
}

export function normalizeTrend(issues, days = 14) {
  const labels = [];
  const points = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today.getTime() - i * DAY_MS);
    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    labels.push(label);
    points.push(0);
  }

  issues.forEach((issue) => {
    const created = new Date(issue.fields.created);
    const diff = Math.floor((today - created) / DAY_MS);
    const index = days - 1 - diff;
    if (index >= 0 && index < days) {
      points[index] += 1;
    }
  });

  return { labels, points };
}
