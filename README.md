# Cuaderno del Profe x100

Version evolucionada para uso docente diario:
- gestion de cursos, grupos, alumnos y asignaturas,
- importacion masiva `grupo;alumno`,
- evaluaciones con rubricas editables,
- medias por asignatura y analitica de riesgo,
- sincronizacion con servidor (subir/restaurar backup).

## Importante: persistencia real multi-dispositivo

Para usar el cuaderno en varios dispositivos/navegadores y mantener los datos, **no basta con GitHub Pages**.
Necesitas ejecutar tambien el servidor Node (`server.js`) con almacenamiento persistente (`DATA_DIR`).

- Frontend + API pueden ir en el mismo despliegue.
- El fichero de sincronizacion se guarda en `DATA_DIR/cloud-sync.json`.
- Si `DATA_DIR` no es persistente, los datos se perderan al reiniciar el servicio.

## 1) Arranque rapido

### Desarrollo (frontend)
```bash
npx vite
```

### Servidor (sync + build servido)
```bash
node server.js
```

Variables opcionales:
- `PORT` (default `3000`)
- `DATA_DIR` (default `./data`)
- `ANTHROPIC_API_KEY` (opcional para IA)

El servidor expone:
- `GET /api/health`
- `POST /api/cloud/save`
- `GET /api/cloud/load?spaceId=...&secret=...`
- `GET /api/cloud/status?spaceId=...`

## 2) Flujo recomendado para tu dia a dia

1. `Configuracion`:
- crea curso activo, grupos y asignaturas,
- alta manual de alumnos o importacion por bloque,
- importador avanzado CSV `grupo;alumno`.

2. `Asistente de Rubricas`:
- completa formulario guiado,
- genera plantilla,
- ajusta criterios/descriptores y guarda.

3. `Evaluar`:
- crea evaluacion desde una rubrica,
- completa notas por alumno.

4. `Analitica`:
- revisa medias por asignatura/grupo,
- detecta alumnado en riesgo (<5 con 2+ evaluaciones).

5. `Ajustes > Sincronizacion`:
- define `espacio docente` + `clave`,
- sube copia local al servidor,
- restaura en otro dispositivo cuando lo necesites.

## 3) Subir a GitHub y desplegar

### GitHub
```bash
git add .
git commit -m "Cuaderno Profe x100 listo para produccion"
git push origin main
```

### Render (recomendado)
Este repo incluye `render.yaml`.

Despliegue directo:
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/aronfenix/cuaderno-profe)

1. Conecta el repo en Render.
2. Crea Web Service desde `render.yaml`.
3. Verifica que monta disco persistente en `/var/data`.
4. Usa la URL publica de Render en todos tus dispositivos.

## 4) Formato de importacion avanzada

Acepta:
- `grupo;alumno`
- `grupo,alumno`
- `grupo<TAB>alumno`

Ejemplo:
```text
grupo;alumno
6A;Ana Lopez
6A;Mario Ruiz
6B;Lucia Perez
```

## 5) Notas de seguridad

- La clave del espacio se guarda localmente en el navegador.
- En servidor solo se guarda su hash (SHA-256), no la clave en texto plano.
- El backup es una fotografia completa de la base local.
