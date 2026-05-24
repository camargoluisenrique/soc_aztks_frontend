import { useEffect, useState } from 'react';
import { supabase } from './services/supabase';
import { ArrowLeft, CheckCircle, Clock, Download, FileText, PackageCheck, RefreshCw, Truck, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import logoAztks from './assets/logo_aztks.png';

const ESTATUS_LABELS = {
  POR_PEDIR: 'Por pedir',
  PROCESANDO: 'Procesando',
  RECIBIDO: 'Recibido',
  ENTREGADO: 'Entregado',
};

const formatoFecha = (fecha) => {
  if (!fecha) return 'Pendiente';
  return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const dinero = (valor = 0) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(valor || 0));

export default function AdminDashboard({ onVolver }) {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [actualizando, setActualizando] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  const fetchOrdenes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ordenes')
        .select('*, ordenes_items (*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrdenes(data || []);
    } catch (error) {
      alert(`No fue posible cargar las órdenes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdenes();
  }, []);

  const folioOrden = (orden) => `#${orden?.folio || orden?.id?.split('-')?.[0]?.toUpperCase() || 'S/F'}`;

  const totalOrden = (orden) =>
    (orden?.ordenes_items || []).reduce((acc, item) => acc + Number(item.subtotal || 0), 0);

  const numeroOrden = (orden) =>
    orden?.numero_jersey ?? orden?.ordenes_items?.find((item) => item.numero !== null && item.numero !== undefined)?.numero ?? null;

  const categoriaOrden = (orden) =>
    orden?.categoria && orden.categoria !== 'Registro Logístico'
      ? orden.categoria
      : orden?.ordenes_items?.find((item) => item.categoria && item.categoria !== 'Unisex')?.categoria || 'Sin categoría';

  const ramaOrden = (orden) =>
    orden?.rama && orden.rama !== 'Consolidado'
      ? orden.rama
      : orden?.ordenes_items?.find((item) => item.rama && item.rama !== 'Unisex')?.rama || 'Sin rama';

  const cambiarEstatus = async (nuevoEstatus) => {
    if (!ordenSeleccionada) return;
    setActualizando(true);
    try {
      const { error } = await supabase
        .from('ordenes')
        .update({ estatus: nuevoEstatus })
        .eq('id', ordenSeleccionada.id);

      if (error) throw error;
      await fetchOrdenes();
      setOrdenSeleccionada(null);
      alert('Estatus actualizado correctamente.');
    } catch (error) {
      alert(error.message);
    } finally {
      setActualizando(false);
    }
  };

  const esperarImagenes = async (root) => {
    const imagenes = Array.from(root.querySelectorAll('img'));
    await Promise.all(
      imagenes.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );
  };

  const exportarPDF = async (idElemento, nombreArchivo) => {
    setGenerandoPDF(true);
    try {
      const element = document.getElementById(idElemento);
      if (!element) throw new Error(`No se encontró la plantilla ${idElemento}.`);

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
      pdf.save(`${nombreArchivo}.pdf`);
    } catch (error) {
      alert(`Error al generar PDF: ${error.message}`);
    } finally {
      setGenerandoPDF(false);
    }
  };

  const getEstatusColor = (estatus) => {
    switch (estatus) {
      case 'PROCESANDO':
        return 'bg-blue-950/60 text-blue-300 border-blue-700';
      case 'RECIBIDO':
        return 'bg-yellow-950/60 text-yellow-300 border-yellow-700';
      case 'ENTREGADO':
        return 'bg-aztks-green/15 text-aztks-green border-aztks-green/70';
      default:
        return 'bg-gray-900 text-gray-300 border-gray-700';
    }
  };

  const renderDocumentoPDF = (orden, tipo = 'FI') => {
    const esSolicitud = tipo === 'FE';
    const titulo = esSolicitud ? 'Solicitud de uniforme de jugador' : 'Orden de compra';
    const codigo = esSolicitud ? 'FE-UNI-001' : 'FI-UNI-002';
    const total = totalOrden(orden);
    const numero = numeroOrden(orden);

    return (
      <div
        id={esSolicitud ? 'formato-fe-uni-001' : 'formato-fi-uni-002'}
        style={{ width: '794px', minHeight: '1123px', background: '#ffffff', color: '#111827', fontFamily: 'Arial, Helvetica, sans-serif', boxSizing: 'border-box' }}
      >
        <div style={{ height: '150px', background: 'linear-gradient(135deg,#0d0d0d,#1a1a1a)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.28, background: 'radial-gradient(circle at 20% 20%,#f05a28 0,transparent 28%), radial-gradient(circle at 82% 35%,#2ecc71 0,transparent 24%)' }} />
          <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={logoAztks} alt="AZTKS" style={{ width: '190px', height: 'auto', objectFit: 'contain' }} />
          </div>
        </div>

        <div style={{ height: '5px', background: '#f05a28' }} />

        <main style={{ padding: '34px 42px 30px' }}>
          <section style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'inline-block', padding: '6px 13px', borderRadius: '999px', background: esSolicitud ? '#111827' : '#fff1ed', color: esSolicitud ? '#ffffff' : '#f05a28', fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px' }}>{codigo}</div>
            <h1 style={{ margin: '14px 0 5px', fontSize: '23px', letterSpacing: '4px', textTransform: 'uppercase', color: '#1f2937' }}>{titulo}</h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>Folio {folioOrden(orden)} · {formatoFecha(orden.fecha_pedido || orden.created_at)}</p>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', padding: '20px 0', borderTop: '1px dashed #d1d5db', borderBottom: '1px dashed #d1d5db' }}>
            <InfoPDF label="Jugador" value={orden.nombre_jugador || 'Stock almacén'} />
            <InfoPDF label="Responsable" value={orden.responsable_deportista || 'No especificado'} align="right" />
            <InfoPDF label="Categoría / Rama" value={`${categoriaOrden(orden)} ${ramaOrden(orden)}`} />
            <InfoPDF label="Número de jersey" value={numero !== null ? `#${numero}` : 'S/N'} align="right" accent />
            {!esSolicitud && <InfoPDF label="Proveedor" value={orden.proveedor || 'Pendiente'} />}
            {!esSolicitud && <InfoPDF label="Lugar de entrega" value={orden.lugar_entrega || 'Instalaciones Domo Aztks'} align="right" />}
          </section>

          <section style={{ marginTop: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #111827', paddingBottom: '10px', marginBottom: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '13px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6b7280' }}>Detalle de prendas</h2>
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700 }}>{orden.ordenes_items?.length || 0} registros</span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '12%' }} />
                <col style={{ width: esSolicitud ? '45%' : '36%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '12%' }} />
                {!esSolicitud && <col style={{ width: '22%' }} />}
              </colgroup>
              <thead>
                <tr>
                  <ThPDF>Cant.</ThPDF>
                  <ThPDF>Prenda</ThPDF>
                  <ThPDF>Talla</ThPDF>
                  <ThPDF>Dorsal</ThPDF>
                  {!esSolicitud && <ThPDF>SKU</ThPDF>}
                </tr>
              </thead>
              <tbody>
                {(orden.ordenes_items || []).map((item, index) => (
                  <tr key={item.id || index}>
                    <TdPDF center bold>{item.cantidad}</TdPDF>
                    <TdPDF>
                      <div style={{ fontWeight: 800, color: '#111827', textTransform: 'uppercase' }}>{item.tipo_prenda}</div>
                      <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '3px' }}>{item.formato} · {item.color}</div>
                    </TdPDF>
                    <TdPDF center><span style={{ display: 'inline-block', padding: '6px 12px', borderRadius: '8px', background: '#f3f4f6', fontWeight: 800 }}>{item.talla}</span></TdPDF>
                    <TdPDF center accent>{item.numero !== null && item.numero !== undefined ? `#${item.numero}` : 'N/A'}</TdPDF>
                    {!esSolicitud && <TdPDF center small>{item.sku || 'N/A'}</TdPDF>}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {!esSolicitud && (
            <section style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: '260px', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '15px', background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}><span>Subtotal</span><strong>{dinero(total)}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}><span>Envío</span><strong>Por calcular</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #d1d5db', paddingTop: '12px', fontSize: '16px', color: '#111827' }}><span style={{ fontWeight: 900 }}>Total</span><strong style={{ color: '#f05a28' }}>{dinero(total)}</strong></div>
              </div>
            </section>
          )}

          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', marginTop: esSolicitud ? '90px' : '70px', textAlign: 'center' }}>
            <FirmaPDF title={esSolicitud ? 'Atención al cliente' : 'Autorizó'} subtitle={esSolicitud ? 'Validación de almacén e inscripción' : 'Control interno SOC_AZTKS'} />
            <FirmaPDF title={esSolicitud ? 'Responsable del deportista' : 'Recibió proveedor'} subtitle={esSolicitud ? 'Conformidad de talla y estampado' : 'Validación de entrega'} />
          </section>

          <p style={{ marginTop: '42px', textAlign: 'center', color: '#9ca3af', fontSize: '10px', letterSpacing: '0.8px' }}>Generado por SOC_AZTKS · Portal Administrativo</p>
        </main>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in relative">
      <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <div>
          <button onClick={onVolver} className="text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider mb-2 flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver al menú
          </button>
          <h2 className="text-2xl font-display font-bold text-white uppercase tracking-wider flex items-center">
            <PackageCheck className="w-6 h-6 mr-3 text-aztks-green" /> Monitor logístico
          </h2>
        </div>
        <button onClick={fetchOrdenes} className="p-2 bg-[#121212] border border-gray-700 rounded-lg">
          <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-aztks-grey rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-[#121212] border-b border-gray-800">
              <tr>
                <th className="px-6 py-4">Folio / Fecha</th>
                <th className="px-6 py-4">Tipo / Destino</th>
                <th className="px-6 py-4">Artículos</th>
                <th className="px-6 py-4">Estatus</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center py-10">Cargando base de datos...</td></tr>
              ) : ordenes.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-10 text-gray-500">No hay órdenes registradas.</td></tr>
              ) : (
                ordenes.map((orden) => (
                  <tr key={orden.id} className="border-b border-gray-800/50 hover:bg-[#1a1a1a]">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white mb-1 uppercase">{folioOrden(orden)}</div>
                      <div className="text-[10px] uppercase">{formatoFecha(orden.fecha_pedido || orden.created_at)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-200 uppercase">{orden.tipo_pedido === 'jugador' ? 'Personalizado' : 'Stock'}</div>
                      <div className="text-[11px] text-aztks-orange">{orden.nombre_jugador || 'Stock almacén'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{orden.ordenes_items?.length || 0} prendas</div>
                      <div className="text-[11px] text-gray-500">{dinero(totalOrden(orden))}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full border ${getEstatusColor(orden.estatus)}`}>{ESTATUS_LABELS[orden.estatus] || 'Por pedir'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setOrdenSeleccionada(orden)} className="text-xs font-bold text-aztks-green hover:text-white uppercase bg-aztks-green/10 px-3 py-2 rounded-lg">Gestionar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {ordenSeleccionada && (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#121212] border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-aztks-grey sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-display font-bold text-white uppercase">Expediente <span className="text-aztks-orange">{folioOrden(ordenSeleccionada)}</span></h3>
                <p className="text-xs text-gray-500 mt-1">{ordenSeleccionada.nombre_jugador || 'Stock almacén'} · {ESTATUS_LABELS[ordenSeleccionada.estatus] || 'Por pedir'}</p>
              </div>
              <button onClick={() => setOrdenSeleccionada(null)} className="p-2 bg-gray-900 rounded-lg text-gray-400"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button disabled={generandoPDF} onClick={() => exportarPDF('formato-fi-uni-002', `FI-UNI-002_Orden_${ordenSeleccionada.folio || ordenSeleccionada.id.split('-')[0]}`)} className="border border-red-500/40 text-red-400 bg-red-950/10 hover:bg-red-950/30 px-4 py-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center disabled:opacity-50">
                  <FileText className="w-4 h-4 mr-2" /> Descargar FI-UNI-002
                </button>
                {ordenSeleccionada.tipo_pedido === 'jugador' && (
                  <button disabled={generandoPDF} onClick={() => exportarPDF('formato-fe-uni-001', `FE-UNI-001_Solicitud_${ordenSeleccionada.folio || ordenSeleccionada.id.split('-')[0]}`)} className="border border-blue-500/40 text-blue-400 bg-blue-950/10 hover:bg-blue-950/30 px-4 py-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center disabled:opacity-50">
                    <Download className="w-4 h-4 mr-2" /> Descargar FE-UNI-001
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#1a1a1a] p-4 rounded-xl border border-gray-800 text-xs">
                <DatoModal label="Tipo" value={ordenSeleccionada.tipo_pedido} />
                <DatoModal label="Jugador" value={ordenSeleccionada.nombre_jugador || 'Stock'} />
                <DatoModal label="Categoría / Rama" value={`${categoriaOrden(ordenSeleccionada)} ${ramaOrden(ordenSeleccionada)}`} />
                <DatoModal label="Total" value={dinero(totalOrden(ordenSeleccionada))} accent />
              </div>

              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#0d0d0d] text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3">Prenda</th>
                      <th className="px-4 py-3">Especificación</th>
                      <th className="px-4 py-3 text-center">Talla</th>
                      <th className="px-4 py-3 text-center">Cant.</th>
                      <th className="px-4 py-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordenSeleccionada.ordenes_items?.map((item) => (
                      <tr key={item.id} className="border-t border-gray-800 text-gray-300">
                        <td className="px-4 py-3 font-bold text-white">{item.tipo_prenda}</td>
                        <td className="px-4 py-3 text-gray-400">{item.color} · {item.formato}</td>
                        <td className="px-4 py-3 text-center font-bold">{item.talla}</td>
                        <td className="px-4 py-3 text-center">{item.cantidad}</td>
                        <td className="px-4 py-3 text-right text-aztks-green font-bold">{dinero(item.subtotal || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 bg-aztks-grey sticky bottom-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button disabled={actualizando} onClick={() => cambiarEstatus('PROCESANDO')} className="py-3 border border-blue-700 text-blue-400 font-bold text-xs uppercase rounded-xl flex justify-center items-center"><Clock className="w-4 h-4 mr-2" /> Procesando</button>
                <button disabled={actualizando} onClick={() => cambiarEstatus('RECIBIDO')} className="py-3 border border-yellow-700 text-yellow-400 font-bold text-xs uppercase rounded-xl flex justify-center items-center"><Truck className="w-4 h-4 mr-2" /> Recibido</button>
                <button disabled={actualizando} onClick={() => cambiarEstatus('ENTREGADO')} className="py-3 border border-aztks-green text-aztks-green font-bold text-xs uppercase rounded-xl flex justify-center items-center"><CheckCircle className="w-4 h-4 mr-2" /> Entregado</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ordenSeleccionada && (
        <div style={{ position: 'fixed', left: 0, top: 0, width: '794px', minHeight: '1123px', zIndex: -9999, pointerEvents: 'none', background: '#ffffff' }}>
          {renderDocumentoPDF(ordenSeleccionada, 'FE')}
          {renderDocumentoPDF(ordenSeleccionada, 'FI')}
        </div>
      )}
    </div>
  );
}

function DatoModal({ label, value, accent = false }) {
  return (
    <div>
      <p className="text-gray-500 uppercase font-bold">{label}</p>
      <p className={`text-sm font-bold mt-1 ${accent ? 'text-aztks-green' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function InfoPDF({ label, value, align = 'left', accent = false }) {
  return (
    <div style={{ textAlign: align }}>
      <div style={{ color: '#6b7280', fontSize: '12px', marginBottom: '7px' }}>{label}:</div>
      <div style={{ fontSize: accent ? '18px' : '14px', fontWeight: 800, color: accent ? '#f05a28' : '#111827' }}>{value}</div>
    </div>
  );
}

function ThPDF({ children }) {
  return <th style={{ padding: '11px 10px', color: '#6b7280', borderBottom: '1px solid #e5e7eb', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{children}</th>;
}

function TdPDF({ children, center = false, bold = false, accent = false, small = false }) {
  return <td style={{ padding: '13px 10px', borderBottom: '1px solid #edf0f3', textAlign: center ? 'center' : 'left', fontWeight: bold ? 800 : 400, color: accent ? '#f05a28' : '#111827', fontSize: small ? '10px' : '12px', wordBreak: 'break-word' }}>{children}</td>;
}

function FirmaPDF({ title, subtitle }) {
  return (
    <div>
      <div style={{ borderTop: '2px solid #111827', width: '100%', marginBottom: '12px' }} />
      <div style={{ fontWeight: 900, fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>{title}</div>
      <div style={{ marginTop: '4px', fontSize: '10px', color: '#6b7280' }}>{subtitle}</div>
    </div>
  );
}
