# SOC_AZTKS

**Sistema de Órdenes de Compra_AZTKS**

SOC_AZTKS es una aplicación web tipo PWA desarrollada para gestionar órdenes deportivas, pedidos a proveedor, recepción logística, inventario, salidas internas, folios y control operativo del club AZTKS.

El sistema está diseñado como una herramienta privada de operación logística, con enfoque en simplicidad, rapidez y uso desde escritorio o dispositivos móviles.

---

## Estado del proyecto

Proyecto funcional desplegado como PWA.

Incluye:

- Captura de órdenes deportivas.
- Generación de folios reales.
- Separación entre orden para proveedor y salida de inventario.
- Monitor logístico.
- Inventario inteligente.
- Recepción parcial de pedidos.
- Registro de movimientos de inventario.
- Administración de accesos.
- Exportación de documentos.
- Instalación como aplicación web progresiva.

---

## Tecnologías principales

- React
- Vite
- Supabase
- Tailwind CSS
- Vite PWA
- JavaScript
- HTML / CSS

---

## Funcionalidades principales

### Órdenes

El sistema permite capturar órdenes para proveedor o pedidos personalizados, generando un expediente operativo con folio institucional.

### Folios

La aplicación utiliza folios reales para órdenes y documentos logísticos.

El folio se consolida al guardar la orden, evitando que la vista previa utilice folios temporales como definitivos.

### Monitor logístico

Permite consultar órdenes generadas, revisar artículos, validar estatus y descargar documentos relacionados.

### Inventario

El módulo de inventario permite consultar existencias actuales, revisar productos en mínimo, registrar salidas internas y mantener control del Kárdex.

### Recepción logística

La recepción de pedidos fue diseñada para ser sencilla:

- Si llegó todo, se selecciona todo y se confirma recibido.
- Si llegó parcialmente, se selecciona únicamente lo recibido.
- Lo recibido entra automáticamente al inventario.
- Lo pendiente permanece en la orden para futuras recepciones.
- Las observaciones son opcionales y solo se usan cuando existe incidencia.

### Administración de accesos

Permite gestionar usuarios, roles, permisos, PIN y accesos internos.

### PWA

El proyecto está configurado como Progressive Web App:

- Manifest configurado.
- Service Worker activo.
- Iconos institucionales.
- Instalación en escritorio y dispositivos compatibles.
- Modo standalone.

---

## Estructura general

```txt
frontend/
├─ public/
│  ├─ icons/
│  └─ screenshots/
├─ src/
│  ├─ assets/
│  ├─ components/
│  ├─ context/
│  ├─ pages/
│  ├─ services/
│  ├─ utils/
│  ├─ AdminDashboard.jsx
│  ├─ App.jsx
│  ├─ index.css
│  └─ main.jsx
├─ index.html
├─ package.json
├─ vite.config.js
└─ README.md
```

---

## Instalación local

Clonar el repositorio:

```bash
git clone https://github.com/camargoluisenrique/soc_aztks_frontend.git
cd soc_aztks_frontend
```

Instalar dependencias:

```bash
npm install
```

Crear el archivo de variables de entorno:

```bash
.env
```

Agregar las variables necesarias:

```env
VITE_SUPABASE_URL=URL_DE_SUPABASE
VITE_SUPABASE_ANON_KEY=ANON_KEY_DE_SUPABASE
```

Ejecutar en modo desarrollo:

```bash
npm run dev
```

Generar versión de producción:

```bash
npm run build
```

Previsualizar producción local:

```bash
npm run preview
```

---

## Variables de entorno

El proyecto requiere conexión a Supabase.

Las variables deben configurarse localmente en `.env` y en producción dentro del proveedor de despliegue.

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Por seguridad, el archivo `.env` no debe subirse al repositorio.

---

## Despliegue

El proyecto puede desplegarse en Vercel.

Configuración recomendada:

```txt
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Variables requeridas en Vercel:

```txt
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

---

## PWA

La aplicación incluye configuración PWA mediante `vite-plugin-pwa`.

Para validar la instalación:

1. Ejecutar `npm run build`.
2. Ejecutar `npm run preview`.
3. Abrir la aplicación en Chrome.
4. Revisar DevTools > Application > Manifest.
5. Revisar DevTools > Application > Service Workers.
6. Probar instalación desde el navegador.

---

## Recomendaciones de operación

- Mantener los respaldos fuera del repositorio.
- No subir archivos `.env`.
- No subir carpetas `dist`, `dev-dist` o `node_modules`.
- Confirmar cada cambio funcional con `npm run build`.
- Subir cambios a GitHub antes de desplegar producción.

---

## Flujo recomendado de cambios

```bash
git status
git add .
git commit -m "descripcion del cambio"
git push
```

Vercel detectará los cambios del repositorio y ejecutará un nuevo despliegue automático.

---

## Seguridad

Este repositorio no debe contener:

- Variables de entorno reales.
- Respaldos locales.
- Archivos temporales.
- Builds generados.
- Copias históricas de desarrollo.
- Credenciales privadas.

---

## Autor

**Luis Enrique Camargo Rangel**

GitHub: [camargoluisenrique](https://github.com/camargoluisenrique)

---

## Licencia

Proyecto privado de uso operativo para SOC_AZTKS.
