import { useMemo, useState, type ChangeEvent } from 'react';
import { useToast } from '../hooks/useToast';
import { exportAsExcel } from '../services/excelExportService';
import {
  downloadBlobFile,
  downloadTextFile,
  exportAsCsv,
  exportAsJson,
  parseJsonBackup,
} from '../services/exportImportService';
import type { MovementDraft, MovementFilters, MovementRecord } from '../types/movement';
import { fileSafeDate, formatMonthLabel } from '../utils/date';

interface BackupPageProps {
  movements: MovementRecord[];
  filteredMovements: MovementRecord[];
  filters: MovementFilters;
  onImportMovements: (drafts: MovementDraft[], strategy: 'merge' | 'replace') => Promise<number>;
}

const resolveMonthLabel = (monthFilter: string): string => {
  if (monthFilter === 'all') {
    return 'Todos';
  }

  try {
    return formatMonthLabel(monthFilter);
  } catch {
    return monthFilter;
  }
};

const resolveTypeLabel = (typeFilter: MovementFilters['type']): string => {
  if (typeFilter === 'all') {
    return 'Todos';
  }

  return typeFilter === 'ingreso' ? 'Ingresos' : 'Gastos';
};

export const BackupPage = ({ movements, filteredMovements, filters, onImportMovements }: BackupPageProps) => {
  const { pushToast } = useToast();
  const [strategy, setStrategy] = useState<'merge' | 'replace'>('merge');
  const [isImporting, setIsImporting] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const filterDescription = useMemo(() => {
    return `Mes: ${resolveMonthLabel(filters.month)} · Categoria: ${
      filters.category === 'all' ? 'Todas' : filters.category
    } · Tipo: ${resolveTypeLabel(filters.type)}`;
  }, [filters]);

  const handleExportJson = () => {
    const filename = `gastos-backup-${fileSafeDate()}.json`;
    downloadTextFile(exportAsJson(movements), filename, 'application/json');
    pushToast({
      tone: 'success',
      title: 'Backup JSON exportado',
      description: `Se descargo ${filename}.`,
    });
  };

  const handleExportCsv = () => {
    const filename = `gastos_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadTextFile(exportAsCsv(filteredMovements), filename, 'text/csv;charset=utf-8');
    pushToast({
      tone: 'success',
      title: 'CSV exportado',
      description: `Se exportaron ${filteredMovements.length} movimientos filtrados.`,
    });
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const blob = await exportAsExcel(filteredMovements, filters);
      const filename = `gastos_${new Date().toISOString().slice(0, 10)}.xlsx`;
      downloadBlobFile(blob, filename);
      pushToast({
        tone: 'success',
        title: 'Excel exportado',
        description: `Se genero ${filename} con ${filteredMovements.length} movimientos.`,
      });
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'No se pudo exportar Excel',
        description: error instanceof Error ? error.message : 'Revisa los datos e intenta nuevamente.',
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsImporting(true);
    try {
      const raw = await file.text();
      const parsed = parseJsonBackup(raw);
      const importedCount = await onImportMovements(parsed, strategy);
      pushToast({
        tone: 'success',
        title: 'Backup importado',
        description: `Se importaron ${importedCount} movimientos.`,
      });
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'No se pudo importar',
        description: error instanceof Error ? error.message : 'Revisa el archivo y prueba de nuevo.',
      });
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  return (
    <section className="card backup-card">
      <header className="section-header">
        <h2>Importar y exportar</h2>
      </header>

      <p className="backup-text">
        Exporta tus datos para backups o reportes. JSON exporta toda la base local. CSV y Excel exportan los movimientos
        segun los filtros activos.
      </p>
      <p className="backup-meta">{filterDescription}</p>
      <p className="backup-meta">Movimientos filtrados listos para exportar: {filteredMovements.length}</p>

      <div className="backup-actions">
        <button type="button" className="button button-primary" onClick={handleExportJson}>
          Exportar JSON (backup completo)
        </button>
        <button type="button" className="button button-secondary" onClick={handleExportCsv}>
          Exportar CSV
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={handleExportExcel}
          disabled={isExportingExcel}
        >
          {isExportingExcel ? 'Exportando...' : 'Exportar Excel (.xlsx)'}
        </button>
      </div>

      <div className="backup-import">
        <label className="form-field">
          <span>Estrategia de importacion</span>
          <select className="field" value={strategy} onChange={(event) => setStrategy(event.target.value as 'merge' | 'replace')}>
            <option value="merge">Combinar con movimientos actuales</option>
            <option value="replace">Reemplazar todo</option>
          </select>
        </label>

        <label className="button button-primary upload-button">
          {isImporting ? 'Importando...' : 'Importar JSON'}
          <input type="file" accept="application/json" onChange={handleImport} disabled={isImporting} />
        </label>
      </div>
    </section>
  );
};
