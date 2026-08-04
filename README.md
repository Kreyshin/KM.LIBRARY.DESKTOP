# Karma Library Desktop

Versión offline y familiar de Karma Library. Funciona como aplicación Windows sin instalar Docker, Node ni PostgreSQL, y también puede ejecutarse como servidor central dentro de una red LAN.

## Arquitectura

- **Electron** empaqueta la aplicación Windows.
- **Vue 3 + Vite** conserva la interfaz original.
- **NestJS** ejecuta la API local o LAN.
- **Prisma + SQLite** guarda todo en un único archivo local.
- Las portadas se almacenan en una carpeta `uploads` junto a la base de datos.
- Una **cuenta del hogar** usa correo y contraseña; dentro puede tener hasta ocho perfiles.
- El catálogo es compartido por el hogar. Cada perfil conserva sus estanterías, sesiones de lectura y estadísticas de actividad.

## Desarrollo

Requiere Node.js 20 o superior.

```powershell
npm.cmd install
npm.cmd run install:all
npm.cmd run build
npm.cmd run desktop
```

En desarrollo, los datos quedan por defecto en `karma-api-library/data`. La aplicación Electron instalada utiliza `%APPDATA%\Karma Library\data`.

## Generar instalador y versión portátil

```powershell
npm.cmd run dist:windows
```

Los archivos se generan en `release/`:

- Instalador NSIS `.exe`.
- Versión portátil `.zip`.

Para usar la versión portátil, selecciona **Extraer todo** en Windows y luego
abre `Karma Library.exe` desde la carpeta extraída. No la ejecutes directamente
desde la vista previa del ZIP. La primera apertura muestra inmediatamente una
pantalla de preparación mientras inicia el servidor local.

El instalador sin firma puede mostrar una advertencia de Windows SmartScreen. Para distribución pública conviene adquirir un certificado de firma de código.

## Uso local

Al abrir la aplicación:

1. Electron copia una base `library.sqlite` ya inicializada si no existe.
2. Prisma solo aplica migraciones cuando la versión de la base cambió.
3. NestJS escucha únicamente en `127.0.0.1:3344`.
4. Los secretos y datos se crean en la carpeta personal del usuario.

No se requiere Docker, PostgreSQL ni conexión a Internet.

## Servidor familiar LAN o NAS

En una PC/NAS con Docker:

```bash
docker compose up -d --build
```

La aplicación estará disponible en:

```text
http://IP-DEL-SERVIDOR:3344
```

Los datos persisten en el volumen `karma_library_data`. SQLite nunca debe abrirse directamente desde una carpeta compartida SMB/NFS por varios clientes; solo el proceso del servidor accede al archivo y los demás equipos se conectan por HTTP.

Desde la aplicación Windows, abre **Configuración → Servidor familiar LAN**, escribe la URL y reinicia. Para volver a la biblioteca privada del equipo, selecciona **Volver al modo local**.

La seguridad LAN asume una red doméstica confiable. Para acceso desde Internet se debe usar HTTPS, un proxy inverso, firewall y copias de seguridad; no se recomienda publicar directamente el puerto 3344.

## Respaldos

En **Configuración → Respaldos**:

- **Exportar biblioteca** genera un ZIP con `library.sqlite`, `uploads/` y metadatos.
- **Restaurar respaldo** reemplaza los datos actuales y reinicia el backend.

Guarda los ZIP fuera del equipo. Contienen información privada y no están cifrados.

## Migrar desde la versión PostgreSQL

Con la base PostgreSQL anterior ejecutándose y la base SQLite ya inicializada:

```powershell
$env:OLD_DATABASE_URL='postgresql://karma:karma@localhost:5432/km_library'
$env:DATABASE_URL='file:E:/ruta/destino/library.sqlite'
$env:KARMA_DATA_DIR='E:/ruta/destino'
$env:OLD_UPLOADS_DIR='E:/ruta/karma-api-library/uploads'

npm.cmd --prefix karma-api-library run migrate:postgres
```

El migrador conserva obras, géneros, tomos, imágenes, estanterías, sesiones y contraseñas existentes. Cada lector antiguo se convierte en una cuenta con un perfil principal. Las sesiones de acceso anteriores no se copian, por lo que es necesario iniciar sesión nuevamente.

Conserva el `.dump` PostgreSQL y la carpeta original de imágenes hasta verificar todos los registros.

## Directorios que no deben versionarse

- `.env` y secretos.
- `data/`, bases `.sqlite` y respaldos.
- `uploads/`.
- `node_modules/`, `dist/` y `release/`.

Las migraciones PostgreSQL originales se conservaron únicamente como referencia en `docs/postgresql-migrations-legacy/`.
