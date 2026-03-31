# Jira AI Dashboard Chrome Extension (Manifest V3)

A futuristic, AI-style Jira dashboard extension for Chrome with Atlassian OAuth 2.0 (3LO + PKCE), bug trends, issue status analytics, and agile-based release health scoring.

## Features

- Atlassian OAuth 2.0 (3LO) with PKCE (no API tokens in UI code).
- Searchable project dropdown from Jira `GET /rest/api/3/project`.
- Bug metrics: total/open/closed + 14-day trend chart.
- Project issue status chart: done / in-progress / backlog.
- Agile health score (0–100) using:
  - bug ratio,
  - completion rate,
  - blocked/reopened stability,
  - sprint velocity trend,
  - aging issues.
- AI insights block with color-coded health summary.
- Tailwind dark glassmorphism + neon style.
- Extension popup-optimized responsive layout.
- Refresh button and short-lived project caching in `chrome.storage.local`.

---

## File Structure

```text
jira-extension/
├── manifest.json
├── popup.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── assets/
    │   └── jira-ai-logo.svg
    ├── background.js
    ├── index.css
    ├── services/
    │   └── jira.js
    └── components/
        ├── ProjectDropdown.jsx
        ├── Dashboard.jsx
        ├── BugTrendChart.jsx
        ├── IssueStatusChart.jsx
        ├── HealthGauge.jsx
        └── AIInsights.jsx
```

---

## Atlassian OAuth 3LO Setup (Required)

1. Go to Atlassian developer console and create an **OAuth 2.0 (3LO)** app.
2. Add scopes:
   - `read:jira-work`
   - `read:project:jira`
   - `offline_access`
3. Add callback URL:
   - `https://<EXTENSION_ID>.chromiumapp.org/atlassian`
4. Save your **Client ID**.
5. Load extension once, then set `jira_client_id` in extension local storage:

```js
// In extension service worker console (chrome://extensions > Inspect views)
chrome.storage.local.set({ jira_client_id: 'YOUR_ATLASSIAN_CLIENT_ID' })
```

> Why this is secure: the extension uses OAuth code flow with PKCE. No client secret or API token is shipped in popup UI code.

---

## Local Development

```bash
npm install
npm run build
```

Then in Chrome:
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → choose `dist/`
4. Click extension icon and sign in.

---

## How Data Is Queried

The background service worker calls Jira API through:

- Projects:
  - `GET /ex/jira/{cloudId}/rest/api/3/project`
- Issues:
  - `POST /ex/jira/{cloudId}/rest/api/3/search` (JQL-based)

JQL examples used:

- All issues by project:
  - `project = KEY ORDER BY created DESC`
- Bug issues:
  - `project = KEY AND issuetype = Bug ORDER BY created DESC`
- Sprint-linked sample for velocity:
  - `project = KEY AND sprint is not EMPTY ORDER BY updated DESC`

---

## Health Score Logic

Health score range: `0 - 100`

Weighted factors:

- 35% inverse bug ratio
- 30% completion rate (`done / total`)
- 15% sprint stability (blocked + reopened)
- 10% aging issue pressure (> 10 days open)
- 10% velocity trend (recent sprint done vs previous)

Status mapping:

- `>= 75` → 🟢 Good (Ready for release)
- `50 - 74` → 🟡 Warning (Needs attention)
- `< 50` → 🔴 Critical (Not ready)

---

## Security Notes

- Access/refresh tokens are stored only in `chrome.storage.local`.
- API requests are HTTPS only.
- Secrets are not embedded in React UI.
- OAuth exchange and refresh live in `background.js`.

---

## Optional Enhancements

- Add date range selector (7/14/30 days).
- Add light mode toggle.
- Add export to PNG/PDF.
- Add richer trend forecasting via AI backend.

