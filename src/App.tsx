import { useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ToastViewport } from './components/common/ToastViewport';
import { DEFAULT_FILTERS, INITIAL_PAYMENT_METHODS } from './constants/options';
import { useBudgets } from './hooks/useBudgets';
import { useCategories } from './hooks/useCategories';
import { useMovements } from './hooks/useMovements';
import { useSavingsGoals } from './hooks/useSavingsGoals';
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
    categories: categoryRecords,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();
  const { budgets, saveBudget, deleteBudget, copyBudgetsToMonth } = useBudgets();
  const {
    savingsGoals,
    saveSavingsGoal,
    deleteSavingsGoalByMonth,
  } = useSavingsGoals();
  const {
    movements,
    loading,
    createMovement,
    updateMovement,
    deleteMovement,
    importMovements: importManyMovements,
  } = useMovements();

  const categories = useMemo(() => {
    const fromCategories = categoryRecords.map((entry) => entry.name);
    const fromMovements = movements.map((entry) => entry.category);
    return buildUniqueSorted([...fromCategories, ...fromMovements]);
  }, [categoryRecords, movements]);

  const paymentMethods = useMemo(() => {
    return buildUniqueSorted([...INITIAL_PAYMENT_METHODS, ...movements.map((entry) => entry.paymentMethod)]);
  }, [movements]);

  const months = useMemo(() => {
    return buildMonths(movements.map((entry) => toMonthKey(entry.date)));
  }, [movements]);

  const normalizedFilters = useMemo(() => {
    if (filters.category === 'all' || categories.includes(filters.category)) {
      return filters;
    }

    return {
      ...filters,
      category: 'all',
    };
  }, [categories, filters]);

  const filteredMovements = useMemo(
    () => applyMovementFilters(movements, normalizedFilters),
    [movements, normalizedFilters],
  );

  return (
    <>
      <AppLayout
        filters={normalizedFilters}
        categories={categories}
        months={months}
        theme={theme}
        onFilterChange={setFilters}
        onToggleTheme={toggleTheme}
      >
        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                movements={filteredMovements}
                allMovements={movements}
                categories={categoryRecords}
                budgets={budgets}
                savingsGoals={savingsGoals}
                filterMonthKey={normalizedFilters.month}
                loading={loading}
                onSaveSavingsGoal={saveSavingsGoal}
                onDeleteSavingsGoalByMonth={deleteSavingsGoalByMonth}
              />
            }
          />
          <Route
            path="/movimientos"
            element={
              <MovementsPage
                movements={filteredMovements}
                categories={categories}
                categoryRecords={categoryRecords}
                budgets={budgets}
                paymentMethods={paymentMethods}
                filterMonthKey={normalizedFilters.month}
                onCreateMovement={createMovement}
                onUpdateMovement={updateMovement}
                onDeleteMovement={deleteMovement}
                onCreateCategory={createCategory}
                onUpdateCategory={updateCategory}
                onDeleteCategory={deleteCategory}
                onSaveBudget={saveBudget}
                onDeleteBudget={deleteBudget}
                onCopyBudgetsToMonth={copyBudgetsToMonth}
              />
            }
          />
          <Route
            path="/backup"
            element={
              <BackupPage
                movements={movements}
                filteredMovements={filteredMovements}
                filters={normalizedFilters}
                onImportMovements={importManyMovements}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
      <ToastViewport />
    </>
  );
}

export default App;
