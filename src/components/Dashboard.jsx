import BugTrendChart from './BugTrendChart';
import IssueStatusChart from './IssueStatusChart';
import HealthGauge from './HealthGauge';
import AIInsights from './AIInsights';

function MetricCard({ title, value, tone = 'text-slate-100' }) {
  return (
    <div className="glass-card p-3">
      <div className="text-xs uppercase tracking-wide text-slate-400">{title}</div>
      <div className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

export default function Dashboard({ metrics, trend, health, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card h-20 animate-pulse bg-white/10" />
        ))}
      </div>
    );
  }

  if (!metrics) {
    return <div className="glass-card p-4 text-sm text-slate-300">Select a project to load dashboard data.</div>;
  }

  const releaseLabel =
    health.status === 'good'
      ? '🟢 Good → Ready for release'
      : health.status === 'warning'
        ? '🟡 Warning → Needs attention'
        : '🔴 Critical → Not ready';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard title="Total bugs" value={metrics.bugCount} tone="text-neon-cyan" />
        <MetricCard title="Open bugs" value={metrics.openBugs} tone="text-neon-red" />
        <MetricCard title="Closed bugs" value={metrics.closedBugs} tone="text-neon-green" />
        <MetricCard title="Total issues" value={metrics.totalIssues} tone="text-violet-300" />
      </div>

      <BugTrendChart labels={trend.labels} points={trend.points} />

      <div className="grid grid-cols-2 gap-3">
        <IssueStatusChart
          done={metrics.doneCount}
          inProgress={metrics.inProgressCount}
          backlog={metrics.backlogCount}
        />
        <HealthGauge score={health.score} status={health.status} />
      </div>

      <div className="glass-card p-4 text-sm text-slate-200">
        <div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Agile health</div>
        <div className="font-medium">{releaseLabel}</div>
        <div className="mt-1 text-xs text-slate-400">{health.reason}</div>
      </div>

      <AIInsights health={health} metrics={metrics} />
    </div>
  );
}
