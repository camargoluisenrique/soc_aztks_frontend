# SOC_AZTKS

**Sistema de Órdenes de Compra_AZTKS**

SOC_AZTKS es una aplicación web tipo PWA desarrollada para gestionar órdenes deportivas, pedidos a proveedor, recepción logística, inventario, salidas internas, folios y control operativo del club AZTKS.

El sistema está diseñado para funcionar como una herramienta privada de operación logística, con enfoque en simplicidad, rapidez y uso desde escritorio o dispositivos móviles.

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
