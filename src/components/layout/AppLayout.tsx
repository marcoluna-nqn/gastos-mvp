import { NavLink, useLocation } from 'react-router-dom';
import { FilterBar } from '../filters/FilterBar';
import { ThemeToggle } from './ThemeToggle';
import type { ThemeMode } from '../../hooks/useTheme';
import type { MovementFilters } from '../../types/movement';
import type { PropsWithChildren } from 'react';

interface AppLayoutProps extends PropsWithChildren {
  filters: MovementFilters;
  categories: string[];
  months: string[];
  theme: ThemeMode;
  onFilterChange: (next: MovementFilters) => void;
  onToggleTheme: () => void;
}

const NAV_LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/movimientos', label: 'Movimientos' },
  { to: '/backup', label: 'Exportar' },
];

export const AppLayout = ({
  children,
  filters,
  categories,
  months,
  theme,
  onFilterChange,
  onToggleTheme,
}: AppLayoutProps) => {
  const location = useLocation();
  const showFilters = location.pathname !== '/backup';
  const compactFilters = location.pathname === '/movimientos';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Gastos personales | v1.0.0</p>
          <h1>Tu mes en ARS</h1>
        </div>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </header>

      <nav className="main-nav" aria-label="Principal">
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
            end={link.to === '/'}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      {showFilters ? (
        <FilterBar
          filters={filters}
          categories={categories}
          months={months}
          compact={compactFilters}
          onChange={onFilterChange}
        />
      ) : null}

      <main className="page-content">{children}</main>
    </div>
  );
};
