import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function BugTrendChart({ labels, points }) {
  const data = {
    labels,
    datasets: [
      {
        label: 'Bugs created',
        data: points,
        borderColor: '#22d3ee',
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return 'rgba(34,211,238,0.2)';
          const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(34,211,238,0.5)');
          gradient.addColorStop(1, 'rgba(34,211,238,0.02)');
          return gradient;
        },
        tension: 0.35,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 5
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#020617',
        borderColor: 'rgba(34,211,238,0.3)',
        borderWidth: 1
      }
    },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.08)' } },
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.08)' } }
    }
  };

  return (
    <div className="glass-card p-4">
      <div className="mb-3 text-sm font-medium text-neon-cyan">Bug trend (last 14 days)</div>
      <Line data={data} options={options} height={140} />
    </div>
  );
}
