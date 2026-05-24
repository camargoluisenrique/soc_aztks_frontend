import { useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowLeft, ChevronDown, Download, FileText, Layers, Mail, MessageCircle, Plus, Share2, Shirt, ShoppingCart, Trash2, AtSign, ShieldCheck, LogOut } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { supabase } from './services/supabase';
import logoAztks from './assets/logo_aztks.png';
import AdminDashboard from './AdminDashboard';
import SuperAdminAccessPanel from './components/SuperAdminAccessPanel';
import { exportUniformExcel } from './utils/exportUniformExcel';

const CATEGORIAS = ['AFEM', 'AVAR A', 'AVAR B', 'U11V', 'U12V', 'U14A', 'U14FEM', 'U14V', 'U15V', 'U16A', 'U17F', 'U17V', 'U8M', 'U9M'];
const TALLAS_UNIFORME = ['32', '34', '36', '38', '40', '42', '44'];
const TALLAS_PLAYERAS_NINOS = ['10', '12', '14', '16', '18'];
const TALLAS_PLAYERAS_ADULTOS = ['Ch', 'M', 'L', 'XL'];

const ESTADOS_CALIDAD_RECEPCION = [
  'Correcto',
  'Manchado',
  'Roto',
  'Talla incorrecta',
  'Color incorrecto',
  'Producto equivocado',
  'Cantidad incompleta',
  'Pendiente por proveedor',
  'Otro',
];

const MOTIVOS_SALIDA = [
  'Entrega a deportista',
  'Cambio físico',
  'Reposición',
  'Merma / daño',
  'Uso interno',
  'Ajuste administrativo',
  'Pérdida',
  'Otro',
];

const limpiarEspacios = (texto = '') => String(texto || '').replace(/\s+/g, ' ').trim();

const capitalizarNombrePropio = (texto = '') => {
  const minusculas = ['de', 'del', 'la', 'las', 'los', 'y', 'e'];
  return limpiarEspacios(texto)
    .toLocaleLowerCase('es-MX')
    .split(' ')
    .map((palabra, index) => {
      if (!palabra) return '';
      if (index > 0 && minusculas.includes(palabra)) return palabra;
      return palabra.charAt(0).toLocaleUpperCase('es-MX') + palabra.slice(1);
    })
    .join(' ');
};

const normalizarTextoOperativo = (texto = '') => {
  const limpio = limpiarEspacios(texto);
  if (!limpio) return '';
  return limpio.charAt(0).toLocaleUpperCase('es-MX') + limpio.slice(1);
};

const normalizarNombreJersey = (texto = '') => limpiarEspacios(texto).toLocaleUpperCase('es-MX');

const mesMovimientoKey = (fecha) => {
  const d = fecha ? new Date(fecha) : new Date();
  if (Number.isNaN(d.getTime())) return 'Sin fecha';
  return d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
};

const CONFIG_GROUPS = [
  {
    title: 'Identidad visual',
    keys: [
      ['mostrarCabecera', 'Fondo oscuro de cabecera'],
      ['mostrarLogo', 'Logo AZTKS'],
      ['logoCabeceraCompleta', 'Logo a todo lo ancho'],
      ['mostrarPie', 'Pie institucional'],
    ],
  },
  {
    title: 'Datos del jugador',
    keys: [
      ['mostrarDeportista', 'Nombre del jugador'],
      ['mostrarTutor', 'Responsable / tutor'],
      ['mostrarCategoriaRama', 'Categoría y rama'],
      ['mostrarNumero', 'Número de jersey'],
      ['mostrarEstampado', 'Nombre estampado'],
    ],
  },
  {
    title: 'Datos logísticos',
    keys: [
      ['mostrarTiempos', 'Fechas de control'],
      ['mostrarProveedor', 'Proveedor / receptor'],
      ['mostrarLugarEntrega', 'Lugar de entrega'],
      ['mostrarSkus', 'Códigos SKU'],
      ['mostrarPrecios', 'Importes'],
    ],
  },
];

const CONFIG_PRESETS = {
  completo: {
    mostrarCabecera: true, mostrarLogo: true, logoCabeceraCompleta: false, mostrarPie: true, mostrarDeportista: true, mostrarTutor: true,
    mostrarCategoriaRama: true, mostrarNumero: true, mostrarEstampado: true, mostrarTiempos: true,
    mostrarProveedor: true, mostrarLugarEntrega: true, mostrarSkus: true, mostrarPrecios: true,
  },
  jugador: {
    mostrarCabecera: true, mostrarLogo: true, logoCabeceraCompleta: false, mostrarPie: true, mostrarDeportista: true, mostrarTutor: true,
    mostrarCategoriaRama: true, mostrarNumero: true, mostrarEstampado: true, mostrarTiempos: true,
    mostrarProveedor: false, mostrarLugarEntrega: false, mostrarSkus: false, mostrarPrecios: true,
  },
  proveedor: {
    mostrarCabecera: true, mostrarLogo: true, logoCabeceraCompleta: false, mostrarPie: true, mostrarDeportista: false, mostrarTutor: false,
    mostrarCategoriaRama: true, mostrarNumero: true, mostrarEstampado: false, mostrarTiempos: true,
    mostrarProveedor: true, mostrarLugarEntrega: true, mostrarSkus: true, mostrarPrecios: true,
  },
  minimalista: {
    mostrarCabecera: true, mostrarLogo: true, logoCabeceraCompleta: false, mostrarPie: true, mostrarDeportista: true, mostrarTutor: false,
    mostrarCategoriaRama: true, mostrarNumero: true, mostrarEstampado: false, mostrarTiempos: true,
    mostrarProveedor: false, mostrarLugarEntrega: false, mostrarSkus: false, mostrarPrecios: false,
  },
};

const dinero = (valor = 0) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(valor || 0));

