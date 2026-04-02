# Cloudflare Sync Backend (Gratis)

Backend de sincronizacion para Cuaderno Profe usando Cloudflare Workers + D1.

## Requisitos
- Node.js
- `wrangler` instalado globalmente: `npm i -g wrangler`
- Login: `wrangler login`

## Pasos

1. Crear base D1:
```bash
wrangler d1 create cuaderno_profe_sync
```

2. Copiar el `database_id` devuelto a `wrangler.toml`:
```toml
database_id = "..."
```

3. Aplicar migraciones:
```bash
wrangler d1 migrations apply cuaderno_profe_sync --remote --config wrangler.toml
```

4. Desplegar Worker:
```bash
wrangler deploy --config wrangler.toml
```

## Uso en la app

En `Ajustes > Sincronizacion`:
- `URL base del servidor`: `https://<tu-worker>.workers.dev`
- `Espacio docente`: identificador compartido
- `Clave del espacio`: minimo 6 caracteres

Despues usa `Subir copia local` en el dispositivo principal y `Descargar y restaurar` en otros.
