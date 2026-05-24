# SOC_AZTKS V20 · Base PWA

Cambios incluidos:
- `package.json`: agrega `vite-plugin-pwa`.
- `vite.config.js`: registra PWA con modo `standalone`, auto-update, caché básico y configuración para Supabase.
- `index.html`: metadatos móviles, idioma `es-MX`, tema oscuro institucional y nombre correcto.
- `public/pwa-icon-192.png`, `public/pwa-icon-512.png`, `public/pwa-maskable-512.png`: iconos temporales para instalación.

Instalación:

```powershell
cd D:\dev\soc_aztks\frontend
npm install
npm run build
npm run preview
```

Prueba:
- Abrir la URL de preview.
- Revisar en Chrome: DevTools > Application > Manifest.
- Instalar en escritorio.
- Probar en celular cuando el proyecto esté servido por HTTPS.

Nota:
Para producción conviene reemplazar los iconos temporales por versiones oficiales con el logo AZTKS en PNG 192, 512 y maskable.