const fechaLegible = (fecha) => {
  if (!fecha) return 'Pendiente';
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const usuarioTienePermiso = (usuario, permiso) => {
  if (!usuario) return false;
  if (usuario.rol === 'super_admin') return true;
  return Array.isArray(usuario.permisos) && usuario.permisos.includes(permiso);
};

const accesoTemporalVencido = (usuario) => {
  if (!usuario?.valido_hasta) return false;
  return new Date(usuario.valido_hasta).getTime() < Date.now();
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [authStep, setAuthStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [adminName, setAdminName] = useState('');
  const [identifiedUser, setIdentifiedUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [tipoPedido, setTipoPedido] = useState('jugador');
  const [nombreJugador, setNombreJugador] = useState('');
  const [responsableDeportista, setResponsableDeportista] = useState('');
  const [tipoSolicitud, setTipoSolicitud] = useState('Nuevo Ingreso');
  const [nombreJerseyEspalda, setNombreJerseyEspalda] = useState('');

  const [seccionAbierta, setSeccionAbierta] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [modoPlayera, setModoPlayera] = useState('paquete');
  const [cantidadesPaquetes, setCantidadesPaquetes] = useState({});
  const [cantidadesSueltas, setCantidadesSueltas] = useState({ Azul: {}, Amarilla: {}, Negra: {} });

  const [categoriaUniforme, setCategoriaUniforme] = useState('');
  const [ramaUniforme, setRamaUniforme] = useState('');
  const [numerosOcupados, setNumerosOcupados] = useState([]);
  const [numeroSeleccionado, setNumeroSeleccionado] = useState(null);
  const [colorJersey, setColorJersey] = useState('');
  const [tallaJersey, setTallaJersey] = useState('');
  const [tallaShort, setTallaShort] = useState('');
  const [modoUniformeJuego, setModoUniformeJuego] = useState('paquete');

  const [fechaPedido, setFechaPedido] = useState(new Date().toISOString().split('T')[0]);
  const [fechaEntregaAcordada, setFechaEntregaAcordada] = useState('');
  const [fechaEntregaReal, setFechaEntregaReal] = useState('');
  const [fechaPagoAcordada, setFechaPagoAcordada] = useState('');
  const [proveedor, setProveedor] = useState('Almacén Central / Proveedor General');
  const [terminosEntrega, setTerminosEntrega] = useState('normal');
  const [lugarEntrega, setLugarEntrega] = useState('Instalaciones Domo Aztks');

  const [configExport, setConfigExport] = useState(CONFIG_PRESETS.completo);
  const [canalSalida, setCanalSalida] = useState('PDF');
  const [excelOptions, setExcelOptions] = useState({ modo: 'normal', referenciasVisuales: true, escalaGrises: false });
  const [isSaving, setIsSaving] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [ordenGuardada, setOrdenGuardada] = useState(null);
  const [folioOficialActual, setFolioOficialActual] = useState('');
  const [mensajeGuardado, setMensajeGuardado] = useState('');

  const [inventarioTab, setInventarioTab] = useState('actual');
  const [inventarioItems, setInventarioItems] = useState([]);
  const [movimientosInventario, setMovimientosInventario] = useState([]);
  const [recepcionItems, setRecepcionItems] = useState([]);
  const [inventarioLoading, setInventarioLoading] = useState(false);
  const [inventarioBusy, setInventarioBusy] = useState(false);
  const [inventarioMsg, setInventarioMsg] = useState('');
  const [salidaForm, setSalidaForm] = useState({ sku: '', cantidad: 1, motivo: 'Entrega a deportista', observaciones: '' });
  const [recepcionModal, setRecepcionModal] = useState(null);
  const [recepcionForm, setRecepcionForm] = useState({ cantidad: 1, estadoCalidad: 'Correcto', observaciones: '' });
  const [recepcionSeleccion, setRecepcionSeleccion] = useState({});
  const [recepcionOrdenAbiertaId, setRecepcionOrdenAbiertaId] = useState(null);
  const [recepcionObservacionesAbiertas, setRecepcionObservacionesAbiertas] = useState(false);
  const [recepcionIncidencia, setRecepcionIncidencia] = useState('Sin observaciones');
  const [recepcionObservacionTexto, setRecepcionObservacionTexto] = useState('');
  const [movimientoFiltros, setMovimientoFiltros] = useState({ mes: 'actual', tipo: 'todos', busqueda: '' });
  const [movimientosLimit, setMovimientosLimit] = useState(20);

  const resumenOrden = useMemo(() => {
    const itemConNumero = carrito.find((item) => item.numero !== null && item.numero !== undefined);
    const itemCompetencia = carrito.find((item) => item.categoria && item.categoria !== 'Unisex') || itemConNumero || {};
    const subtotal = carrito.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);

    return {
      folioTemporal: folioOficialActual || ordenGuardada?.folio || 'PREVIA',
      subtotal,
      total: subtotal,
      numero: itemConNumero?.numero ?? numeroSeleccionado,
      categoria: itemCompetencia?.categoria || categoriaUniforme || 'Sin categoría',
      rama: itemCompetencia?.rama || ramaUniforme || 'Sin rama',
      totalPrendas: carrito.reduce((acc, item) => acc + Number(item.cantidad || 0), 0),
    };
  }, [carrito, categoriaUniforme, ramaUniforme, numeroSeleccionado, folioOficialActual, ordenGuardada?.folio]);

  useEffect(() => {
    const fetchNumeros = async () => {
      if (!categoriaUniforme || !ramaUniforme) {
        setNumerosOcupados([]);
        return;
      }

      const { data, error } = await supabase
        .from('numeros_asignados')
        .select('numero')
        .eq('categoria', categoriaUniforme)
        .eq('rama', ramaUniforme);

      if (data && !error) setNumerosOcupados(data.map((item) => item.numero));
    };

    fetchNumeros();
    setNumeroSeleccionado(null);
  }, [categoriaUniforme, ramaUniforme]);

  const toggleConfig = (key) => setConfigExport((prev) => ({ ...prev, [key]: !prev[key] }));
  const aplicarPreset = (preset) => setConfigExport(CONFIG_PRESETS[preset]);

  const handleCheckUser = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const celular = phone.trim();
      const { data, error } = await supabase
        .from('usuarios')
        .select('id,nombre,celular,rol,activo,pin,valido_hasta,permisos,ultimo_acceso')
        .eq('celular', celular)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setLoginError('No se encontró un usuario autorizado con ese número.');
        return;
      }
      if (data.activo === false) {
        setLoginError('El acceso de este usuario está inactivo. Solicita revisión al administrador.');
        return;
      }
      if (accesoTemporalVencido(data)) {
        setLoginError('El acceso temporal de este usuario ya venció.');
        return;
      }

      setIdentifiedUser(data);
      setAdminName(data.nombre || 'Usuario');
      setOtp('');
      setAuthStep(2);
    } catch (err) {
      setLoginError(`Error: ${err.message}`);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      if (!identifiedUser) throw new Error('Primero verifica tu número de celular.');
      if (!identifiedUser.pin) throw new Error('Este usuario todavía no tiene PIN asignado.');
      if (identifiedUser.pin !== otp) throw new Error('PIN incorrecto. Verifica tus datos.');
      if (identifiedUser.activo === false) throw new Error('El acceso de este usuario está inactivo.');
      if (accesoTemporalVencido(identifiedUser)) throw new Error('El acceso temporal de este usuario ya venció.');

      const usuarioSesion = {
        ...identifiedUser,
        permisos: Array.isArray(identifiedUser.permisos) ? identifiedUser.permisos : [],
      };

      setCurrentUser(usuarioSesion);
      setAdminName(usuarioSesion.nombre || 'Usuario');
      setCurrentScreen('MENU');
      setOtp('');

      await supabase
        .from('usuarios')
        .update({ ultimo_acceso: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', usuarioSesion.id);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIdentifiedUser(null);
    setAdminName('');
    setPhone('');
    setOtp('');
    setAuthStep(1);
    setCurrentScreen(0);
  };

  const irAlMenuPrincipal = () => {
    if (currentScreen === 3 && carrito.length > 0 && !ordenGuardada?.id) {
      const confirmar = window.confirm('Tienes una orden en captura que todavía no se ha guardado. Si regresas al menú podrías perder los cambios. ¿Deseas continuar?');
      if (!confirmar) return;
    }
    setCurrentScreen('MENU');
  };

  const updatePaquete = (talla, delta) => {
    setCantidadesPaquetes((prev) => ({ ...prev, [talla]: Math.max(0, (prev[talla] || 0) + delta) }));
  };

  const updateSuelta = (color, talla, delta) => {
    setCantidadesSueltas((prev) => ({
      ...prev,
      [color]: { ...prev[color], [talla]: Math.max(0, (prev[color][talla] || 0) + delta) },
    }));
  };

  const normalizarItem = (item) => ({
    precio_unitario: Number(item.precio_unitario || 0),
    subtotal: Number(item.subtotal ?? (Number(item.precio_unitario || 0) * Number(item.cantidad || 0))),
    ...item,
  });

  const agregarPlayeraAlCarrito = () => {
    const nuevosItems = [];
    let idCounter = Date.now();

    if (modoPlayera === 'paquete') {
      Object.entries(cantidadesPaquetes).forEach(([talla, qty]) => {
        if (qty > 0) {
          nuevosItems.push(normalizarItem({
            id: idCounter++, sku: `PLY-SET-${talla}`, tipo: 'Playera Entrenamiento', formato: 'Paquete corporativo',
            color: 'Set institucional (Azul, Amarilla, Negra)', talla, cantidad: qty, categoria: 'Unisex', rama: 'Unisex', numero: null,
          }));
        }
      });
    } else {
      Object.entries(cantidadesSueltas).forEach(([color, tallasObj]) => {
        Object.entries(tallasObj).forEach(([talla, qty]) => {
          if (qty > 0) {
            nuevosItems.push(normalizarItem({
              id: idCounter++, sku: `PLY-${color.substring(0, 3).toUpperCase()}-${talla}`, tipo: 'Playera Entrenamiento',
              formato: 'Unidad individual', color, talla, cantidad: qty, categoria: 'Unisex', rama: 'Unisex', numero: null,
            }));
          }
        });
      });
    }

    if (nuevosItems.length > 0) {
      setOrdenGuardada(null);
      setFolioOficialActual('');
      setMensajeGuardado('');
      setCarrito([...carrito, ...nuevosItems]);
      setCantidadesPaquetes({});
      setCantidadesSueltas({ Azul: {}, Amarilla: {}, Negra: {} });
    }
  };

  const totalPaquetes = Object.values(cantidadesPaquetes).reduce((a, b) => a + b, 0);
  const totalSueltas = Object.values(cantidadesSueltas).reduce((acc, obj) => acc + Object.values(obj).reduce((a, b) => a + b, 0), 0);

  const agregarUniformeAlCarrito = () => {
    const baseUniforme = { categoria: categoriaUniforme, rama: ramaUniforme, numero: numeroSeleccionado };
    const nuevosItems = [];

    if (modoUniformeJuego === 'paquete') {
      if (!tallaJersey || !tallaShort) return;
      nuevosItems.push(
        normalizarItem({ ...baseUniforme, id: Date.now(), sku: `JRS-OSC-${tallaJersey}`, tipo: 'Jersey de Juego', formato: 'Paquete uniforme de juego', color: 'Jersey Oscuro', talla: tallaJersey, cantidad: 1, tipoProducto: 'personalizado', afectaInventario: false }),
        normalizarItem({ ...baseUniforme, id: Date.now() + 1, sku: `JRS-TRI-${tallaJersey}`, tipo: 'Jersey de Juego', formato: 'Paquete uniforme de juego', color: 'Jersey Tricolor', talla: tallaJersey, cantidad: 1, tipoProducto: 'personalizado', afectaInventario: false }),
        normalizarItem({ ...baseUniforme, id: Date.now() + 2, sku: `SHT-OFC-${tallaShort}`, tipo: 'Short de Juego', formato: 'Paquete uniforme de juego', color: 'Negro oficial', talla: tallaShort, cantidad: 1, tipoProducto: 'personalizado', afectaInventario: false })
      );
    } else {
      if (colorJersey && tallaJersey) {
        nuevosItems.push(normalizarItem({ ...baseUniforme, id: Date.now(), sku: `JRS-${colorJersey.substring(0, 3).toUpperCase()}-${tallaJersey}`, tipo: 'Jersey de Juego', formato: 'Pieza individual bajo pedido', color: `Jersey ${colorJersey}`, talla: tallaJersey, cantidad: 1, tipoProducto: 'personalizado', afectaInventario: false }));
      }
      if (tallaShort) {
        nuevosItems.push(normalizarItem({ ...baseUniforme, id: Date.now() + 1, sku: `SHT-OFC-${tallaShort}`, tipo: 'Short de Juego', formato: 'Pieza individual bajo pedido', color: 'Negro oficial', talla: tallaShort, cantidad: 1, tipoProducto: 'personalizado', afectaInventario: false }));
      }
    }

    if (nuevosItems.length > 0) {
      setOrdenGuardada(null);
      setFolioOficialActual('');
      setMensajeGuardado('');
      setCarrito((prev) => [...prev, ...nuevosItems]);
    }
    setColorJersey('');
    setTallaJersey('');
    setTallaShort('');
    setNumeroSeleccionado(null);
  };

  const eliminarDelCarrito = (id) => {
    setOrdenGuardada(null);
    setFolioOficialActual('');
    setMensajeGuardado('');
    setCarrito(carrito.filter((item) => item.id !== id));
  };

  const esperarImagenes = async (root) => {
    const imagenes = Array.from(root.querySelectorAll('img'));
    await Promise.all(imagenes.map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    })));
  };

  const generarPDFBlob = async () => {
    const element = document.getElementById('ticket-render-preview');
    if (!element) throw new Error('No se encontró la vista previa para exportar.');

    if (document.fonts?.ready) await document.fonts.ready;
    await esperarImagenes(element);

    const rect = element.getBoundingClientRect();
    const canvas = await html2canvas(element, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height),
      windowWidth: Math.ceil(rect.width),
      windowHeight: Math.ceil(rect.height),
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, 210, 297, undefined, 'FAST');

    return pdf.output('blob');
  };

  const nombreArchivoBase = (orden = null) => {
    const folio = orden?.folio || folioOficialActual || resumenOrden.folioTemporal || 'PREVIA';
    const nombre = tipoPedido === 'jugador' ? (nombreJugador || 'Jugador') : 'Stock';
    return `SOC_AZTKS_Orden_${folio}_${nombre}`.replace(/[\\/:*?"<>|]/g, '_');
  };

  const esperarRender = () => new Promise((resolve) => setTimeout(resolve, 80));

  const handleExportPDF = async () => {
    setGenerandoPDF(true);
    try {
      const orden = await ensureOrdenGuardada();
      await esperarRender();
      const blob = await generarPDFBlob();
      saveAs(blob, `${nombreArchivoBase(orden)}.pdf`);
    } catch (error) {
      alert(`Error al generar PDF: ${error.message}`);
    } finally {
      setGenerandoPDF(false);
    }
  };

  const handleSharePDF = async () => {
    setGenerandoPDF(true);
    try {
      const orden = await ensureOrdenGuardada();
      await esperarRender();
      const blob = await generarPDFBlob();
      const file = new File([blob], `${nombreArchivoBase(orden)}.pdf`, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'SOC_AZTKS | Orden de compra',
          text: `Orden de compra SOC_AZTKS ${orden?.folio || resumenOrden.folioTemporal}${nombreJugador ? ` - ${nombreJugador}` : ''}`,
          files: [file],
        });
        return;
      }

      saveAs(blob, `${nombreArchivoBase(orden)}.pdf`);
      alert('Tu navegador no permite adjuntar el PDF automáticamente. El archivo fue descargado para que puedas compartirlo manualmente.');
    } catch (error) {
      alert(`Error al compartir PDF: ${error.message}`);
    } finally {
      setGenerandoPDF(false);
    }
  };

  const applySheetBaseStyle = (sheet) => {
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF111827' } },
          left: { style: 'thin', color: { argb: 'FF111827' } },
          bottom: { style: 'thin', color: { argb: 'FF111827' } },
          right: { style: 'thin', color: { argb: 'FF111827' } },
        };
      });
    });
  };

  const handleExportExcel = async () => {
    try {
      const orden = await ensureOrdenGuardada();
      const itemJersey = carrito.find((item) => item.tipo?.toLowerCase().includes('jersey'));
      const itemShort = carrito.find((item) => item.tipo?.toLowerCase().includes('short'));
      const numero = resumenOrden.numero !== null && resumenOrden.numero !== undefined ? resumenOrden.numero : '';

      await exportUniformExcel({
        order: {
          folio: orden?.folio || resumenOrden.folioTemporal,
          fechaPedido,
          estatus: 'POR_PEDIR',
          tipoPedido: tipoPedido === 'jugador' ? 'Personalizado' : 'Existencias',
          deportista: tipoPedido === 'jugador' ? nombreJugador || 'Pendiente' : 'Stock almacén',
          responsable: responsableDeportista || 'Pendiente',
          categoria: resumenOrden.categoria,
          rama: resumenOrden.rama,
          numeroJersey: numero,
          nombreJersey: nombreJerseyEspalda || '',
          tallaJersey: itemJersey?.talla || '',
          tallaShort: itemShort?.talla || '',
          tipoSolicitud,
          tipoJersey: itemJersey?.color || colorJersey || 'Oscuro',
          proveedor,
          fechaEntregaAcordada,
          fechaEntregaReal,
          fechaPagoAcordada,
          terminosEntrega: terminosEntrega === 'urgente' ? 'URGENTE' : 'NORMAL',
          lugarEntrega,
          solicitante: adminName || phone || 'Admin. SOC_AZTKS',
        },
        items: carrito,
        options: excelOptions,
      });
    } catch (error) {
      alert(`Error al generar Excel: ${error.message}`);
    }
  };

  const generarTextoMensaje = (folioOverride = null) => {
    const lineas = [
      'SOC_AZTKS | Orden de compra',
      '',
      `Folio: ${folioOverride || resumenOrden.folioTemporal}`,
      `Fecha: ${fechaLegible(fechaPedido)}`,
    ];

    if (configExport.mostrarDeportista && tipoPedido === 'jugador') lineas.push(`Jugador: ${nombreJugador || 'Pendiente'}`);
    if (configExport.mostrarTutor && responsableDeportista) lineas.push(`Responsable: ${responsableDeportista}`);
    if (configExport.mostrarCategoriaRama) lineas.push(`Categoría/Rama: ${resumenOrden.categoria} ${resumenOrden.rama}`);
    if (configExport.mostrarNumero) lineas.push(`Número: ${resumenOrden.numero !== null && resumenOrden.numero !== undefined ? `#${resumenOrden.numero}` : 'S/N'}`);
    if (configExport.mostrarProveedor) lineas.push(`Proveedor: ${proveedor}`);
    if (configExport.mostrarLugarEntrega) lineas.push(`Lugar de entrega: ${lugarEntrega}`);

    lineas.push('', 'Detalle:');
    carrito.forEach((item) => {
      const sku = configExport.mostrarSkus && item.sku ? ` | SKU ${item.sku}` : '';
      const precio = configExport.mostrarPrecios ? ` | ${dinero(item.subtotal || 0)}` : '';
      lineas.push(`- ${item.cantidad}x ${item.tipo} | ${item.color} | Talla ${item.talla}${sku}${precio}`);
    });

    if (configExport.mostrarPrecios) lineas.push('', `Total: ${dinero(resumenOrden.total)}`);
    return lineas.join('\n');
  };

  const getMensajeCodificado = (folioOverride = null) => encodeURIComponent(generarTextoMensaje(folioOverride));

  const getAsuntoCorreo = (folioOverride = null) => `SOC_AZTKS | Orden ${folioOverride || resumenOrden.folioTemporal} ${nombreJugador || 'Stock'}`;

  const handleSendWhatsApp = async () => {
    try {
      const orden = await ensureOrdenGuardada();
      const mensaje = getMensajeCodificado(orden?.folio);
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const whatsappUrl = isMobile
        ? `https://wa.me/?text=${mensaje}`
        : `https://web.whatsapp.com/send?text=${mensaje}`;

      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      alert(`Error al abrir WhatsApp: ${error.message}`);
    }
  };

  const handleSendEmail = async () => {
    try {
      const orden = await ensureOrdenGuardada();
      window.open(
        `mailto:?subject=${encodeURIComponent(getAsuntoCorreo(orden?.folio))}&body=${getMensajeCodificado(orden?.folio)}`,
        '_blank',
        'noopener,noreferrer'
      );
    } catch (error) {
      alert(`Error al abrir correo: ${error.message}`);
    }
  };

  const handleSendGmail = async () => {
    try {
      const orden = await ensureOrdenGuardada();
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(getAsuntoCorreo(orden?.folio))}&body=${getMensajeCodificado(orden?.folio)}`;
      window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      alert(`Error al abrir Gmail: ${error.message}`);
    }
  };

  const obtenerFolioOficial = async () => {
    const { data, error } = await supabase.rpc('soc_aztks_generar_folio', { p_fecha: fechaPedido || new Date().toISOString().slice(0, 10) });
    if (error) throw error;
    const folioData = Array.isArray(data) ? data[0] : data;
    return folioData?.folio_generado || folioData || null;
  };

  const normalizarSkuInventario = (item) => {
    const talla = item.talla;
    const tipo = (item.tipo || '').toLowerCase();
    const color = (item.color || '').toLowerCase();
    const sku = item.sku || '';
    if (tipo.includes('playera')) {
      if (sku.startsWith('PLY-SET')) return [
        { sku: `PLY-ENT-AZL-${talla}`, cantidad: item.cantidad },
        { sku: `PLY-ENT-AMA-${talla}`, cantidad: item.cantidad },
        { sku: `PLY-ENT-NGR-${talla}`, cantidad: item.cantidad },
      ];
      if (color.includes('azul') || sku.includes('AZU')) return [{ sku: `PLY-ENT-AZL-${talla}`, cantidad: item.cantidad }];
      if (color.includes('amarilla') || sku.includes('AMA')) return [{ sku: `PLY-ENT-AMA-${talla}`, cantidad: item.cantidad }];
      if (color.includes('negra') || sku.includes('NEG')) return [{ sku: `PLY-ENT-NGR-${talla}`, cantidad: item.cantidad }];
    }
    return [{ sku, cantidad: item.cantidad }];
  };

  const validarStockDisponible = async (items) => {
    const salidas = [];
    items
      .filter((item) => item.tipoProducto === 'stock' || item.afectaInventario === true || item.sku?.startsWith('PLY-'))
      .forEach((item) => normalizarSkuInventario(item).forEach((salida) => salidas.push(salida)));

    for (const salida of salidas) {
      const { data: inv, error: invError } = await supabase.from('inventario').select('sku, stock_actual').eq('sku', salida.sku).single();
      if (invError || !inv) throw new Error(`No existe inventario para ${salida.sku}. Regístralo antes de venderlo.`);
      if ((inv.stock_actual || 0) < salida.cantidad) throw new Error(`Stock insuficiente para ${salida.sku}. Disponible: ${inv.stock_actual || 0}, requerido: ${salida.cantidad}.`);
    }
  };

  const registrarSalidaStock = async ({ ordenId, folio, items }) => {
    const salidas = [];
    items
      .filter((item) => item.tipoProducto === 'stock' || item.afectaInventario === true || item.sku?.startsWith('PLY-'))
      .forEach((item) => normalizarSkuInventario(item).forEach((salida) => salidas.push(salida)));

    for (const salida of salidas) {
      const { data: inv, error: invError } = await supabase.from('inventario').select('sku, stock_actual').eq('sku', salida.sku).single();
      if (invError || !inv) throw new Error(`No existe inventario para ${salida.sku}. Regístralo antes de venderlo.`);
      if ((inv.stock_actual || 0) < salida.cantidad) throw new Error(`Stock insuficiente para ${salida.sku}. Disponible: ${inv.stock_actual || 0}, requerido: ${salida.cantidad}.`);

      const { error: updateError } = await supabase.from('inventario').update({ stock_actual: (inv.stock_actual || 0) - salida.cantidad, updated_at: new Date().toISOString() }).eq('sku', salida.sku);
      if (updateError) throw updateError;

      const { error: movError } = await supabase.from('movimientos_inventario').insert({
        sku: salida.sku,
        tipo_movimiento: 'SALIDA',
        cantidad: salida.cantidad,
        motivo: `Salida por orden ${folio}`,
        orden_relacionada_id: ordenId,
        registrado_por: currentUser?.celular || phone || null,
      });
      if (movError) throw movError;
    }
  };

  const crearOrdenEnNube = async () => {
    if (carrito.length === 0) throw new Error('Agrega al menos una prenda antes de guardar la orden.');

    // IMPORTANTE SOC_AZTKS:
    // Esta pantalla genera una ORDEN DE COMPRA para proveedor.
    // No debe validar ni descontar inventario aquí, porque la mercancía aún no ha salido del almacén.
    // El inventario se afectará después desde flujos separados:
    // 1) Recepción logística: suma inventario cuando el pedido de stock sea recibido.
    // 2) Salida interna / entrega: descuenta inventario cuando se entregue mercancía existente.

    const folioOficial = await obtenerFolioOficial();
    if (!folioOficial) throw new Error('No fue posible generar el folio oficial.');

    const numeroFolio = Number(String(folioOficial).split('-').pop() || 0);
    const anioFolio = Number(String(folioOficial).split('-')[1] || new Date().getFullYear());

    const { data: ordenData, error: ordenError } = await supabase
      .from('ordenes')
      .insert([{
        folio: folioOficial,
        folio_anio: anioFolio,
        folio_numero: numeroFolio,
        tipo_pedido: tipoPedido,
        nombre_jugador: tipoPedido === 'jugador' ? capitalizarNombrePropio(nombreJugador) : null,
        responsable_deportista: tipoPedido === 'jugador' ? capitalizarNombrePropio(responsableDeportista) : null,
        tipo_solicitud: tipoPedido === 'jugador' ? tipoSolicitud : null,
        nombre_jersey: tipoPedido === 'jugador' ? normalizarNombreJersey(nombreJerseyEspalda) : null,
        categoria: resumenOrden.categoria || 'Registro Logístico',
        rama: resumenOrden.rama || 'Consolidado',
        numero_jersey: resumenOrden.numero ?? null,
        creado_por: currentUser?.celular || phone,
        fecha_pedido: fechaPedido,
        fecha_entrega_acordada: fechaEntregaAcordada || null,
        fecha_entrega_real: fechaEntregaReal || null,
        fecha_pago_acordada: fechaPagoAcordada || null,
        proveedor: normalizarTextoOperativo(proveedor) || null,
        terminos_entrega: terminosEntrega,
        lugar_entrega: normalizarTextoOperativo(lugarEntrega) || null,
      }])
      .select();

    if (ordenError) throw ordenError;
    const orden = ordenData?.[0];
    if (!orden?.id) throw new Error('La orden se guardó sin identificador válido.');

    const itemsParaInsertar = carrito.map((item) => ({
      orden_id: orden.id,
      sku: item.sku || null,
      tipo_prenda: item.tipo,
      formato: item.formato,
      color: item.color,
      talla: item.talla,
      cantidad: item.cantidad,
      categoria: item.categoria || null,
      rama: item.rama || null,
      numero: item.numero ?? null,
      precio_unitario: item.precio_unitario ?? 0,
      subtotal: item.subtotal ?? ((item.precio_unitario ?? 0) * item.cantidad),
      tipo_producto: item.tipoProducto || (item.afectaInventario === false ? 'personalizado' : 'stock'),
      afecta_inventario: item.afectaInventario !== false,
      estatus_item: 'PROCESANDO',
    }));

    const { error: itemsError } = await supabase.from('ordenes_items').insert(itemsParaInsertar);
    if (itemsError) throw itemsError;

    // No se registra salida de stock al crear una orden de compra.
    // La salida se registrará en el módulo de salidas internas/entregas.
    // La entrada se registrará desde el monitor logístico al marcar recibido.

    try {
      await supabase.from('ordenes_auditoria').insert({
        orden_id: orden.id,
        folio: folioOficial,
        accion: 'CREADA',
        descripcion: 'Orden de compra creada. No afecta inventario hasta recepción o salida controlada.',
        valor_nuevo: { folio: folioOficial, items: itemsParaInsertar },
        usuario_nombre: currentUser?.nombre || adminName || null,
        usuario_celular: currentUser?.celular || phone || null,
        motivo: 'Registro inicial de orden de compra',
      });
    } catch (auditError) {
      console.warn('No se pudo registrar auditoría de creación:', auditError);
    }

    return { ...orden, folio: folioOficial, folio_anio: anioFolio, folio_numero: numeroFolio };
  };

  const ensureOrdenGuardada = async () => {
    if (ordenGuardada?.id && (ordenGuardada.folio || folioOficialActual)) return ordenGuardada;

    setIsSaving(true);
    setMensajeGuardado('Guardando orden de compra y generando folio oficial...');
    try {
      const orden = await crearOrdenEnNube();
      flushSync(() => {
        setOrdenGuardada(orden);
        setFolioOficialActual(orden.folio);
        setMensajeGuardado(`Orden de compra guardada correctamente · ${orden.folio}`);
      });
      return orden;
    } finally {
      setIsSaving(false);
    }
  };

  const limpiarCaptura = () => {
    setOrdenGuardada(null);
    setFolioOficialActual('');
    setMensajeGuardado('');
    setCarrito([]);
    setNombreJugador('');
    setResponsableDeportista('');
    setNombreJerseyEspalda('');
    setCategoriaUniforme('');
    setRamaUniforme('');
    setFechaEntregaAcordada('');
    setFechaEntregaReal('');
    setFechaPagoAcordada('');
    setProveedor('Almacén Central / Proveedor General');
    setLugarEntrega('Instalaciones Domo Aztks');
  };

  const handleGuardarEnNube = async () => {
    try {
      const orden = await ensureOrdenGuardada();
      alert(`Orden de compra registrada correctamente. Folio: ${orden.folio}. Puedes descargar, compartir o enviar desde esta misma pantalla.`);
    } catch (error) {
      alert(`Falla en el registro: ${error.message}`);
    }
  };


  const getInventarioEstado = (item) => {
    const stock = Number(item.stock_actual || 0);
    const preventivo = Number(item.stock_preventivo ?? 2);
    const minimo = Number(item.stock_minimo ?? 1);
    if (stock <= 0) return { label: 'Sin existencia', color: 'bg-red-500/15 text-red-300 border-red-500/40', orden: 4 };
    if (stock <= minimo) return { label: 'Stock mínimo', color: 'bg-orange-500/15 text-orange-300 border-orange-500/40', orden: 3 };
    if (stock <= preventivo) return { label: 'Preventivo', color: 'bg-yellow-500/15 text-yellow-200 border-yellow-500/40', orden: 2 };
    return { label: 'Disponible', color: 'bg-aztks-green/10 text-aztks-green border-aztks-green/40', orden: 1 };
  };

  const cargarPanelInventario = async () => {
    if (!usuarioTienePermiso(currentUser, 'gestionar_inventario')) return;
    setInventarioLoading(true);
    setInventarioMsg('');
    try {
      const { data: invData, error: invError } = await supabase
        .from('inventario')
        .select('*')
        .order('nombre_producto', { ascending: true })
        .order('color', { ascending: true })
        .order('talla', { ascending: true });
      if (invError) throw invError;
      setInventarioItems(invData || []);

      const { data: movData, error: movError } = await supabase
        .from('movimientos_inventario')
        .select('*')
        .order('fecha_movimiento', { ascending: false })
        .limit(200);
      if (!movError) setMovimientosInventario(movData || []);

      const { data: itemsData, error: itemsError } = await supabase
        .from('ordenes_items')
        .select('id,orden_id,sku,tipo_prenda,formato,color,talla,cantidad,cantidad_recibida,cantidad_entregada,tipo_producto,afecta_inventario,estatus_item,numero,categoria,rama,observaciones_logistica,recibido_por,fecha_recibido,entregado_por,fecha_entregado')
        .neq('estatus_item', 'ENTREGADO')
        .order('id', { ascending: false })
        .limit(80);
      if (itemsError) throw itemsError;

      const ordenIds = [...new Set((itemsData || []).map((item) => item.orden_id).filter(Boolean))];
      let ordenesMap = {};
      if (ordenIds.length > 0) {
        const { data: ordenesData } = await supabase
          .from('ordenes')
          .select('id,folio,tipo_pedido,nombre_jugador,proveedor,created_at')
          .in('id', ordenIds);
        ordenesMap = Object.fromEntries((ordenesData || []).map((orden) => [orden.id, orden]));
      }

      setRecepcionItems((itemsData || []).map((item) => ({ ...item, orden: ordenesMap[item.orden_id] || null })));
    } catch (error) {
      setInventarioMsg(`Error al cargar inventario: ${error.message}`);
    } finally {
      setInventarioLoading(false);
    }
  };

  useEffect(() => {
    if (currentScreen === 'INVENTARIO') cargarPanelInventario();
  }, [currentScreen]);

  const asegurarInventarioSku = async ({ sku, cantidad, item = null }) => {
    const { data: inv, error: invError } = await supabase
      .from('inventario')
      .select('*')
      .eq('sku', sku)
      .maybeSingle();
    if (invError) throw invError;

    if (!inv) {
      const nuevoStock = Number(cantidad || 0);
      const { error: insertError } = await supabase.from('inventario').insert({
        sku,
        nombre_producto: item?.tipo_prenda || item?.tipo || 'Producto recibido',
        categoria_prenda: item?.tipo_prenda || item?.tipo || 'General',
        color: item?.color || 'Sin color',
        talla: item?.talla || 'Sin talla',
        stock_actual: nuevoStock,
        stock_minimo: 1,
        stock_preventivo: 2,
        stock_objetivo: 10,
        tipo_producto: 'stock',
        afecta_inventario: true,
        activo: true,
        updated_at: new Date().toISOString(),
      });
      if (insertError) throw insertError;
      return { saldoAnterior: 0, saldoNuevo: nuevoStock };
    }

    const saldoAnterior = Number(inv.stock_actual || 0);
    const saldoNuevo = saldoAnterior + Number(cantidad || 0);
    const { error: updateError } = await supabase
      .from('inventario')
      .update({ stock_actual: saldoNuevo, updated_at: new Date().toISOString() })
      .eq('sku', sku);
    if (updateError) throw updateError;
    return { saldoAnterior, saldoNuevo };
  };

  const registrarMovimientoInventario = async ({ sku, tipo, tipo_movimiento, cantidad, motivo, ordenId = null, orden_relacionada_id = null, item = null, folio = null, saldoAnterior = null, saldoNuevo = null, estadoCalidad = null, observaciones = '' }) => {
    const movimientoTipo = tipo || tipo_movimiento || 'MOVIMIENTO';
    const ordenRelacionadaId = ordenId || orden_relacionada_id || null;
    const { error } = await supabase.from('movimientos_inventario').insert({
      sku,
      tipo_movimiento: movimientoTipo,
      cantidad,
      motivo: normalizarTextoOperativo(motivo),
      orden_relacionada_id: ordenRelacionadaId,
      registrado_por: currentUser?.celular || phone || null,
      producto: item?.tipo_prenda || item?.nombre_producto || null,
      color: item?.color || null,
      talla: item?.talla || null,
      folio_relacionado: folio || item?.orden?.folio || null,
      saldo_anterior: saldoAnterior,
      saldo_nuevo: saldoNuevo,
      estado_calidad: estadoCalidad,
      observaciones: normalizarTextoOperativo(observaciones),
    });
    if (error) throw error;
  };

  const abrirRecepcionParcial = (item) => {
    const pendiente = Math.max(0, Number(item.cantidad || 0) - Number(item.cantidad_recibida || 0));
    if (pendiente <= 0) return;
    setRecepcionModal(item);
    setRecepcionForm({ cantidad: pendiente, estadoCalidad: 'Correcto', observaciones: '' });
  };

  const obtenerDraftRecepcion = (item) => {
    const pendiente = Math.max(0, Number(item.cantidad || 0) - Number(item.cantidad_recibida || 0));
    return recepcionSeleccion[item.id] || {
      seleccionado: false,
      cantidad: pendiente || 1,
      estadoCalidad: 'Correcto',
      observaciones: '',
    };
  };

  const actualizarDraftRecepcion = (item, cambios) => {
    const pendiente = Math.max(0, Number(item.cantidad || 0) - Number(item.cantidad_recibida || 0));
    setRecepcionSeleccion((actual) => {
      const previo = actual[item.id] || {
        seleccionado: false,
        cantidad: pendiente || 1,
        estadoCalidad: 'Correcto',
        observaciones: '',
      };
      return {
        ...actual,
        [item.id]: { ...previo, ...cambios },
      };
    });
  };

  const recibirItemConDatos = async (item, cantidadRecibida, estadoCalidad = 'Correcto', observaciones = '') => {
    const cantidadPedido = Number(item.cantidad || 0);
    const yaRecibido = Number(item.cantidad_recibida || 0);
    const pendiente = Math.max(0, cantidadPedido - yaRecibido);
    const cantidad = Number(cantidadRecibida || 0);

    if (cantidad <= 0 || cantidad > pendiente) {
      throw new Error('La cantidad recibida debe ser mayor a 0 y no puede superar lo pendiente.');
    }

    const estadoNormalizado = String(estadoCalidad || '').toLowerCase();
    const entraInventario = estadoNormalizado.includes('correcto') || estadoNormalizado.includes('observación');
    const nuevaCantidadRecibida = entraInventario ? yaRecibido + cantidad : yaRecibido;
    const itemCompleto = nuevaCantidadRecibida >= cantidadPedido;
    const observacionFinal = [
      item.observaciones_logistica,
      `Recepción: ${estadoCalidad}. Cantidad: ${cantidad}. ${observaciones || ''}`.trim(),
    ].filter(Boolean).join('\n');

    if (entraInventario && item.afecta_inventario !== false) {
      const referencias = normalizarSkuInventario({ ...item, cantidad });
      await Promise.all(referencias.map(async (ref) => {
        const inventarioActual = inventarioItems.find((inv) => inv.sku === ref.sku);
        const stockPrevio = Number(inventarioActual?.stock_actual || 0);
        const stockNuevo = stockPrevio + Number(ref.cantidad || 0);
        if (inventarioActual) {
          await supabase
            .from('inventario')
            .update({ stock_actual: stockNuevo, updated_at: new Date().toISOString() })
            .eq('sku', ref.sku);
        } else {
          await supabase
            .from('inventario')
            .insert({
              sku: ref.sku,
              nombre_producto: item.tipo_prenda || item.prenda || 'Producto',
              categoria_prenda: item.categoria || 'Unisex',
              color: item.color || 'Sin color',
              talla: item.talla || 'Sin talla',
              stock_actual: Number(ref.cantidad || 0),
              stock_minimo: 1,
              stock_preventivo: 2,
              stock_objetivo: 10,
              tipo_producto: 'stock',
              afecta_inventario: true,
              activo: true,
            });
        }
        await registrarMovimientoInventario({
          sku: ref.sku,
          tipo_movimiento: 'ENTRADA_RECEPCION',
          cantidad: Number(ref.cantidad || 0),
          motivo: `Recepción ${estadoCalidad}`,
          orden_relacionada_id: item.orden_id,
          observaciones: observaciones || null,
        });
      }));
    } else {
      await registrarMovimientoInventario({
        sku: item.sku || 'SIN-SKU',
        tipo_movimiento: 'INCIDENCIA_RECEPCION',
        cantidad,
        motivo: estadoCalidad,
        orden_relacionada_id: item.orden_id,
        observaciones: observaciones || null,
      });
    }

    const updatePayload = {
      cantidad_recibida: nuevaCantidadRecibida,
      estatus_item: itemCompleto ? 'RECIBIDO' : 'PROCESANDO',
      fecha_recibido: entraInventario ? new Date().toISOString() : item.fecha_recibido,
      recibido_por: currentUser?.nombre || currentUser?.celular || phone || 'Sistema',
      observaciones_logistica: observacionFinal,
    };

    const { error: updateError } = await supabase
      .from('ordenes_items')
      .update(updatePayload)
      .eq('id', item.id);

    if (updateError) throw updateError;
  };

  const confirmarRecepcionSeleccionada = async () => {
    const seleccionados = recepcionItems.filter((item) => obtenerDraftRecepcion(item).seleccionado);
    if (seleccionados.length === 0) {
      alert('Selecciona al menos un artículo recibido.');
      return;
    }

    const observacionGlobal = [
      recepcionIncidencia && recepcionIncidencia !== 'Sin observaciones' ? recepcionIncidencia : '',
      recepcionObservacionTexto,
    ].filter(Boolean).join(' · ');

    setInventarioBusy(true);
    try {
      for (const item of seleccionados) {
        const draft = obtenerDraftRecepcion(item);
        await recibirItemConDatos(item, draft.cantidad, 'Correcto', observacionGlobal || draft.observaciones || '');
      }
      setRecepcionSeleccion({});
      setRecepcionIncidencia('Sin observaciones');
      setRecepcionObservacionTexto('');
      setRecepcionObservacionesAbiertas(false);
      await cargarPanelInventario();
      setInventarioMsg('Recepción registrada. Lo recibido entró automáticamente al inventario cuando aplica; lo pendiente queda en la orden.');
    } catch (error) {
      console.error(error);
      alert(`Error al registrar recepción: ${error.message}`);
    } finally {
      setInventarioBusy(false);
    }
  };

  const confirmarRecepcionParcial = async () => {
    if (!recepcionModal) return;
    setInventarioBusy(true);
    try {
      await recibirItemConDatos(
        recepcionModal,
        Number(recepcionForm.cantidad || 0),
        recepcionForm.estadoCalidad,
        recepcionForm.observaciones,
      );
      setRecepcionModal(null);
      setRecepcionForm({ cantidad: 1, estadoCalidad: 'Correcto', observaciones: '' });
      await cargarPanelInventario();
      setInventarioMsg('Recepción parcial registrada correctamente.');
    } catch (error) {
      console.error(error);
      alert(`Error al registrar recepción: ${error.message}`);
    } finally {
      setInventarioBusy(false);
    }
  };

  const handleEntregarItemPersonalizado = async (item) => {
    const pendiente = Math.max(0, Number(item.cantidad || 0) - Number(item.cantidad_entregada || 0));
    if (pendiente <= 0) return;

    setInventarioBusy(true);
    setInventarioMsg('');
    try {
      await registrarMovimientoInventario({
        sku: item.sku || 'PERSONALIZADO',
        tipo: item.tipo_producto === 'personalizado' ? 'ENTREGA_PERSONALIZADO' : 'ENTREGA_DOCUMENTAL',
        cantidad: pendiente,
        motivo: `Entrega logística ${item.orden?.folio || item.orden_id || ''}`.trim(),
        ordenId: item.orden_id,
      });

      const nuevaCantidad = Number(item.cantidad_entregada || 0) + pendiente;
      const estatus = nuevaCantidad >= Number(item.cantidad || 0) ? 'ENTREGADO' : 'PARCIALMENTE_ENTREGADO';
      const { error: updateError } = await supabase
        .from('ordenes_items')
        .update({ cantidad_entregada: nuevaCantidad, estatus_item: estatus, fecha_entregado: new Date().toISOString(), entregado_por: currentUser?.nombre || adminName || phone })
        .eq('id', item.id);
      if (updateError) throw updateError;

      setInventarioMsg(`Entrega registrada para ${item.sku || item.tipo_prenda}.`);
      await cargarPanelInventario();
    } catch (error) {
      setInventarioMsg(`Error al entregar: ${error.message}`);
    } finally {
      setInventarioBusy(false);
    }
  };

  const handleSalidaInterna = async () => {
    const cantidad = Number(salidaForm.cantidad || 0);
    if (!salidaForm.sku || cantidad <= 0) {
      alert('Selecciona un SKU y una cantidad válida.');
      return;
    }

    setInventarioBusy(true);
    setInventarioMsg('');
    try {
      const { data: inv, error: invError } = await supabase
        .from('inventario')
        .select('sku,stock_actual')
        .eq('sku', salidaForm.sku)
        .single();
      if (invError || !inv) throw new Error(`No existe inventario para ${salidaForm.sku}.`);
      if (Number(inv.stock_actual || 0) < cantidad) throw new Error(`Stock insuficiente. Disponible: ${inv.stock_actual || 0}, requerido: ${cantidad}.`);

      const { error: updateError } = await supabase
        .from('inventario')
        .update({ stock_actual: Number(inv.stock_actual || 0) - cantidad, updated_at: new Date().toISOString() })
        .eq('sku', salidaForm.sku);
      if (updateError) throw updateError;

      await registrarMovimientoInventario({
        sku: salidaForm.sku,
        tipo: 'SALIDA_INTERNA',
        cantidad,
        motivo: `${salidaForm.motivo}${salidaForm.observaciones ? ` · ${normalizarTextoOperativo(salidaForm.observaciones)}` : ''}`,
        saldoAnterior: Number(inv.stock_actual || 0),
        saldoNuevo: Number(inv.stock_actual || 0) - cantidad,
        observaciones: salidaForm.observaciones,
      });

      setSalidaForm({ sku: '', cantidad: 1, motivo: 'Entrega a deportista', observaciones: '' });
      setInventarioMsg('Salida interna registrada correctamente.');
      await cargarPanelInventario();
    } catch (error) {
      setInventarioMsg(`Error en salida interna: ${error.message}`);
    } finally {
      setInventarioBusy(false);
    }
  };

  const renderInventarioScreen = () => {
    const preOrden = inventarioItems
      .filter((item) => item.activo !== false && Number(item.stock_actual || 0) <= Number(item.stock_minimo ?? 1))
      .map((item) => ({ ...item, sugerido: Math.max(0, Number(item.stock_objetivo || 10) - Number(item.stock_actual || 0)) }));
    const movimientosFiltrados = movimientosInventario.filter((m) => {
      const texto = `${m.sku || ''} ${m.tipo_movimiento || ''} ${m.motivo || ''} ${m.registrado_por || ''} ${m.folio_relacionado || ''} ${m.producto || ''}`.toLowerCase();
      const busquedaOk = !movimientoFiltros.busqueda || texto.includes(movimientoFiltros.busqueda.toLowerCase());
      const tipoOk = movimientoFiltros.tipo === 'todos' || m.tipo_movimiento === movimientoFiltros.tipo;
      const fechaMov = m.fecha_movimiento || m.created_at;
      const fecha = fechaMov ? new Date(fechaMov) : null;
      const hoy = new Date();
      const mesOk = movimientoFiltros.mes === 'todos' || (fecha && fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear());
      return busquedaOk && tipoOk && mesOk;
    });
    const movimientosVisibles = movimientosFiltrados.slice(0, movimientosLimit);
    const tiposMovimiento = ['todos', ...Array.from(new Set(movimientosInventario.map((m) => m.tipo_movimiento).filter(Boolean)))];
    const movimientosPorMes = movimientosVisibles.reduce((acc, mov) => {
      const key = mesMovimientoKey(mov.fecha_movimiento || mov.created_at);
      acc[key] = acc[key] || [];
      acc[key].push(mov);
      return acc;
    }, {});

    const recepcionPendientes = recepcionItems.filter((item) => Math.max(0, Number(item.cantidad || 0) - Number(item.cantidad_recibida || 0)) > 0);
    const recepcionOrdenes = Object.values(recepcionPendientes.reduce((acc, item) => {
      const key = item.orden_id || item.id;
      if (!acc[key]) {
        acc[key] = {
          id: key,
          orden: item.orden || {},
          items: [],
          piezasPendientes: 0,
        };
      }
      acc[key].items.push(item);
      acc[key].piezasPendientes += Math.max(0, Number(item.cantidad || 0) - Number(item.cantidad_recibida || 0));
      return acc;
    }, {}));
    const recepcionOrdenAbierta = recepcionOrdenes.find((orden) => orden.id === recepcionOrdenAbiertaId) || null;
    const itemsOrdenAbierta = recepcionOrdenAbierta?.items || [];
    const seleccionadosOrdenAbierta = itemsOrdenAbierta.filter((item) => obtenerDraftRecepcion(item).seleccionado);
    const todosSeleccionadosOrdenAbierta = itemsOrdenAbierta.length > 0 && seleccionadosOrdenAbierta.length === itemsOrdenAbierta.length;
    const toggleSeleccionarOrdenCompleta = (seleccionar) => {
      setRecepcionSeleccion((actual) => {
        const siguiente = { ...actual };
        itemsOrdenAbierta.forEach((item) => {
          const pendiente = Math.max(0, Number(item.cantidad || 0) - Number(item.cantidad_recibida || 0));
          siguiente[item.id] = {
            ...(siguiente[item.id] || {}),
            seleccionado: seleccionar,
            cantidad: pendiente || 1,
            estadoCalidad: 'Correcto',
            observaciones: '',
          };
        });
        return siguiente;
      });
    };

    return (
      <div className="space-y-6 mt-4 max-w-7xl mx-auto animate-in fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <button onClick={() => setCurrentScreen('MENU')} className="text-gray-500 hover:text-white text-xs uppercase font-bold tracking-wider flex items-center mb-3"><ArrowLeft className="w-4 h-4 mr-1" /> Menú</button>
            <h2 className="text-2xl font-display font-bold text-white">Inventario inteligente</h2>
            <p className="text-xs text-gray-400 mt-1">Recepción logística, salidas internas, pre-orden automática y Kárdex.</p>
          </div>
          <button onClick={cargarPanelInventario} disabled={inventarioLoading || inventarioBusy} className="rounded-xl border border-aztks-green/40 px-4 py-3 text-xs font-bold uppercase text-aztks-green hover:bg-aztks-green/10 disabled:opacity-50">Actualizar</button>
        </div>

        {inventarioMsg && <div className="rounded-xl border border-gray-700 bg-[#121212] p-4 text-xs font-bold text-gray-200">{inventarioMsg}</div>}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[['actual', 'Inventario actual'], ['preorden', 'Pre-orden automática'], ['recepcion', 'Recepción logística'], ['salidas', 'Salidas internas'], ['historial', 'Historial']].map(([key, label]) => (
            <button key={key} onClick={() => setInventarioTab(key)} className={`rounded-xl border px-4 py-3 text-xs font-bold uppercase ${inventarioTab === key ? 'border-aztks-orange bg-aztks-orange/10 text-aztks-orange' : 'border-gray-800 bg-[#121212] text-gray-500'}`}>{label}</button>
          ))}
        </div>

        {inventarioLoading ? (
          <div className="rounded-2xl border border-gray-800 bg-aztks-grey p-8 text-center text-gray-400 text-sm">Cargando inventario...</div>
        ) : inventarioTab === 'actual' ? (
          <div className="rounded-2xl border border-gray-800 bg-aztks-grey overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#121212] text-gray-400 uppercase tracking-wider">
                  <tr><th className="p-3 text-left">SKU</th><th className="p-3 text-left">Producto</th><th className="p-3 text-left">Color</th><th className="p-3 text-left">Talla</th><th className="p-3 text-center">Stock</th><th className="p-3 text-center">Objetivo</th><th className="p-3 text-left">Estado</th></tr>
                </thead>
                <tbody>
                  {inventarioItems.map((item) => {
                    const estado = getInventarioEstado(item);
                    return (
                      <tr key={item.sku} className="border-t border-gray-800">
                        <td className="p-3 font-bold text-white">{item.sku}</td>
                        <td className="p-3 text-gray-300">{item.nombre_producto}</td>
                        <td className="p-3 text-gray-400">{item.color}</td>
                        <td className="p-3 text-gray-400">{item.talla}</td>
                        <td className="p-3 text-center font-bold text-white">{item.stock_actual}</td>
                        <td className="p-3 text-center text-gray-400">{item.stock_objetivo || 10}</td>
                        <td className="p-3"><span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${estado.color}`}>{estado.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : inventarioTab === 'preorden' ? (
          <div className="rounded-2xl border border-gray-800 bg-aztks-grey overflow-hidden">
            <div className="p-4 border-b border-gray-800"><h3 className="font-bold uppercase text-sm text-white">Productos en mínimo o sin existencia</h3><p className="text-xs text-gray-500 mt-1">Se anexan a pre-orden cuando stock_actual ≤ stock_minimo.</p></div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#121212] text-gray-400 uppercase"><tr><th className="p-3 text-left">SKU</th><th className="p-3 text-left">Producto</th><th className="p-3 text-center">Stock</th><th className="p-3 text-center">Objetivo</th><th className="p-3 text-center">Sugerido comprar</th></tr></thead>
                <tbody>{preOrden.length === 0 ? <tr><td colSpan="5" className="p-6 text-center text-gray-500">No hay productos en mínimo.</td></tr> : preOrden.map((item) => <tr key={item.sku} className="border-t border-gray-800"><td className="p-3 font-bold text-white">{item.sku}</td><td className="p-3 text-gray-300">{item.nombre_producto} · {item.color} · {item.talla}</td><td className="p-3 text-center text-orange-300 font-bold">{item.stock_actual}</td><td className="p-3 text-center text-gray-400">{item.stock_objetivo || 10}</td><td className="p-3 text-center text-aztks-green font-bold">{item.sugerido}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        ) : inventarioTab === 'recepcion' ? (
          <div className="space-y-4">
            {!recepcionOrdenAbierta ? (
              <div className="rounded-2xl border border-gray-800 bg-aztks-grey overflow-hidden">
                <div className="p-5 border-b border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="font-bold uppercase text-sm text-white">Recepción de pedidos</h3>
                    <p className="text-xs text-gray-500 mt-1">Abre un pedido, marca lo que llegó y confirma. Todo lo demás se registra internamente.</p>
                  </div>
                  <span className="rounded-full border border-gray-700 px-3 py-1 text-[11px] font-bold uppercase text-gray-400">{recepcionOrdenes.length} pendientes</span>
                </div>

                {recepcionOrdenes.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-sm font-bold text-white">Sin pedidos pendientes</p>
                    <p className="text-xs text-gray-500 mt-1">Cuando una orden tenga artículos por recibir aparecerá aquí.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {recepcionOrdenes.map((grupo) => (
                      <div key={grupo.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 hover:bg-white/[0.02]">
                        <div>
                          <p className="text-[11px] uppercase tracking-widest text-gray-500">Pedido</p>
                          <h3 className="text-lg font-display font-bold text-white">{grupo.orden?.folio || 'Sin folio'}</h3>
                          <p className="text-xs text-gray-400 mt-1">{grupo.orden?.proveedor || grupo.orden?.nombre_jugador || 'Proveedor general'} · {grupo.items.length} renglón(es) · {grupo.piezasPendientes} pieza(s) pendientes</p>
                        </div>
                        <button
                          onClick={() => {
                            setRecepcionOrdenAbiertaId(grupo.id);
                            setRecepcionSeleccion({});
                            setRecepcionIncidencia('Sin observaciones');
                            setRecepcionObservacionTexto('');
                            setRecepcionObservacionesAbiertas(false);
                          }}
                          className="rounded-xl bg-aztks-orange px-5 py-3 text-xs font-bold uppercase text-black hover:brightness-110"
                        >
                          Abrir recepción
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-800 bg-aztks-grey overflow-hidden">
                <div className="p-5 border-b border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <button
                      onClick={() => {
                        setRecepcionOrdenAbiertaId(null);
                        setRecepcionSeleccion({});
                        setRecepcionObservacionesAbiertas(false);
                      }}
                      className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 hover:text-white"
                    >
                      ← Regresar a pedidos
                    </button>
                    <p className="text-[11px] uppercase tracking-widest text-gray-500">Recepción de pedido</p>
                    <h3 className="text-2xl font-display font-bold text-white">{recepcionOrdenAbierta.orden?.folio || 'Sin folio'}</h3>
                    <p className="text-xs text-gray-400 mt-1">Marca lo que llegó. Si llegó todo, usa Seleccionar todo y Recibido.</p>
                  </div>
                  <button
                    disabled={inventarioBusy || seleccionadosOrdenAbierta.length === 0}
                    onClick={confirmarRecepcionSeleccionada}
                    className="rounded-xl bg-aztks-green px-6 py-4 text-xs font-bold uppercase text-black disabled:opacity-40"
                  >
                    Recibido
                  </button>
                </div>

                <div className="p-4 border-b border-gray-800 flex items-center justify-between gap-3 bg-[#121212]">
                  <label className="flex items-center gap-3 text-sm font-bold text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={todosSeleccionadosOrdenAbierta}
                      onChange={(e) => toggleSeleccionarOrdenCompleta(e.target.checked)}
                      className="h-5 w-5 accent-[#2ed573]"
                    />
                    Seleccionar todo
                  </label>
                  <span className="text-[11px] text-gray-500">{seleccionadosOrdenAbierta.length}/{itemsOrdenAbierta.length} seleccionados</span>
                </div>

                <div className="divide-y divide-gray-800">
                  {itemsOrdenAbierta.map((item) => {
                    const pendiente = Math.max(0, Number(item.cantidad || 0) - Number(item.cantidad_recibida || 0));
                    const draft = obtenerDraftRecepcion(item);
                    return (
                      <label key={item.id} className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-white/[0.03] ${draft.seleccionado ? 'bg-aztks-green/5' : ''}`}>
                        <input
                          type="checkbox"
                          disabled={inventarioBusy}
                          checked={Boolean(draft.seleccionado)}
                          onChange={(e) => actualizarDraftRecepcion(item, { seleccionado: e.target.checked, cantidad: pendiente || 1, estadoCalidad: 'Correcto', observaciones: '' })}
                          className="h-5 w-5 shrink-0 accent-[#2ed573]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white leading-tight">{item.tipo_prenda || 'Artículo'}{item.color ? ` · ${item.color}` : ''}{item.talla ? ` · Talla ${item.talla}` : ''}</p>
                          <p className="text-xs text-gray-500 mt-1">{pendiente} pieza(s) pendientes</p>
                        </div>
                        <span className="rounded-full border border-gray-700 px-3 py-1 text-[11px] font-bold text-gray-300">{pendiente}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="p-4 border-t border-gray-800 bg-[#121212]">
                  <button
                    type="button"
                    onClick={() => setRecepcionObservacionesAbiertas((value) => !value)}
                    className="text-xs font-bold uppercase tracking-wider text-aztks-orange hover:text-white"
                  >
                    {recepcionObservacionesAbiertas ? 'Ocultar observación' : '+ Observación opcional'}
                  </button>

                  {recepcionObservacionesAbiertas && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3">
                      <select
                        value={recepcionIncidencia}
                        onChange={(e) => setRecepcionIncidencia(e.target.value)}
                        className="rounded-xl border border-gray-700 bg-aztks-grey px-4 py-3 text-xs text-white outline-none focus:border-aztks-orange"
                      >
                        <option>Sin observaciones</option>
                        <option>Manchado</option>
                        <option>Dañado / roto</option>
                        <option>Talla equivocada</option>
                        <option>Color equivocado</option>
                        <option>Faltante</option>
                        <option>Producto equivocado</option>
                        <option>Otro</option>
                      </select>
                      <input
                        value={recepcionObservacionTexto}
                        onChange={(e) => setRecepcionObservacionTexto(normalizarTextoOperativo(e.target.value))}
                        placeholder="Ej. 1 playera llegó manchada; queda pendiente cambio con proveedor."
                        className="rounded-xl border border-gray-700 bg-aztks-grey px-4 py-3 text-xs text-white outline-none focus:border-aztks-orange"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : inventarioTab === 'salidas' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-1 rounded-2xl border border-gray-800 bg-aztks-grey p-5 space-y-4">
              <h3 className="font-bold uppercase text-sm text-white">Registrar salida interna</h3>
              <div><label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block">SKU</label><select className="w-full bg-[#121212] border border-gray-700 rounded-xl px-4 py-3 text-white text-xs" value={salidaForm.sku} onChange={(e) => setSalidaForm((prev) => ({ ...prev, sku: e.target.value }))}><option value="">Seleccionar...</option>{inventarioItems.filter((i) => i.activo !== false).map((i) => <option key={i.sku} value={i.sku}>{i.sku} · {i.nombre_producto} · Stock {i.stock_actual}</option>)}</select></div>
              <Input label="Cantidad" value={String(salidaForm.cantidad)} onChange={(v) => setSalidaForm((prev) => ({ ...prev, cantidad: v.replace(/\D/g, '') || '0' }))} placeholder="Cantidad" />
              <div><label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block">Motivo</label><select className="w-full bg-[#121212] border border-gray-700 rounded-xl px-4 py-3 text-white text-xs" value={salidaForm.motivo} onChange={(e) => setSalidaForm((prev) => ({ ...prev, motivo: e.target.value }))}>{MOTIVOS_SALIDA.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
              <Input label="Observaciones" value={salidaForm.observaciones} onChange={(v) => setSalidaForm((prev) => ({ ...prev, observaciones: v }))} transformOnBlur={normalizarTextoOperativo} placeholder="Detalle interno" />
              <button disabled={inventarioBusy} onClick={handleSalidaInterna} className="w-full rounded-xl bg-aztks-orange px-4 py-4 text-xs font-bold uppercase text-white disabled:opacity-50">Registrar salida</button>
            </div>
            <div className="lg:col-span-2 rounded-2xl border border-gray-800 bg-aztks-grey overflow-hidden">
              <div className="p-4 border-b border-gray-800"><h3 className="font-bold uppercase text-sm text-white">Kárdex reciente</h3></div>
              <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-[#121212] text-gray-400 uppercase"><tr><th className="p-3 text-left">Fecha</th><th className="p-3 text-left">SKU</th><th className="p-3 text-left">Tipo</th><th className="p-3 text-center">Cantidad</th><th className="p-3 text-left">Motivo</th></tr></thead><tbody>{movimientosVisibles.map((m) => <tr key={m.id || `${m.sku}-${m.fecha_movimiento}`} className="border-t border-gray-800"><td className="p-3 text-gray-500">{m.fecha_movimiento ? new Date(m.fecha_movimiento).toLocaleString('es-MX') : ''}</td><td className="p-3 font-bold text-white">{m.sku}</td><td className="p-3 text-gray-300">{m.tipo_movimiento}</td><td className="p-3 text-center text-white font-bold">{m.cantidad}</td><td className="p-3 text-gray-400">{m.motivo}</td></tr>)}</tbody></table></div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-800 bg-aztks-grey overflow-hidden">
            <div className="p-5 border-b border-gray-800 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div><h3 className="font-bold uppercase text-sm text-white">Historial de movimientos</h3><p className="text-xs text-gray-500 mt-1">Kárdex general con filtros rápidos. No muestra todo al mismo tiempo para evitar pantallas saturadas.</p></div>
                <span className="rounded-full border border-gray-700 px-3 py-1 text-[10px] font-bold uppercase text-gray-400">{movimientosFiltrados.length} movimientos</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select className="bg-[#121212] border border-gray-700 rounded-xl px-4 py-3 text-white text-xs" value={movimientoFiltros.mes} onChange={(e) => setMovimientoFiltros((prev) => ({ ...prev, mes: e.target.value }))}><option value="actual">Mes actual</option><option value="todos">Todos los meses</option></select>
                <select className="bg-[#121212] border border-gray-700 rounded-xl px-4 py-3 text-white text-xs" value={movimientoFiltros.tipo} onChange={(e) => setMovimientoFiltros((prev) => ({ ...prev, tipo: e.target.value }))}>{tiposMovimiento.map((tipo) => <option key={tipo} value={tipo}>{tipo === 'todos' ? 'Todos los movimientos' : tipo}</option>)}</select>
                <input className="bg-[#121212] border border-gray-700 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-aztks-orange" value={movimientoFiltros.busqueda} onChange={(e) => setMovimientoFiltros((prev) => ({ ...prev, busqueda: e.target.value }))} placeholder="Buscar SKU, folio, motivo o usuario" />
              </div>
            </div>
            <div className="p-4 space-y-3">
              {Object.keys(movimientosPorMes).length === 0 ? <div className="p-8 text-center text-gray-500 text-sm">No hay movimientos con esos filtros.</div> : Object.entries(movimientosPorMes).map(([mes, movimientos]) => (
                <details key={mes} open className="rounded-2xl border border-gray-800 bg-[#121212] overflow-hidden">
                  <summary className="cursor-pointer px-4 py-3 flex items-center justify-between text-sm font-bold uppercase text-white"><span>{mes}</span><span className="text-[10px] text-gray-500">••• {movimientos.length}</span></summary>
                  <div className="divide-y divide-gray-800">
                    {movimientos.map((m) => (
                      <div key={m.id || `${m.sku}-${m.fecha_movimiento}`} className="p-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                        <div><p className="text-xs font-bold text-white">{m.tipo_movimiento} · {m.sku || 'N/A'}</p><p className="text-[11px] text-gray-500 mt-1">{m.producto || ''} {m.color ? `· ${m.color}` : ''} {m.talla ? `· ${m.talla}` : ''}</p><p className="text-xs text-gray-300 mt-2">{m.motivo}</p>{m.observaciones && <p className="text-[11px] text-yellow-200 mt-1">Obs: {m.observaciones}</p>}</div>
                        <div className="text-left md:text-right text-[11px] text-gray-500"><p>{m.fecha_movimiento ? new Date(m.fecha_movimiento).toLocaleString('es-MX') : ''}</p><p className="text-white font-bold mt-1">Cantidad: {m.cantidad}</p>{m.saldo_nuevo !== null && m.saldo_nuevo !== undefined && <p>Saldo: {m.saldo_anterior ?? '-'} → {m.saldo_nuevo}</p>}<p>{m.registrado_por || 'Sistema'}</p>{m.folio_relacionado && <p className="text-aztks-green">{m.folio_relacionado}</p>}</div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
              {movimientosFiltrados.length > movimientosLimit && <button onClick={() => setMovimientosLimit((prev) => prev + 20)} className="w-full rounded-xl border border-gray-700 px-4 py-3 text-xs font-bold uppercase text-gray-300 hover:border-aztks-green hover:text-white">Ver más movimientos</button>}
            </div>
          </div>
        )}

        {recepcionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-gray-700 bg-aztks-grey shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-gray-800 flex items-start justify-between gap-4">
                <div><p className="text-[10px] uppercase tracking-widest text-gray-500">Recepción parcial</p><h3 className="text-lg font-bold text-white">{recepcionModal.tipo_prenda} · {recepcionModal.color}</h3><p className="text-xs text-gray-400">{recepcionModal.orden?.folio || 'Sin folio'} · SKU {recepcionModal.sku || 'N/A'} · Talla {recepcionModal.talla}</p></div>
                <button onClick={() => setRecepcionModal(null)} className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-400 hover:text-white">Cerrar</button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded-xl bg-[#121212] p-3"><p className="text-gray-500 uppercase font-bold">Pedido</p><p className="text-white font-bold">{recepcionModal.cantidad}</p></div>
                  <div className="rounded-xl bg-[#121212] p-3"><p className="text-gray-500 uppercase font-bold">Recibido</p><p className="text-white font-bold">{recepcionModal.cantidad_recibida || 0}</p></div>
                  <div className="rounded-xl bg-[#121212] p-3"><p className="text-gray-500 uppercase font-bold">Pendiente</p><p className="text-white font-bold">{Math.max(0, Number(recepcionModal.cantidad || 0) - Number(recepcionModal.cantidad_recibida || 0))}</p></div>
                </div>
                <Input label="Cantidad recibida ahora" value={String(recepcionForm.cantidad)} onChange={(v) => setRecepcionForm((prev) => ({ ...prev, cantidad: v.replace(/\D/g, '') || '0' }))} placeholder="Cantidad" />
                <div><label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block">Estado de recepción</label><select className="w-full bg-[#121212] border border-gray-700 rounded-xl px-4 py-3 text-white text-xs" value={recepcionForm.estadoCalidad} onChange={(e) => setRecepcionForm((prev) => ({ ...prev, estadoCalidad: e.target.value }))}>{ESTADOS_CALIDAD_RECEPCION.map((estado) => <option key={estado} value={estado}>{estado}</option>)}</select></div>
                <Input label="Observaciones" value={recepcionForm.observaciones} onChange={(v) => setRecepcionForm((prev) => ({ ...prev, observaciones: v }))} transformOnBlur={normalizarTextoOperativo} placeholder="Ej. llegó manchada, talla equivocada, faltan piezas..." />
                {recepcionForm.estadoCalidad !== 'Correcto' && <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-100">Esta recepción quedará registrada como no conforme. Si es stock, no entrará al inventario disponible hasta hacer ajuste manual.</div>}
                <button disabled={inventarioBusy} onClick={confirmarRecepcionParcial} className="w-full rounded-xl bg-aztks-green px-4 py-4 text-xs font-bold uppercase text-black disabled:opacity-50">Confirmar entrega recibida</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderItemMatriz = (talla) => {
    if (modoPlayera === 'paquete') {
      const qty = cantidadesPaquetes[talla] || 0;
      const isActive = qty > 0;
      return (
        <div key={talla} className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${isActive ? 'border-aztks-green bg-aztks-green/5 shadow-[0_0_15px_rgba(74,222,128,0.1)]' : 'border-gray-800 bg-[#121212] hover:border-gray-700'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 flex items-center justify-center rounded-full font-bold transition-all ${isActive ? 'bg-aztks-green text-black' : 'bg-gray-800 text-gray-500'}`}>{talla}</div>
            <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-white' : 'text-gray-500'}`}>Set x3</span>
          </div>
          <div className={`flex items-center rounded-lg border transition-all ${isActive ? 'border-aztks-green bg-aztks-green/10' : 'border-gray-700 bg-[#1a1a1a]'}`}>
            <button onClick={() => updatePaquete(talla, -1)} className="px-3 py-1 text-gray-400 hover:text-white">-</button>
            <span className={`w-6 text-center font-bold text-sm ${isActive ? 'text-aztks-green' : 'text-gray-500'}`}>{qty}</span>
            <button onClick={() => updatePaquete(talla, 1)} className="px-3 py-1 text-gray-400 hover:text-white">+</button>
          </div>
        </div>
      );
    }

    const qtyAzul = cantidadesSueltas.Azul?.[talla] || 0;
    const qtyAma = cantidadesSueltas.Amarilla?.[talla] || 0;
    const qtyNeg = cantidadesSueltas.Negra?.[talla] || 0;
    const total = qtyAzul + qtyAma + qtyNeg;
    const isActive = total > 0;

    return (
      <div key={talla} className={`flex flex-col xl:flex-row items-center justify-between p-3 rounded-xl border transition-all duration-300 gap-4 ${isActive ? 'border-aztks-orange bg-aztks-orange/5' : 'border-gray-800 bg-[#121212] hover:border-gray-700'}`}>
        <div className={`w-12 h-12 shrink-0 flex items-center justify-center rounded-full font-bold ${isActive ? 'bg-aztks-orange text-white' : 'bg-gray-800 text-gray-500'}`}>{talla}</div>
        <div className="flex flex-col sm:flex-row justify-center gap-2 w-full xl:w-auto">
          <ColorCounter color="Azul" tone="blue" value={qtyAzul} onMinus={() => updateSuelta('Azul', talla, -1)} onPlus={() => updateSuelta('Azul', talla, 1)} />
          <ColorCounter color="Amarilla" tone="yellow" value={qtyAma} onMinus={() => updateSuelta('Amarilla', talla, -1)} onPlus={() => updateSuelta('Amarilla', talla, 1)} />
          <ColorCounter color="Negra" tone="gray" value={qtyNeg} onMinus={() => updateSuelta('Negra', talla, -1)} onPlus={() => updateSuelta('Negra', talla, 1)} />
        </div>
      </div>
    );
  };

  const renderDocumentPreview = (modoExportacion = false) => (
    <div
      id={modoExportacion ? 'ticket-render-preview' : undefined}
      className={modoExportacion ? '' : 'rounded-2xl overflow-hidden shadow-2xl border border-gray-800'}
      style={{
        width: modoExportacion ? '794px' : '100%',
        minHeight: modoExportacion ? '1123px' : 'auto',
        background: '#ffffff',
        color: '#111827',
        fontFamily: 'Arial, Helvetica, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      {configExport.mostrarCabecera && (
        <div style={{ height: modoExportacion ? '150px' : '165px', background: 'linear-gradient(135deg,#0d0d0d,#1a1a1a)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.32, background: 'radial-gradient(circle at 25% 15%,#f05a28 0,transparent 28%), radial-gradient(circle at 75% 30%,#2ecc71 0,transparent 22%)' }} />
          <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {configExport.mostrarLogo && (
              <img
                src={logoAztks}
                alt="AZTKS"
                style={{
                  width: configExport.logoCabeceraCompleta ? '100%' : (modoExportacion ? '190px' : '180px'),
                  height: configExport.logoCabeceraCompleta ? '100%' : 'auto',
                  maxWidth: configExport.logoCabeceraCompleta ? 'none' : '220px',
                  objectFit: configExport.logoCabeceraCompleta ? 'cover' : 'contain',
                  opacity: configExport.logoCabeceraCompleta ? 0.92 : 1,
                }}
              />
            )}
          </div>
        </div>
      )}
      <div style={{ height: '5px', background: '#f05a28' }} />

      <main style={{ padding: modoExportacion ? '34px 42px 30px' : '34px 32px 30px' }}>
        <section style={{ textAlign: 'center', marginBottom: '26px' }}>
          <h1 style={{ margin: 0, fontSize: modoExportacion ? '24px' : '22px', letterSpacing: '5px', textTransform: 'uppercase', color: '#1f2937' }}>Orden de compra</h1>
          <p style={{ margin: '12px 0 0', color: '#6b7280', fontSize: '12px', fontWeight: 700 }}>Folio: {resumenOrden.folioTemporal} · {fechaLegible(fechaPedido)}</p>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '16px', columnGap: '22px', padding: '22px 0', borderTop: '1px dashed #d1d5db', borderBottom: '1px dashed #d1d5db' }}>
          {configExport.mostrarDeportista && <PreviewDato label="Jugador" value={tipoPedido === 'jugador' ? nombreJugador || 'Pendiente' : 'Stock almacén'} />}
          {configExport.mostrarTutor && tipoPedido === 'jugador' && <PreviewDato label="Responsable" value={responsableDeportista || 'Pendiente'} right />}
          {configExport.mostrarCategoriaRama && <PreviewDato label="Categoría" value={`${resumenOrden.categoria} ${resumenOrden.rama}`} />}
          {configExport.mostrarNumero && <PreviewDato label="Número" value={resumenOrden.numero !== null && resumenOrden.numero !== undefined ? `#${resumenOrden.numero}` : 'S/N'} right accent />}
          {configExport.mostrarEstampado && tipoPedido === 'jugador' && <PreviewDato label="Nombre en jersey" value={nombreJerseyEspalda || 'Pendiente'} />}
          {configExport.mostrarProveedor && <PreviewDato label="Proveedor" value={proveedor || 'Pendiente'} right />}
          {configExport.mostrarTiempos && <PreviewDato label="Entrega acordada" value={fechaEntregaAcordada ? fechaLegible(fechaEntregaAcordada) : 'Pendiente'} />}
          {configExport.mostrarLugarEntrega && <PreviewDato label="Lugar de entrega" value={lugarEntrega || 'Pendiente'} right />}
        </section>

        <section style={{ marginTop: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #111827', paddingBottom: '12px', marginBottom: '12px' }}>
            <h2 style={{ margin: 0, color: '#6b7280', fontSize: '13px', letterSpacing: '1.8px', textTransform: 'uppercase' }}>Detalle de prendas</h2>
            <span style={{ color: '#9ca3af', fontSize: '11px' }}>{resumenOrden.totalPrendas} piezas</span>
          </div>

          {carrito.length === 0 ? (
            <div style={{ padding: '28px 0', color: '#9ca3af', fontSize: '13px', textAlign: 'center' }}>Sin artículos agregados.</div>
          ) : (
            carrito.map((item) => (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #edf0f3' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#111827', fontSize: '14px' }}>{item.cantidad}x {item.tipo}</div>
                  <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '5px' }}>{item.formato} · {item.color}</div>
                  {configExport.mostrarSkus && item.sku && <div style={{ color: '#9ca3af', fontSize: '10px', marginTop: '5px', fontFamily: 'monospace' }}>{item.sku}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'inline-block', padding: '8px 12px', borderRadius: '8px', background: '#f3f4f6', fontSize: '12px', fontWeight: 900, color: '#111827' }}>Talla {item.talla}</span>
                  {configExport.mostrarPrecios && <div style={{ marginTop: '8px', color: '#2ecc71', fontSize: '12px', fontWeight: 800 }}>{dinero(item.subtotal || 0)}</div>}
                </div>
              </div>
            ))
          )}
        </section>

        {configExport.mostrarPrecios && (
          <section style={{ marginTop: '26px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '230px', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px', background: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280', fontSize: '12px', marginBottom: '8px' }}><span>Subtotal</span><strong>{dinero(resumenOrden.subtotal)}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280', fontSize: '12px', marginBottom: '12px' }}><span>Envío</span><strong>Por calcular</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #d1d5db', paddingTop: '12px', fontSize: '15px' }}><span style={{ fontWeight: 900 }}>Total</span><strong style={{ color: '#f05a28' }}>{dinero(resumenOrden.total)}</strong></div>
            </div>
          </section>
        )}

        {configExport.mostrarPie && <p style={{ marginTop: '42px', textAlign: 'center', color: '#9ca3af', fontSize: '10px', letterSpacing: '0.8px' }}>Generado por SOC_AZTKS · Portal Administrativo</p>}
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-aztks-black text-aztks-white p-4 md:p-8 font-sans pb-24">
      {currentScreen !== 0 && currentScreen !== 'MENU' && (
        <button
          type="button"
          onClick={irAlMenuPrincipal}
          className="fixed bottom-4 left-4 z-[80] rounded-2xl border border-gray-700 bg-[#111111]/95 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-300 shadow-2xl backdrop-blur transition hover:border-aztks-green hover:text-aztks-green md:top-6 md:left-6 md:bottom-auto"
          title="Regresar directo al menú principal"
        >
          <ArrowLeft className="mr-2 inline h-4 w-4" /> Menú principal
        </button>
      )}
      <div className="max-w-7xl mx-auto">
        {currentScreen === 0 && (
          <div className="min-h-[80vh] flex flex-col justify-center items-center">
            <div className="w-full max-w-md bg-aztks-grey rounded-2xl shadow-2xl border border-gray-800 p-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 mx-auto h-24 w-56 rounded-full bg-aztks-green/20 blur-2xl animate-pulse" />
                <img src={logoAztks} alt="AZTKS" className="relative h-20 mx-auto drop-shadow-[0_0_22px_rgba(46,204,113,0.45)]" />
              </div>
              <h1 className="text-4xl font-display font-bold text-center mb-2">SOC_<span className="text-aztks-orange">AZTKS</span></h1>
              <p className="text-center text-[11px] uppercase tracking-[0.35em] text-gray-500 mb-6">Sistema privado</p>
              {loginError && <div className="mb-4 p-3 bg-red-950/50 text-red-200 rounded-xl text-xs text-center border border-red-500 font-bold">{loginError}</div>}
              {authStep === 1 ? (
                <form onSubmit={handleCheckUser} className="space-y-6">
                  <input type="tel" maxLength="10" required placeholder="Número de celular" className="w-full bg-[#121212] border border-gray-700 rounded-xl p-4 text-center text-white" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
                  <button type="submit" disabled={loginLoading} className="w-full bg-aztks-orange py-4 rounded-xl font-bold tracking-wide uppercase text-sm">{loginLoading ? 'Procesando...' : 'Verificar acceso'}</button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-6">
                  <div className="text-center space-y-1">
                    <p className="text-aztks-green font-bold text-sm uppercase tracking-wider">Acceso identificado</p>
                    <p className="text-gray-400 text-xs">Ingresa tu PIN de acceso</p>
                  </div>
                  <input type="text" maxLength="6" required placeholder="PIN" className="w-full bg-[#121212] border border-gray-700 rounded-xl p-4 text-center text-2xl tracking-[0.5em] text-white" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
                  <button type="submit" disabled={loginLoading} className="w-full bg-aztks-green text-black py-4 rounded-xl font-bold tracking-wide uppercase text-sm disabled:opacity-50">{loginLoading ? 'Validando...' : 'Ingresar'}</button>
                  <button type="button" onClick={() => { setAuthStep(1); setIdentifiedUser(null); setOtp(''); }} className="w-full text-gray-500 hover:text-white text-xs font-bold uppercase tracking-wider">Cambiar número</button>
                </form>
              )}
            </div>
          </div>
        )}

        {currentScreen === 'MENU' && (
          <div className="min-h-[70vh] flex flex-col justify-center items-center animate-in fade-in">
            <div className="w-full flex justify-end mb-6">
              <button onClick={handleLogout} className="rounded-xl border border-gray-800 px-4 py-2 text-xs font-bold uppercase text-gray-500 hover:text-white flex items-center gap-2">
                <LogOut className="w-4 h-4" /> Salir
              </button>
            </div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-display font-bold text-white tracking-widest">Hola, {adminName || 'Usuario'}</h2>
              <p className="text-aztks-green font-bold mt-2">Bienvenido a SOC_AZTKS</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full max-w-5xl">
              {usuarioTienePermiso(currentUser, 'crear_orden') && (
                <button onClick={() => setCurrentScreen(1)} className="bg-aztks-grey border border-gray-700 hover:border-aztks-orange rounded-2xl p-8 flex flex-col items-center shadow-xl">
                  <div className="w-16 h-16 bg-[#121212] rounded-full flex justify-center items-center mb-4"><Plus className="w-8 h-8 text-aztks-orange" /></div>
                  <h3 className="font-bold text-lg text-white uppercase tracking-wider mb-2">Nueva orden</h3>
                  <p className="text-xs text-gray-400 text-center">Capturar una orden de compra para proveedor o pedido personalizado.</p>
                </button>
              )}
              {usuarioTienePermiso(currentUser, 'ver_panel_admin') && (
                <button onClick={() => setCurrentScreen('DASHBOARD')} className="bg-aztks-grey border border-gray-700 hover:border-aztks-green rounded-2xl p-8 flex flex-col items-center shadow-xl">
                  <div className="w-16 h-16 bg-[#121212] rounded-full flex justify-center items-center mb-4"><Layers className="w-8 h-8 text-aztks-green" /></div>
                  <h3 className="font-bold text-lg text-white uppercase tracking-wider mb-2">Monitor logístico</h3>
                  <p className="text-xs text-gray-400 text-center">Gestionar estatus, inventarios, Kárdex y almacén.</p>
                </button>
              )}
              {usuarioTienePermiso(currentUser, 'gestionar_inventario') && (
                <button onClick={() => setCurrentScreen('INVENTARIO')} className="bg-aztks-grey border border-gray-700 hover:border-yellow-400 rounded-2xl p-8 flex flex-col items-center shadow-xl">
                  <div className="w-16 h-16 bg-[#121212] rounded-full flex justify-center items-center mb-4"><ShoppingCart className="w-8 h-8 text-yellow-400" /></div>
                  <h3 className="font-bold text-lg text-white uppercase tracking-wider mb-2">Inventario</h3>
                  <p className="text-xs text-gray-400 text-center">Entradas por recepción, salidas internas, semáforo y pre-orden.</p>
                </button>
              )}
              {currentUser?.rol === 'super_admin' && usuarioTienePermiso(currentUser, 'gestionar_usuarios') && (
                <button onClick={() => setCurrentScreen('ACCESOS')} className="bg-aztks-grey border border-gray-700 hover:border-blue-400 rounded-2xl p-8 flex flex-col items-center shadow-xl">
                  <div className="w-16 h-16 bg-[#121212] rounded-full flex justify-center items-center mb-4"><ShieldCheck className="w-8 h-8 text-blue-400" /></div>
                  <h3 className="font-bold text-lg text-white uppercase tracking-wider mb-2">Administración de accesos</h3>
                  <p className="text-xs text-gray-400 text-center">Crear usuarios, asignar PIN, roles, permisos y accesos temporales.</p>
                </button>
              )}
            </div>
          </div>
        )}

        {currentScreen === 'DASHBOARD' && <AdminDashboard onVolver={() => setCurrentScreen('MENU')} />}

        {currentScreen === 'INVENTARIO' && renderInventarioScreen()}

        {currentScreen === 'ACCESOS' && <SuperAdminAccessPanel currentUser={currentUser} onVolver={() => setCurrentScreen('MENU')} />}

        {currentScreen === 1 && (
          <div className="max-w-xl mx-auto bg-aztks-grey rounded-2xl border border-gray-800 p-8 mt-10 shadow-2xl relative">
            <button onClick={() => setCurrentScreen('MENU')} className="absolute top-4 left-4 text-gray-500 hover:text-white text-xs uppercase font-bold tracking-wider flex items-center"><ArrowLeft className="w-4 h-4 mr-1" /> Menú</button>
            <h2 className="text-2xl font-display font-bold mb-6 mt-4 text-center text-white">Orden de compra</h2>

            <div className="flex bg-[#121212] p-1 rounded-xl mb-6 border border-gray-700">
              <button onClick={() => setTipoPedido('jugador')} className={`flex-1 py-3 rounded-lg font-bold flex justify-center text-sm ${tipoPedido === 'jugador' ? 'bg-aztks-orange text-white' : 'text-gray-400'}`}>Personalizado</button>
              <button onClick={() => { setTipoPedido('stock'); setNombreJugador(''); }} className={`flex-1 py-3 rounded-lg font-bold flex justify-center text-sm ${tipoPedido === 'stock' ? 'bg-aztks-orange text-white' : 'text-gray-400'}`}>Stock</button>
            </div>

            {tipoPedido === 'jugador' && (
              <div className="mb-6 space-y-4 text-xs">
                <Input label="Nombre del deportista" value={nombreJugador} onChange={setNombreJugador} transformOnBlur={capitalizarNombrePropio} placeholder="Nombre completo del atleta" />
                <Input label="Responsable / tutor del deportista" value={responsableDeportista} onChange={setResponsableDeportista} transformOnBlur={capitalizarNombrePropio} placeholder="Nombre completo del padre o tutor" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block uppercase text-gray-400 font-bold mb-1">Tipo de solicitud</label>
                    <select className="w-full bg-[#121212] border border-gray-700 rounded-xl px-4 py-3 text-white" value={tipoSolicitud} onChange={(e) => setTipoSolicitud(e.target.value)}>
                      <option value="Nuevo Ingreso">Nuevo ingreso</option>
                      <option value="Reposición">Reposición</option>
                    </select>
                  </div>
                  <Input label="Nombre en jersey" value={nombreJerseyEspalda} onChange={setNombreJerseyEspalda} transformOnBlur={normalizarNombreJersey} placeholder="Ej. Apellido" />
                </div>
              </div>
            )}

            <button disabled={tipoPedido === 'jugador' && (!nombreJugador || !responsableDeportista || !nombreJerseyEspalda)} onClick={() => setCurrentScreen(2)} className="w-full bg-aztks-green text-black font-bold py-4 rounded-xl disabled:opacity-50 text-sm flex justify-center items-center">Siguiente</button>
          </div>
        )}

        {currentScreen === 2 && (
          <div className="space-y-6 mt-4 max-w-5xl mx-auto animate-in fade-in">
            <h2 className="text-2xl font-display font-bold text-white border-b border-gray-800 pb-2">Selección de artículos</h2>
            <div className="bg-aztks-grey rounded-2xl border border-gray-800 p-6 shadow-xl space-y-4">
              <div className="border border-gray-700 rounded-xl overflow-hidden">
                <button onClick={() => setSeccionAbierta(seccionAbierta === 'playeras' ? '' : 'playeras')} className="w-full p-4 bg-[#121212] font-bold flex justify-between items-center"><span className="flex items-center text-sm uppercase tracking-wide"><Layers className="w-5 h-5 mr-3 text-aztks-green" /> Línea de entrenamiento (Stock)</span><ChevronDown className="w-5 h-5 text-gray-500" /></button>
                {seccionAbierta === 'playeras' && (
                  <div className="p-4 bg-[#0a0a0a] space-y-6">
                    <div className="flex gap-2 max-w-md mx-auto mb-6">
                      <button onClick={() => setModoPlayera('paquete')} className={`flex-1 py-3 border rounded-lg text-xs font-bold transition-all ${modoPlayera === 'paquete' ? 'border-aztks-green text-aztks-green bg-aztks-green/5' : 'border-gray-700 text-gray-400'}`}>Paquetes (3 colores)</button>
                      <button onClick={() => setModoPlayera('suelta')} className={`flex-1 py-3 border rounded-lg text-xs font-bold transition-all ${modoPlayera === 'suelta' ? 'border-aztks-orange text-aztks-orange bg-aztks-orange/5' : 'border-gray-700 text-gray-400'}`}>Unidades individuales</button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto pr-2 pb-4">
                      <div className="space-y-3"><h4 className="text-center text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Tallas juveniles</h4>{TALLAS_PLAYERAS_NINOS.map((talla) => renderItemMatriz(talla))}</div>
                      <div className="space-y-3"><h4 className="text-center text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Tallas adulto</h4>{TALLAS_PLAYERAS_ADULTOS.map((talla) => renderItemMatriz(talla))}</div>
                    </div>
                    <div className="pt-4 border-t border-gray-800">
                      {modoPlayera === 'paquete' ? (
                        <button disabled={totalPaquetes === 0} onClick={agregarPlayeraAlCarrito} className="w-full bg-aztks-green text-black py-4 rounded-xl font-bold flex justify-center items-center text-sm uppercase tracking-wider disabled:opacity-50"><ShoppingCart className="w-5 h-5 mr-2" /> Añadir paquetes al carrito</button>
                      ) : (
                        <button disabled={totalSueltas === 0} onClick={agregarPlayeraAlCarrito} className="w-full bg-aztks-orange text-white py-4 rounded-xl font-bold flex justify-center items-center text-sm uppercase tracking-wider disabled:opacity-50"><ShoppingCart className="w-5 h-5 mr-2" /> Añadir unidades al carrito</button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {tipoPedido === 'jugador' && (
                <div className="border border-gray-700 rounded-xl overflow-hidden">
                  <button onClick={() => setSeccionAbierta(seccionAbierta === 'jersey' ? '' : 'jersey')} className="w-full p-4 bg-[#121212] font-bold flex justify-between items-center"><span className="flex items-center text-sm uppercase tracking-wide"><Shirt className="w-5 h-5 mr-3 text-aztks-orange" /> Uniforme oficial (Bajo pedido)</span><ChevronDown className="w-5 h-5 text-gray-500" /></button>
                  {seccionAbierta === 'jersey' && (
                    <div className="p-4 bg-[#0a0a0a] space-y-6">
                      <div className="grid grid-cols-2 gap-4 bg-[#121212] p-4 rounded-xl border border-gray-700">
                        <Select label="Categoría" value={categoriaUniforme} onChange={setCategoriaUniforme} options={CATEGORIAS} />
                        <Select label="Rama" value={ramaUniforme} onChange={setRamaUniforme} options={['Varonil', 'Femenil']} />
                      </div>
                      {categoriaUniforme && ramaUniforme && (
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-gray-500 block">Número dorsal</label>
                          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 max-h-32 overflow-y-auto p-2 bg-[#121212] rounded-xl border border-gray-700">
                            {Array.from({ length: 100 }, (_, i) => {
                              const isOcupado = numerosOcupados.includes(i);
                              const isSeleccionado = numeroSeleccionado === i;
                              return <button key={i} disabled={isOcupado} onClick={() => setNumeroSeleccionado(i)} className={`py-1.5 rounded-lg font-bold border text-xs ${isOcupado ? 'bg-red-950/20 text-red-500/30' : isSeleccionado ? 'bg-aztks-orange text-white' : 'bg-[#1a1a1a] text-white'}`}>{i.toString().padStart(2, '0')}</button>;
                            })}
                          </div>
                        </div>
                      )}
                      {numeroSeleccionado !== null && (
                        <div className="space-y-4 pt-4 border-t border-gray-800">
                          <div className="grid grid-cols-2 gap-2 bg-[#121212] p-2 rounded-xl border border-gray-700">
                            <button type="button" onClick={() => setModoUniformeJuego('paquete')} className={`py-3 rounded-lg text-xs font-bold uppercase ${modoUniformeJuego === 'paquete' ? 'bg-aztks-orange text-white' : 'bg-[#0b0b0b] text-gray-400'}`}>Paquete de juego</button>
                            <button type="button" onClick={() => setModoUniformeJuego('pieza')} className={`py-3 rounded-lg text-xs font-bold uppercase ${modoUniformeJuego === 'pieza' ? 'bg-aztks-orange text-white' : 'bg-[#0b0b0b] text-gray-400'}`}>Pieza individual</button>
                          </div>
                          {modoUniformeJuego === 'pieza' && <Select value={colorJersey} onChange={setColorJersey} options={['Oscuro', 'Tricolor']} placeholder="Color jersey..." full />}
                          <Select value={tallaJersey} onChange={setTallaJersey} options={TALLAS_UNIFORME} placeholder={modoUniformeJuego === 'paquete' ? 'Talla de jerseys...' : 'Talla jersey...'} full />
                          <Select value={tallaShort} onChange={setTallaShort} options={TALLAS_UNIFORME} placeholder="Talla short..." full />
                          <button type="button" disabled={modoUniformeJuego === 'paquete' ? (!tallaJersey || !tallaShort) : (!tallaJersey && !tallaShort)} onClick={agregarUniformeAlCarrito} className="w-full bg-aztks-orange py-3.5 rounded-xl font-bold text-xs uppercase disabled:opacity-50">{modoUniformeJuego === 'paquete' ? 'Añadir paquete: 2 jerseys + 1 short' : 'Añadir pieza seleccionada'}</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {carrito.length > 0 && (
              <div className="bg-[#121212] rounded-2xl border border-gray-800 p-5 shadow-xl">
                <h3 className="text-xs uppercase font-bold text-aztks-green mb-3 border-b border-gray-800 pb-2">Artículos en la orden ({carrito.length})</h3>
                {carrito.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-[#1a1a1a] p-3 rounded-xl mb-2 text-sm border border-gray-800">
                    <div>
                      <p className="font-bold text-white">{item.cantidad}x {item.tipo}</p>
                      <p className="text-gray-400 text-xs mt-1">Especificación: {item.color} | Talla: <span className="text-white font-bold">{item.talla}</span> {item.numero !== null && item.numero !== undefined && <span className="text-aztks-orange ml-3 font-bold">Dorsal: #{item.numero}</span>}</p>
                    </div>
                    <button onClick={() => eliminarDelCarrito(item.id)} className="text-gray-500 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center mt-8 border-t border-gray-800 pt-4">
              <button onClick={() => setCurrentScreen(1)} className="text-gray-400 text-xs font-bold uppercase"><ArrowLeft className="w-4 h-4 mr-2 inline" />Volver</button>
              <button disabled={carrito.length === 0} onClick={() => setCurrentScreen(3)} className="bg-aztks-green text-black font-bold py-3.5 px-8 rounded-xl text-xs uppercase disabled:opacity-50">Siguiente</button>
            </div>
          </div>
        )}

        {currentScreen === 3 && (
          <div className="mt-4 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-800 pb-5">
              <div>
                <button onClick={() => setCurrentScreen(2)} className="text-gray-500 hover:text-white text-xs uppercase font-bold tracking-wider flex items-center mb-2"><ArrowLeft className="w-4 h-4 mr-1" /> Volver a prendas</button>
                <h2 className="text-2xl font-display font-bold uppercase tracking-widest text-white">Centro de salida documental</h2>
                <p className="text-sm text-gray-500 mt-1">Configura qué datos se muestran antes de descargar, enviar o guardar.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                {(ordenGuardada?.folio || folioOficialActual || mensajeGuardado) && (
                  <div className="rounded-xl border border-aztks-green/30 bg-aztks-green/10 px-4 py-2 text-xs font-bold text-aztks-green">
                    {mensajeGuardado || `Orden guardada · ${ordenGuardada?.folio || folioOficialActual}`}
                  </div>
                )}
                <button onClick={handleGuardarEnNube} disabled={isSaving || !!ordenGuardada?.id} className="bg-aztks-orange hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-wider shadow-lg shadow-orange-900/20">{isSaving ? 'Guardando...' : (ordenGuardada?.folio || folioOficialActual ? 'Orden guardada' : 'Guardar orden')}</button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              <aside className="xl:col-span-4 space-y-5">
                <div className="bg-aztks-grey border border-gray-800 rounded-2xl p-5 shadow-xl">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">Canal de salida</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['PDF', 'WhatsApp Web', 'Outlook', 'Gmail', 'Excel'].map((canal) => (
                      <button key={canal} onClick={() => setCanalSalida(canal)} className={`rounded-xl border px-3 py-3 text-xs font-bold uppercase ${canalSalida === canal ? 'border-aztks-orange bg-aztks-orange/10 text-aztks-orange' : 'border-gray-800 bg-[#121212] text-gray-500'}`}>{canal}</button>
                    ))}
                  </div>
                </div>

                <div className="bg-aztks-grey border border-gray-800 rounded-2xl p-5 shadow-xl">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">Opciones de Excel</h3>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setExcelOptions((prev) => ({ ...prev, modo: 'normal' }))}
                      className={`rounded-xl border px-3 py-3 text-xs font-bold uppercase ${excelOptions.modo === 'normal' ? 'border-aztks-green bg-aztks-green/10 text-aztks-green' : 'border-gray-800 bg-[#121212] text-gray-500'}`}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => setExcelOptions((prev) => ({ ...prev, modo: 'economico', referenciasVisuales: false }))}
                      className={`rounded-xl border px-3 py-3 text-xs font-bold uppercase ${excelOptions.modo === 'economico' ? 'border-aztks-orange bg-aztks-orange/10 text-aztks-orange' : 'border-gray-800 bg-[#121212] text-gray-500'}`}
                    >
                      Económico
                    </button>
                  </div>
                  <div className="space-y-3">
                    <ToggleOption
                      label="Mostrar referencias visuales"
                      checked={excelOptions.referenciasVisuales && excelOptions.modo !== 'economico'}
                      disabled={excelOptions.modo === 'economico'}
                      onClick={() => setExcelOptions((prev) => ({ ...prev, referenciasVisuales: !prev.referenciasVisuales }))}
                    />
                    <ToggleOption
                      label="Escala de grises"
                      checked={excelOptions.escalaGrises}
                      onClick={() => setExcelOptions((prev) => ({ ...prev, escalaGrises: !prev.escalaGrises }))}
                    />
                  </div>
                </div>

                <div className="bg-aztks-grey border border-gray-800 rounded-2xl p-5 shadow-xl">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">Presets rápidos</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(CONFIG_PRESETS).map((preset) => (
                      <button key={preset} onClick={() => aplicarPreset(preset)} className="rounded-xl border border-gray-800 bg-[#121212] hover:border-aztks-green px-3 py-3 text-xs font-bold uppercase text-gray-400 hover:text-white">{preset}</button>
                    ))}
                  </div>
                </div>

                <div className="bg-aztks-grey border border-gray-800 rounded-2xl p-5 shadow-xl space-y-5">
                  {CONFIG_GROUPS.map((grupo) => (
                    <div key={grupo.title}>
                      <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">{grupo.title}</h4>
                      <div className="space-y-3">
                        {grupo.keys.map(([key, label]) => (
                          <button key={key} type="button" onClick={() => toggleConfig(key)} className="w-full flex items-center justify-between rounded-xl border border-gray-800 bg-[#121212] px-4 py-3 text-left">
                            <span className={`text-xs font-bold ${configExport[key] ? 'text-white' : 'text-gray-500'}`}>{label}</span>
                            <span className={`w-9 h-5 rounded-full border flex items-center px-0.5 ${configExport[key] ? 'border-aztks-green bg-aztks-green/10 justify-end' : 'border-gray-700 bg-gray-900 justify-start'}`}>
                              <span className={`w-4 h-4 rounded-full ${configExport[key] ? 'bg-aztks-green' : 'bg-gray-600'}`} />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </aside>

              <main className="xl:col-span-8 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                  <ActionButton color="red" icon={<FileText className="w-5 h-5" />} label={generandoPDF ? 'Generando...' : 'Descargar PDF'} onClick={handleExportPDF} disabled={generandoPDF || isSaving} />
                  <ActionButton color="blue" icon={<Share2 className="w-5 h-5" />} label="Compartir PDF" onClick={handleSharePDF} disabled={generandoPDF || isSaving} />
                  <ActionButton color="green" icon={<MessageCircle className="w-5 h-5" />} label="WhatsApp Web" onClick={handleSendWhatsApp} disabled={isSaving} />
                  <ActionButton color="blue" icon={<Mail className="w-5 h-5" />} label="Outlook" onClick={handleSendEmail} disabled={isSaving} />
                  <ActionButton color="red" icon={<AtSign className="w-5 h-5" />} label="Gmail" onClick={handleSendGmail} disabled={isSaving} />
                  <ActionButton color="green" icon={<Download className="w-5 h-5" />} label="Excel" onClick={handleExportExcel} disabled={isSaving} />
                </div>

                <div className="bg-[#121212] border border-gray-800 rounded-2xl p-4 md:p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-white">Vista previa</h3>
                      <p className="text-xs text-gray-500">Salida seleccionada: {canalSalida}</p>
                    </div>
                    <div className="text-xs text-gray-500 font-bold uppercase">{carrito.length} registros</div>
                  </div>
                  {canalSalida === 'PDF' && renderDocumentPreview(false)}
                  {canalSalida === 'WhatsApp Web' && <TextPreview title="Mensaje para WhatsApp Web" content={generarTextoMensaje()} />}
                  {canalSalida === 'Outlook' && <TextPreview title={`Asunto Outlook: SOC_AZTKS | Orden ${nombreJugador || 'Stock'}`} content={generarTextoMensaje()} />}
                  {canalSalida === 'Gmail' && <TextPreview title={`Asunto Gmail: SOC_AZTKS | Orden ${nombreJugador || 'Stock'}`} content={generarTextoMensaje()} />}
                  {canalSalida === 'Excel' && <ExcelPreview items={carrito} resumen={resumenOrden} options={excelOptions} />}
                </div>
              </main>
            </div>
          </div>
        )}

        <div id="print-isolation-container" style={{ position: 'fixed', left: 0, top: 0, width: '794px', minHeight: '1123px', zIndex: -9999, pointerEvents: 'none', background: '#ffffff' }}>
          {renderDocumentPreview(true)}
        </div>
      </div>
    </div>
  );
}


function ToggleOption({ label, checked, onClick, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-center justify-between rounded-xl border border-gray-800 bg-[#121212] px-4 py-3 text-left disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <span className={`text-xs font-bold ${checked ? 'text-white' : 'text-gray-500'}`}>{label}</span>
      <span className={`w-9 h-5 rounded-full border flex items-center px-0.5 ${checked ? 'border-aztks-green bg-aztks-green/10 justify-end' : 'border-gray-700 bg-gray-900 justify-start'}`}>
        <span className={`w-4 h-4 rounded-full ${checked ? 'bg-aztks-green' : 'bg-gray-600'}`} />
      </span>
    </button>
  );
}

function Input({ label, value, onChange, placeholder, transformOnBlur }) {
  return (
    <div>
      {label && <label className="block uppercase text-gray-400 font-bold mb-1">{label}</label>}
      <input type="text" required className="w-full bg-[#121212] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-aztks-orange outline-none" value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => transformOnBlur && onChange(transformOnBlur(value))} placeholder={placeholder} />
    </div>
  );
}

function Select({ label, value, onChange, options, placeholder = 'Seleccionar...', full = false }) {
  return (
    <div className={full ? 'w-full' : ''}>
      {label && <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block">{label}</label>}
      <select className="w-full bg-[#1a1a1a] border border-gray-700 p-3 rounded-lg text-xs font-bold text-white" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function ColorCounter({ value, onMinus, onPlus, tone }) {
  const active = value > 0;
  const dot = tone === 'blue' ? 'bg-blue-500' : tone === 'yellow' ? 'bg-yellow-400' : 'bg-gray-400';
  const text = tone === 'blue' ? 'text-blue-400' : tone === 'yellow' ? 'text-yellow-400' : 'text-white';
  return (
    <div className={`flex items-center rounded-lg border transition-all ${active ? 'border-gray-500 bg-gray-800/50' : 'border-gray-700 bg-[#1a1a1a]'}`}>
      <div className="px-2 flex items-center border-r border-gray-700/50"><div className={`w-2.5 h-2.5 rounded-full ${dot}`} /></div>
      <button onClick={onMinus} className="px-2 py-1.5 text-gray-400 hover:text-white">-</button>
      <span className={`w-5 text-center font-bold text-sm ${active ? text : 'text-gray-500'}`}>{value}</span>
      <button onClick={onPlus} className="px-2 py-1.5 text-gray-400 hover:text-white">+</button>
    </div>
  );
}

function ActionButton({ color, icon, label, onClick, disabled = false }) {
  const colorClass = color === 'red'
    ? 'border-red-500/40 text-red-400 hover:bg-red-950/20'
    : color === 'blue'
      ? 'border-blue-500/40 text-blue-400 hover:bg-blue-950/20'
      : 'border-aztks-green/40 text-aztks-green hover:bg-aztks-green/10';

  return (
    <button onClick={onClick} disabled={disabled} className={`min-h-[78px] rounded-2xl border bg-[#121212] ${colorClass} disabled:opacity-50 flex flex-col items-center justify-center gap-2 text-xs font-bold uppercase`}>
      {icon}
      {label}
    </button>
  );
}

function PreviewDato({ label, value, right = false, accent = false }) {
  return (
    <div style={{ textAlign: right ? 'right' : 'left' }}>
      <div style={{ color: '#6b7280', fontSize: '12px', marginBottom: '7px' }}>{label}:</div>
      <div style={{ fontSize: accent ? '18px' : '14px', fontWeight: 800, color: accent ? '#f05a28' : '#111827' }}>{value}</div>
    </div>
  );
}

function TextPreview({ title, content }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-[#0d0d0d] p-5">
      <h4 className="text-sm font-bold text-white mb-4">{title}</h4>
      <pre className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed font-sans">{content}</pre>
    </div>
  );
}

function ExcelPreview({ items, resumen, options }) {
  const modo = options?.modo === 'economico' ? 'Económico' : 'Normal';
  const visuales = options?.modo === 'economico' ? 'Ocultas' : options?.referenciasVisuales ? 'Visibles' : 'Ocultas';
  const color = options?.escalaGrises ? 'Escala de grises' : 'Color institucional';

  return (
    <div className="rounded-2xl border border-gray-800 overflow-hidden bg-[#0d0d0d]">
      <div className="p-4 border-b border-gray-800 text-sm text-gray-300">
        El Excel oficial se generará con 3 hojas: FE-UNI-001 Solicitud, FI-UNI-002 Orden de Compra y Control Operativo.
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <span className="rounded-lg bg-[#121212] border border-gray-800 px-3 py-2">Modo: <strong className="text-white">{modo}</strong></span>
          <span className="rounded-lg bg-[#121212] border border-gray-800 px-3 py-2">Referencias: <strong className="text-white">{visuales}</strong></span>
          <span className="rounded-lg bg-[#121212] border border-gray-800 px-3 py-2">Color: <strong className="text-white">{color}</strong></span>
        </div>
        <div className="mt-3">Total preliminar: <span className="text-aztks-green font-bold">{dinero(resumen.total)}</span></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left text-gray-400">
          <thead className="bg-[#121212] text-gray-500 uppercase">
            <tr><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Prenda</th><th className="px-4 py-3">Talla</th><th className="px-4 py-3">Cant.</th><th className="px-4 py-3">Subtotal</th></tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-gray-800"><td className="px-4 py-3 font-mono">{item.sku}</td><td className="px-4 py-3 text-white font-bold">{item.tipo}</td><td className="px-4 py-3">{item.talla}</td><td className="px-4 py-3">{item.cantidad}</td><td className="px-4 py-3 text-aztks-green">{dinero(item.subtotal || 0)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
