# Gastos MVP

Version estable: **v1.0.0**

App web local-first para registrar movimientos personales en ARS, controlar el mes y exportar reportes sin depender de backend.

## Demo en vivo

- GitHub Pages: `https://marcoluna-nqn.github.io/gastos-mvp/`

## Para quien sirve

- Personas en Argentina que quieren anotar gastos/ingresos rapido todos los dias.
- Usuarios que prefieren una app simple, clara y sin friccion.
- Quien necesita backup/export sin depender de servicios externos.

## Que hace

- Registra movimientos en segundos: monto, categoria, fecha y guardado.
- Muestra resumen mensual en ARS (ingresos, gastos, balance).
- Permite gestionar categorias y presupuestos por mes.
- Da alertas in-app por vencimientos de pagos.
- Exporta datos en JSON, CSV y XLSX.

## Novedades (release v1.0.0)

- Planilla editable tipo Excel para carga/edicion rapida.
- Exportacion profesional a Excel (`.xlsx`).
- Categorias personalizadas con alta rapida.
- Presupuestos mensuales por categoria con alertas.
- Vencimientos y recordatorios de pago dentro de la app.

## Funciones principales

- CRUD completo de movimientos.
- Filtros por mes, categoria y tipo.
- Vista lista + vista planilla.
- Dashboard mensual con resumen y analitica.
- Importacion y restauracion desde JSON (`merge` o `replace`).
- Persistencia local en IndexedDB (Dexie).

## Uso rapido (1 minuto)

1. Entra a `Movimientos`.
2. Carga monto, categoria y fecha.
3. (Opcional) agrega vencimiento y activa recordatorio.
4. Revisa `Dashboard` para ver resumen mensual y proximos vencimientos.
5. Exporta backup desde `Backup`.

## Stack

- React 19 + TypeScript + Vite
- Dexie + IndexedDB
- Chart.js + react-chartjs-2
- ExcelJS
- React Router (HashRouter para GitHub Pages)

## Desarrollo local

```bash
npm install
npm run dev
```

## Validacion

```bash
npm run lint
npm run build
```

## Deploy en GitHub Pages

El deploy corre automaticamente con GitHub Actions al hacer push a `main`.

Workflow: `.github/workflows/deploy.yml`

## Notas de datos

- Los datos viven en el navegador del dispositivo.
- Si borras almacenamiento del navegador, se pierde la base local.
- Recomendado: exportar JSON periodicamente como backup.
