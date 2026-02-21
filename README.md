# Gastos MVP

Aplicacion web local-first para gestion de gastos personales. Permite registrar ingresos y gastos, filtrar datos reales, ver graficos y hacer backup/restauracion sin backend.

## URL publicada

- GitHub Pages: `https://marcoluna-nqn.github.io/gastos-mvp/`

## Funcionalidades

- CRUD completo de movimientos (crear, editar, eliminar con confirmacion).
- Campos por movimiento: `tipo`, `monto`, `categoria`, `fecha`, `metodo de pago`, `nota`.
- Dashboard conectado a datos reales:
  - Total ingresos
  - Total gastos
  - Balance
  - Grafico doughnut de gastos por categoria
  - Grafico lineal de evolucion mensual
- Filtros globales por `mes`, `categoria` y `tipo` (afectan dashboard, listado y exportes de reporte).
- Historial con busqueda y edicion rapida.
- Modo planilla editable inline tipo Excel para carga masiva:
  - Edicion por celda (click/tap)
  - Enter, Tab, Shift+Tab y Escape para flujo rapido
  - Fila rapida `+ Nueva fila` con guardado inline
  - Pegado multiple tabular (TSV/Excel) con resumen de filas validas e invalidas
- Categorias personalizadas persistidas en Dexie:
  - Crear, editar y eliminar desde "Gestionar categorias"
  - Al eliminar una categoria, movimientos reasignados automaticamente a "Otros"
- Duplicado rapido de movimientos (vista lista y planilla)
- Presupuestos mensuales por categoria:
  - Configuracion por mes desde modal "Presupuestos"
  - Alertas visuales por estado (`OK`, `Atencion`, `Excedido`)
  - Resumen de presupuesto mensual integrado en Dashboard
- Proyeccion financiera mensual (v1.5):
  - Objetivo de ahorro mensual persistido en Dexie
  - Card "Proyeccion del mes" con semaforo (`OK`, `Atencion`, `Riesgo`, `Sin objetivo`)
  - Calculo real de cierre de mes segun ritmo actual (mes actual/pasado/futuro)
  - Metricas accionables: margen de gasto restante, gasto diario recomendado y ritmo diario actual
- Persistencia real en `IndexedDB` con Dexie.
- Import/Export:
  - Export JSON (backup completo de toda la base local)
  - Export CSV (segun filtros activos)
  - Export Excel real `.xlsx` con formato profesional (hojas `Movimientos` y `Resumen`)
  - Import JSON con estrategia `merge` o `replace`
- UX robusta:
  - Validaciones claras de formulario
  - Formato moneda ARS (`es-AR`)
  - Manejo de decimales en centavos para evitar errores de flotantes
  - Edicion numerica mejorada: foco/select automatico en monto, parseo coma/punto y chips `+1000`, `+5000`, `+10000`
  - Navegacion Enter/Next para carga rapida
  - Estados vacios
  - Feedback visual con toasts
- Responsive mobile-first con foco en iPhone Safari.
- Manifest web basico para instalar en pantalla de inicio.
- Modo claro/oscuro.

## Stack

- React 19 + TypeScript + Vite
- Dexie + IndexedDB
- Chart.js + react-chartjs-2
- ExcelJS para export `.xlsx`
- React Router (`HashRouter` para GitHub Pages)
- GitHub Actions + GitHub Pages

## Arquitectura

```txt
src/
  components/
    budgets/
    categories/
    common/
    dashboard/
    filters/
    goals/
    layout/
    movements/
    spreadsheet/
  pages/
  hooks/
  db/
  services/
  utils/
  types/
  constants/
  styles/
```

## Desarrollo local

```bash
npm install
npm run dev
```

## Build produccion

```bash
npm run build
```

## Lint

```bash
npm run lint
```

## Deploy en GitHub Pages

1. Crear repo en GitHub.
2. Subir el codigo a la rama `main`.
3. En GitHub: `Settings > Pages`, seleccionar `GitHub Actions`.
4. Hacer push a `main`.
5. Esperar el workflow `Deploy to GitHub Pages` (`.github/workflows/deploy.yml`).

La base de Vite se calcula automaticamente desde `GITHUB_REPOSITORY` durante Actions y evita problemas de rutas en project pages (`/<repo>/`).

## Decisiones tecnicas

- `amountCents` entero para calculos financieros seguros.
- Capa de DB separada (`db/` + `services/`) para mantener UI desacoplada.
- Filtros globales compartidos entre paginas.
- `HashRouter` para evitar 404 al recargar en GitHub Pages.
- `manualChunks` en Vite para separar `charts`, `storage` y carga diferida de `exceljs`.

## Notas de persistencia

- Los datos viven en el navegador/dispositivo (IndexedDB).
- Si se borra almacenamiento del navegador, se pierde la base local.
- Recomendado: exportar JSON periodicamente como backup.
