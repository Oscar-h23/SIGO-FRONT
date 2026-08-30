# SIGO · Frontend Angular

Frontend del módulo de asistencia de SIGO, conectado al backend Spring Boot existente.

## Stack

- Angular 22.1.x (standalone components)
- TypeScript 6
- Reactive Forms
- HttpClient
- CSS puro, responsive
- Spring Boot API en `http://localhost:8080`
- Supabase PostgreSQL detrás del backend
- Cloudinary para evidencias, también detrás del backend

## Estructura

Todos los componentes están separados en archivos `.component.ts`, `.component.html` y `.component.css`.

```text
src/app/
├── core/
│   ├── models/
│   └── services/
├── features/
│   ├── dashboard/
│   ├── asistencia-form/
│   └── asistencia-history/
├── layout/
│   └── main-layout/
├── app.component.ts
├── app.component.html
├── app.component.css
├── app.config.ts
└── app.routes.ts
```

## Ejecutar

Requiere Node compatible con Angular 22.

```bash
npm install
npm start
```

Abre `http://localhost:4200`.

`npm start` usa `proxy.conf.json` para redirigir `/api` a `http://localhost:8080`, por lo que el backend Spring Boot debe estar ejecutándose.

## Flujo de registro

1. El formulario obtiene plazas, turnos, controladores, agentes y motivos desde Spring Boot.
2. El número programado se toma del turno.
3. El número de ausencias se calcula como `programados - presentes`.
4. Primero se registra la asistencia con `POST /api/asistencias`.
5. Luego cada foto se sube con `POST /api/asistencias/{id}/evidencias` como `multipart/form-data`.
6. Spring Boot sube el archivo a Cloudinary y guarda la URL en Supabase.

## Build

```bash
npm run build
```

La salida se genera en `dist/`.
