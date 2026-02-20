# Gastos MVP

Aplicación web local-first para gestión de gastos personales. Permite registrar ingresos y gastos, filtrar por mes/categoría/tipo, ver gráficos reales y hacer backup/restauración sin backend.

## URL publicada

- GitHub Pages: `https://marcoluna-nqn.github.io/gastos-mvp/`

## Funcionalidades

- CRUD completo de movimientos (crear, editar, eliminar con confirmación).
- Campos por movimiento: `tipo`, `monto`, `categoría`, `fecha`, `método de pago`, `nota`.
- Dashboard con datos reales:
  - Total ingresos
  - Total gastos
  - Balance
  - Gráfico doughnut de gastos por categoría
  - Gráfico lineal de evolución mensual
- Filtros reales globales por `mes`, `categoría` y `tipo` (impactan dashboard y listado).
- Historial con búsqueda y edición rápida.
- Persistencia real en `IndexedDB` usando Dexie (sobrevive recargas).
- Import/Export:
  - Export JSON
  - Export CSV
  - Import JSON con estrategia `merge` o `replace`
- UX robusta:
  - Validaciones de formulario
  - Formato moneda ARS (`es-AR`)
  - Manejo de decimales en centavos para evitar errores de flotantes
  - Estados vacíos
  - Feedback visual con toasts
- Responsive mobile-first con foco en iPhone Safari.
- Manifest web básico para instalación en pantalla de inicio.
- Modo claro/oscuro.

## Stack

- React 19 + TypeScript + Vite
- Dexie + IndexedDB
- Chart.js + react-chartjs-2
- React Router (`HashRouter` para GitHub Pages)
- GitHub Actions + GitHub Pages

## Arquitectura

```txt
src/
  components/
    common/
    dashboard/
    filters/
    layout/
    movements/
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

## Build producción

```bash
npm run build
```

## Lint

```bash
npm run lint
```

## Deploy en GitHub Pages

1. Crear repo en GitHub.
2. Subir este código a la rama `main`.
3. En GitHub: `Settings > Pages`, seleccionar `GitHub Actions` como source.
4. Hacer push a `main`.
5. Esperar workflow `Deploy to GitHub Pages` (archivo `.github/workflows/deploy.yml`).

La base de Vite se calcula automáticamente desde `GITHUB_REPOSITORY` durante Actions y evita problemas en project pages (`/<repo>/`).

## Decisiones técnicas

- `amountCents` entero para cálculos financieros seguros.
- Capa de DB separada (`db/` + `services/`) para mantener UI desacoplada.
- Filtros globales compartidos entre páginas para consistencia de datos.
- `HashRouter` para evitar 404 al recargar rutas en GitHub Pages.
- `manualChunks` en Vite para separar `charts` y `storage` y mantener bundle controlado.

## Notas de persistencia

- Los datos viven en el navegador/dispositivo (IndexedDB).
- Si borrás datos del navegador, se pierde la base local.
- Recomendado: exportar JSON periódicamente como backup.
