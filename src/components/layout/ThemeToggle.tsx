import type { ThemeMode } from '../../hooks/useTheme';

interface ThemeToggleProps {
  theme: ThemeMode;
  onToggle: () => void;
}

export const ThemeToggle = ({ theme, onToggle }: ThemeToggleProps) => {
  const nextTheme = theme === 'light' ? 'oscuro' : 'claro';

  return (
    <button type="button" className="theme-toggle" onClick={onToggle} aria-label={`Activar modo ${nextTheme}`}>
      {theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
    </button>
  );
};
