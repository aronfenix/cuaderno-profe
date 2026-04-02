# Cuaderno del Profe x100

Version evolucionada para uso docente diario:
- gestion de cursos, grupos, alumnos y asignaturas,
- importacion masiva `grupo;alumno`,
- evaluaciones con rubricas editables,
- medias por asignatura y analitica de riesgo,
- sincronizacion con servidor (subir/restaurar backup).

## Importante: persistencia real multi-dispositivo

Para usar el cuaderno en varios dispositivos/navegadores y mantener los datos, **necesitas backend de sincronizacion**.

Tienes dos opciones:
- `Opcion gratis recomendada`: Cloudflare Worker + D1 (`cloudflare-sync/`).
- `Opcion Node clasica`: `server.js` con `DATA_DIR` persistente.

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

### Opcion gratis recomendada: Cloudflare (sin pagar)

1. Crea una cuenta en Cloudflare y autentica `wrangler` (`npm i -g wrangler`, `wrangler login`).
2. En `cloudflare-sync/`, crea la base D1:
```bash
wrangler d1 create cuaderno_profe_sync
```
3. Copia el `database_id` devuelto y pegalo en `cloudflare-sync/wrangler.toml`.
4. Aplica migraciones:
```bash
wrangler d1 migrations apply cuaderno_profe_sync --remote --config cloudflare-sync/wrangler.toml
```
5. Despliega el Worker:
```bash
wrangler deploy --config cloudflare-sync/wrangler.toml
```
6. Copia la URL `*.workers.dev` resultante.
7. En la app (`Ajustes > Sincronizacion`), pega esa URL en `URL base del servidor`, guarda y usa `Subir copia local`.

Con eso la sincronizacion queda persistente y disponible en cualquier dispositivo.

### Opcion alternativa: Node + Render/Railway/Fly

Si prefieres `server.js`, recuerda que necesitas almacenamiento persistente (`DATA_DIR`) para no perder el backup.

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
