import { useState } from 'react';
import { useToast } from '../hooks/useToast';
import {
  downloadTextFile,
  exportAsCsv,
  exportAsJson,
  parseJsonBackup,
} from '../services/exportImportService';
import type { MovementDraft, MovementRecord } from '../types/movement';
import { fileSafeDate } from '../utils/date';

interface BackupPageProps {
  movements: MovementRecord[];
  onImportMovements: (drafts: MovementDraft[], strategy: 'merge' | 'replace') => Promise<number>;
}

export const BackupPage = ({ movements, onImportMovements }: BackupPageProps) => {
  const { pushToast } = useToast();
  const [strategy, setStrategy] = useState<'merge' | 'replace'>('merge');
  const [isImporting, setIsImporting] = useState(false);

  const handleExportJson = () => {
    const filename = `gastos-backup-${fileSafeDate()}.json`;
    downloadTextFile(exportAsJson(movements), filename, 'application/json');
    pushToast({
      tone: 'success',
      title: 'Backup JSON exportado',
      description: `Se descargó ${filename}.`,
    });
  };

  const handleExportCsv = () => {
    const filename = `gastos-report-${fileSafeDate()}.csv`;
    downloadTextFile(exportAsCsv(movements), filename, 'text/csv;charset=utf-8');
    pushToast({
      tone: 'success',
      title: 'CSV exportado',
      description: `Se descargó ${filename}.`,
    });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
        description: error instanceof Error ? error.message : 'Revisá el archivo y probá de nuevo.',
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
        Exportá tus datos para hacer backups o descargá CSV para análisis. También podés importar un JSON para restaurar
        datos en este dispositivo.
      </p>

      <div className="backup-actions">
        <button type="button" className="button button-primary" onClick={handleExportJson}>
          Exportar JSON
        </button>
        <button type="button" className="button button-secondary" onClick={handleExportCsv}>
          Exportar CSV
        </button>
      </div>

      <div className="backup-import">
        <label className="form-field">
          <span>Estrategia de importación</span>
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
