import { buildTotals } from '../utils/analytics';
import { formatMonthLabel } from '../utils/date';
import type { MovementFilters, MovementRecord } from '../types/movement';

const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const toExcelDate = (isoDate: string): Date => {
  const [year, month, day] = isoDate.split('-').map((value) => Number(value));
  return new Date(year, month - 1, day);
};

const resolveMonthFilterLabel = (monthKey: string): string => {
  if (monthKey === 'all') {
    return 'Todos';
  }

  try {
    return formatMonthLabel(monthKey);
  } catch {
    return monthKey;
  }
};

const resolveTypeFilterLabel = (typeFilter: MovementFilters['type']): string => {
  if (typeFilter === 'all') {
    return 'Todos';
  }

  return typeFilter === 'ingreso' ? 'Ingresos' : 'Gastos';
};

export const exportAsExcel = async (
  movements: MovementRecord[],
  filters: MovementFilters,
): Promise<Blob> => {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  workbook.creator = 'Gastos MVP';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = 'Reporte de movimientos';

  const movementSheet = workbook.addWorksheet('Movimientos', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  movementSheet.columns = [
    { header: 'Fecha', key: 'date', width: 13 },
    { header: 'Tipo', key: 'type', width: 12 },
    { header: 'Categoria', key: 'category', width: 22 },
    { header: 'Metodo de pago', key: 'paymentMethod', width: 22 },
    { header: 'Monto', key: 'amount', width: 15 },
    { header: 'Nota', key: 'note', width: 42 },
  ];

  const headerRow = movementSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FF1A2230' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEAF0F8' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
  headerRow.height = 24;

  movementSheet.autoFilter = {
    from: 'A1',
    to: 'F1',
  };

  for (const movement of movements) {
    const row = movementSheet.addRow({
      date: toExcelDate(movement.date),
      type: movement.type === 'ingreso' ? 'Ingreso' : 'Gasto',
      category: movement.category,
      paymentMethod: movement.paymentMethod,
      amount: movement.type === 'ingreso' ? movement.amountCents / 100 : -(movement.amountCents / 100),
      note: movement.note ?? '',
    });

    row.getCell('A').numFmt = 'dd/mm/yyyy';
    row.getCell('E').numFmt = '"ARS" #,##0.00;[Red]-"ARS" #,##0.00';
    row.getCell('F').alignment = { wrapText: true, vertical: 'top' };
  }

  movementSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    row.alignment = { vertical: 'middle' };
    row.border = {
      bottom: {
        style: 'thin',
        color: { argb: 'FFDFE6F0' },
      },
    };
  });

  const summarySheet = workbook.addWorksheet('Resumen');
  summarySheet.columns = [{ width: 30 }, { width: 30 }];

  summarySheet.mergeCells('A1:B1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'Resumen financiero';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1A2230' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEAF0F8' },
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

  const totals = buildTotals(movements);
  const summaryRows = [
    ['Movimientos exportados', movements.length],
    ['Total ingresos', totals.incomeCents / 100],
    ['Total gastos', totals.expenseCents / 100],
    ['Balance', totals.balanceCents / 100],
  ];

  summarySheet.addRow([]);
  for (const [label, value] of summaryRows) {
    const row = summarySheet.addRow([label, value]);
    row.getCell(1).font = { bold: true, color: { argb: 'FF2A374C' } };
    if (typeof value === 'number') {
      row.getCell(2).numFmt =
        label === 'Movimientos exportados'
          ? '#,##0'
          : '"ARS" #,##0.00;[Red]-"ARS" #,##0.00';
    }
  }

  summarySheet.addRow([]);
  const filterHeader = summarySheet.addRow(['Filtros aplicados']);
  filterHeader.getCell(1).font = { bold: true, color: { argb: 'FF2A374C' } };

  const filterRows: [string, string][] = [
    ['Mes', resolveMonthFilterLabel(filters.month)],
    ['Categoria', filters.category === 'all' ? 'Todas' : filters.category],
    ['Tipo', resolveTypeFilterLabel(filters.type)],
  ];

  for (const [label, value] of filterRows) {
    const row = summarySheet.addRow([label, value]);
    row.getCell(1).font = { bold: true, color: { argb: 'FF2A374C' } };
  }

  const workbookBuffer = await workbook.xlsx.writeBuffer();
  return new Blob([workbookBuffer], { type: XLSX_MIME_TYPE });
};
