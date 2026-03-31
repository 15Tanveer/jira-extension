const statusColor = {
  good: 'text-neon-green',
  warning: 'text-neon-amber',
  critical: 'text-neon-red'
};

export default function AIInsights({ health, metrics }) {
  const insight = buildInsight(health, metrics);

  return (
    <div className="glass-card animate-pulseGlow p-4">
      <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">AI Insights</div>
      <p className={`text-sm leading-6 ${statusColor[health.status] || 'text-slate-200'}`}>{insight}</p>
    </div>
  );
}

function buildInsight(health, metrics) {
  const { status } = health;
  const aging = metrics.agingIssuesCount;
  const blockers = metrics.blockedCount;

  if (status === 'good') {
    return `This project is in a good phase. Completion is strong, aging issues are low (${aging}), and blockers are minimal (${blockers}). Ready for release planning.`;
  }
  if (status === 'warning') {
    return `Project health is moderate. Resolve ${blockers} blockers and reduce ${aging} aging issues to improve delivery confidence before release.`;
  }
  return `Critical risk detected. High bug/aging pressure with ${blockers} blockers. Stabilize sprint execution and clear long-open items before go-live.`;
}
