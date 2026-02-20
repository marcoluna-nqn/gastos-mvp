import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { MonthlyTrendItem } from '../../types/movement';
import { formatMonthLabel } from '../../utils/date';
import { formatArs } from '../../utils/currency';
import { EmptyState } from '../common/EmptyState';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface MonthlyTrendChartProps {
  trend: MonthlyTrendItem[];
}

export const MonthlyTrendChart = ({ trend }: MonthlyTrendChartProps) => {
  if (trend.length === 0) {
    return (
      <article className="card chart-card">
        <header className="section-header">
          <h2>Evolución mensual</h2>
        </header>
        <EmptyState title="Sin datos mensuales" description="Registrá movimientos para generar la evolución." />
      </article>
    );
  }

  const labels = trend.map((entry) => formatMonthLabel(entry.month));
  const data = {
    labels,
    datasets: [
      {
        label: 'Ingresos',
        data: trend.map((entry) => entry.incomeCents / 100),
        borderColor: '#1f8a70',
        backgroundColor: 'rgba(31, 138, 112, 0.15)',
        tension: 0.35,
      },
      {
        label: 'Gastos',
        data: trend.map((entry) => entry.expenseCents / 100),
        borderColor: '#bf3f3f',
        backgroundColor: 'rgba(191, 63, 63, 0.15)',
        tension: 0.35,
      },
      {
        label: 'Balance',
        data: trend.map((entry) => entry.balanceCents / 100),
        borderColor: '#35495e',
        backgroundColor: 'rgba(53, 73, 94, 0.12)',
        tension: 0.35,
      },
    ],
  };

  return (
    <article className="card chart-card">
      <header className="section-header">
        <h2>Evolución mensual</h2>
      </header>
      <div className="chart-wrapper">
        <Line
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
              mode: 'index',
              intersect: false,
            },
            plugins: {
              tooltip: {
                callbacks: {
                  label: (context) => `${context.dataset.label}: ${formatArs(Math.round((context.parsed.y ?? 0) * 100))}`,
                },
              },
            },
            scales: {
              y: {
                ticks: {
                  callback: (value) => formatArs(Math.round(Number(value) * 100)),
                },
              },
            },
          }}
        />
      </div>
    </article>
  );
};
