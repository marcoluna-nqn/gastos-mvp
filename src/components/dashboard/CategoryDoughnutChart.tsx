import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { CategoryBreakdownItem } from '../../types/movement';
import { formatArs } from '../../utils/currency';
import { EmptyState } from '../common/EmptyState';

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = ['#273043', '#4f5d75', '#7687a1', '#a3b1c7', '#d2d9e8', '#30323d', '#5d6d7e', '#8996ab'];

interface CategoryDoughnutChartProps {
  breakdown: CategoryBreakdownItem[];
}

export const CategoryDoughnutChart = ({ breakdown }: CategoryDoughnutChartProps) => {
  if (breakdown.length === 0) {
    return (
      <article className="card chart-card">
        <header className="section-header">
          <h2>Gastos por categoría</h2>
        </header>
        <EmptyState title="Sin gastos en este filtro" description="Agregá movimientos o ajustá filtros para ver el gráfico." />
      </article>
    );
  }

  const data = {
    labels: breakdown.map((entry) => entry.category),
    datasets: [
      {
        data: breakdown.map((entry) => entry.cents / 100),
        backgroundColor: COLORS.slice(0, breakdown.length),
        borderWidth: 0,
      },
    ],
  };

  return (
    <article className="card chart-card">
      <header className="section-header">
        <h2>Gastos por categoría</h2>
      </header>
      <div className="chart-wrapper">
        <Doughnut
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  boxWidth: 14,
                  useBorderRadius: true,
                },
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const value = context.parsed as number;
                    return `${context.label}: ${formatArs(Math.round(value * 100))}`;
                  },
                },
              },
            },
          }}
        />
      </div>
    </article>
  );
};
