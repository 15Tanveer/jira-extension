import { useCallback, useEffect, useMemo, useState } from 'react';
import jiraLogo from './assets/jira-ai-logo.svg';
import Dashboard from './components/Dashboard';
import ProjectDropdown from './components/ProjectDropdown';
import { computeHealthScore, jiraService, normalizeTrend } from './services/jira';

export default function App() {
  const [auth, setAuth] = useState({ loading: true, loggedIn: false });
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');

  const health = useMemo(() => computeHealthScore(metrics || {}), [metrics]);
  const trend = useMemo(() => normalizeTrend(metrics?.bugTrendIssues || [], 14), [metrics]);

  const initialize = useCallback(async () => {
    setError('');
    try {
      const session = await jiraService.getSession();
      setAuth({ loading: false, loggedIn: session.loggedIn });
      if (session.loggedIn) {
        const p = await jiraService.getProjects();
        setProjects(p);
        if (p.length) setSelectedProject((prev) => prev || p[0].key);
      }
    } catch (e) {
      setAuth({ loading: false, loggedIn: false });
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!auth.loggedIn || !selectedProject) return;
    setLoadingData(true);
    setError('');
    jiraService
      .getProjectMetrics(selectedProject, 14)
      .then(setMetrics)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingData(false));
  }, [auth.loggedIn, selectedProject]);

  async function handleLogin() {
    setError('');
    try {
      await jiraService.login();
      await initialize();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleLogout() {
    await jiraService.logout();
    setAuth({ loading: false, loggedIn: false });
    setProjects([]);
    setSelectedProject('');
    setMetrics(null);
  }

  return (
    <main className="min-h-[640px] bg-gradient-to-b from-slate-900 via-slate-950 to-black p-3 text-slate-100">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <img src={jiraLogo} alt="Jira AI logo" className="h-7 w-7 drop-shadow-[0_0_10px_rgba(34,211,238,0.45)]" />
            <h1 className="text-lg font-semibold text-neon-cyan">Jira AI Dashboard</h1>
          </div>
          <p className="text-xs text-slate-400">Agile release readiness assistant</p>
        </div>
        {auth.loggedIn ? (
          <button
            onClick={handleLogout}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-xs hover:bg-white/10"
          >
            Logout
          </button>
        ) : null}
      </header>

      {auth.loading ? (
        <div className="glass-card p-4 text-sm">Checking Jira session…</div>
      ) : !auth.loggedIn ? (
        <div className="glass-card space-y-3 p-4 text-sm">
          <p className="text-slate-300">
            Connect Jira with Atlassian OAuth 2.0 (3LO). Your tokens remain in extension storage only.
          </p>
          <button
            onClick={handleLogin}
            className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 font-medium text-slate-950 hover:opacity-90"
          >
            Login with Atlassian
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <ProjectDropdown
                projects={projects}
                selectedKey={selectedProject}
                onChange={setSelectedProject}
                loading={loadingData}
              />
            </div>
            <button
              className="glass-card px-3 py-2 text-xs hover:-translate-y-0.5"
              onClick={() => selectedProject && jiraService.getProjectMetrics(selectedProject, 14).then(setMetrics)}
              title="Refresh metrics"
            >
              Refresh
            </button>
          </div>

          <Dashboard metrics={metrics} trend={trend} health={health} loading={loadingData} />
        </div>
      )}

      {error ? <div className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 p-2 text-xs text-red-200">{error}</div> : null}
    </main>
  );
}
