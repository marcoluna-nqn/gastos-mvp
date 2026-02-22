# Gastos MVP

Version estable: **v1.0.0**

App web local-first para gestionar gastos e ingresos personales en Argentina, con foco en carga rapida diaria, control mensual y exportacion.

## Demo en vivo

- GitHub Pages: `https://marcoluna-nqn.github.io/gastos-mvp/`

## Que resuelve

- Registrar movimientos en segundos, sin friccion.
- Controlar el mes con resumen claro (ingresos, gastos y balance).
- Recordar pagos con vencimiento desde la misma app.
- Mantener tus datos bajo control con exportes y backup local.

## Funciones principales

- CRUD de movimientos con alta rapida simplificada.
- Dashboard mensual en ARS.
- Vencimientos y recordatorios in-app.
- Planilla editable (modo avanzado).
- Categorias personalizadas y presupuestos por categoria.
- Exportacion en JSON, CSV y XLSX.

## Como usarla en 30 segundos

1. Entra a `Movimientos`.
2. Carga `tipo`, `monto` y `categoria`, y toca `Guardar`.
3. Revisa `Dashboard` para el resumen mensual y usa `Exportar` para bajar JSON/CSV/XLSX.

## Exportaciones

- `JSON`: backup completo de la base local.
- `CSV`: movimientos segun filtros activos.
- `XLSX`: reporte Excel listo para compartir.

## Privacidad

- Los datos viven en tu navegador/dispositivo (IndexedDB con Dexie).
- No se requiere backend para usar la app.
- Si borras almacenamiento del navegador, se pierde la base local.
- Recomendado: exportar JSON periodicamente como respaldo.

## Stack

- React 19
- TypeScript
- Vite
- Dexie + IndexedDB

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

## Deploy

GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`).
