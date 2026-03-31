import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function IssueStatusChart({ done, inProgress, backlog }) {
  const data = {
    labels: ['Done', 'In progress', 'Backlog'],
    datasets: [
      {
        data: [done, inProgress, backlog],
        backgroundColor: ['#34d399', '#22d3ee', '#fbbf24'],
        borderColor: 'rgba(15,23,42,0.8)',
        borderWidth: 3,
        hoverOffset: 6
      }
    ]
  };

  const options = {
    plugins: {
      legend: {
        labels: { color: '#cbd5e1' }
      }
    },
    cutout: '65%'
  };

  return (
    <div className="glass-card p-4">
      <div className="mb-3 text-sm font-medium text-violet-300">Issue status distribution</div>
      <Doughnut data={data} options={options} />
    </div>
  );
}
