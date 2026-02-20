import { useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ToastViewport } from './components/common/ToastViewport';
import { DEFAULT_FILTERS, INITIAL_CATEGORIES, INITIAL_PAYMENT_METHODS } from './constants/options';
import { useMovements } from './hooks/useMovements';
import { useTheme } from './hooks/useTheme';
import { BackupPage } from './pages/BackupPage';
import { DashboardPage } from './pages/DashboardPage';
import { MovementsPage } from './pages/MovementsPage';
import type { MovementFilters } from './types/movement';
import { toMonthKey } from './utils/date';
import { applyMovementFilters } from './utils/filters';

const buildUniqueSorted = (items: string[]): string[] => {
  return [...new Set(items)].sort((a, b) => a.localeCompare(b, 'es'));
};

const buildMonths = (items: string[]): string[] => {
  return [...new Set(items)].sort((a, b) => b.localeCompare(a));
};

function App() {
  const [filters, setFilters] = useState<MovementFilters>(DEFAULT_FILTERS);
  const { theme, toggleTheme } = useTheme();
  const {
    movements,
    loading,
    createMovement,
    updateMovement,
    deleteMovement,
    importMovements: importManyMovements,
  } = useMovements();

  const categories = useMemo(() => {
    return buildUniqueSorted([...INITIAL_CATEGORIES, ...movements.map((entry) => entry.category)]);
  }, [movements]);

  const paymentMethods = useMemo(() => {
    return buildUniqueSorted([...INITIAL_PAYMENT_METHODS, ...movements.map((entry) => entry.paymentMethod)]);
  }, [movements]);

  const months = useMemo(() => {
    return buildMonths(movements.map((entry) => toMonthKey(entry.date)));
  }, [movements]);

  const filteredMovements = useMemo(() => applyMovementFilters(movements, filters), [filters, movements]);

  return (
    <>
      <AppLayout
        filters={filters}
        categories={categories}
        months={months}
        theme={theme}
        onFilterChange={setFilters}
        onToggleTheme={toggleTheme}
      >
        <Routes>
          <Route path="/" element={<DashboardPage movements={filteredMovements} loading={loading} />} />
          <Route
            path="/movimientos"
            element={
              <MovementsPage
                movements={filteredMovements}
                categories={categories}
                paymentMethods={paymentMethods}
                onCreateMovement={createMovement}
                onUpdateMovement={updateMovement}
                onDeleteMovement={deleteMovement}
              />
            }
          />
          <Route
            path="/backup"
            element={<BackupPage movements={movements} onImportMovements={importManyMovements} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
      <ToastViewport />
    </>
  );
}

export default App;
