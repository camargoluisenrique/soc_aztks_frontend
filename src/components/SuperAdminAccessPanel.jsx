import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, RefreshCw, Save, ShieldCheck, UserPlus } from 'lucide-react';
import { supabase } from '../services/supabase';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'staff', label: 'Staff' },
  { value: 'coach', label: 'Coach' },
  { value: 'proveedor', label: 'Proveedor' },
  { value: 'consulta', label: 'Consulta' },
  { value: 'temporal', label: 'Temporal' },
];

const PERMISSION_OPTIONS = [
  { value: 'crear_orden', label: 'Crear orden' },
  { value: 'ver_ordenes', label: 'Ver órdenes' },
  { value: 'editar_ordenes', label: 'Editar órdenes' },
  { value: 'actualizar_estatus', label: 'Actualizar estatus' },
  { value: 'descargar_pdf', label: 'Descargar PDF' },
  { value: 'compartir_pdf', label: 'Compartir PDF' },
  { value: 'descargar_excel', label: 'Descargar Excel' },
  { value: 'ver_panel_admin', label: 'Ver panel administrativo' },
  { value: 'gestionar_usuarios', label: 'Gestionar usuarios' },
  { value: 'gestionar_accesos_temporales', label: 'Gestionar accesos temporales' },
];

const DEFAULT_PERMISSIONS_BY_ROLE = {
  admin: ['crear_orden', 'ver_ordenes', 'editar_ordenes', 'actualizar_estatus', 'descargar_pdf', 'compartir_pdf', 'descargar_excel', 'ver_panel_admin'],
  staff: ['crear_orden', 'ver_ordenes', 'descargar_pdf', 'compartir_pdf', 'descargar_excel'],
  coach: ['crear_orden', 'ver_ordenes', 'descargar_pdf', 'compartir_pdf'],
  proveedor: ['ver_ordenes', 'actualizar_estatus', 'descargar_pdf'],
  consulta: ['ver_ordenes', 'descargar_pdf'],
  temporal: ['ver_ordenes', 'descargar_pdf'],
};

const emptyForm = {
  nombre: '',
  celular: '',
  pin: '',
  rol: 'staff',
  activo: true,
  valido_hasta: '',
  permisos: DEFAULT_PERMISSIONS_BY_ROLE.staff,
};

const normalizePhone = (value) => value.replace(/\D/g, '').slice(0, 10);
const normalizePin = (value) => value.replace(/\D/g, '').slice(0, 6);
const canManageUsers = (user) => user?.rol === 'super_admin' && Array.isArray(user?.permisos) && user.permisos.includes('gestionar_usuarios');

export default function SuperAdminAccessPanel({ currentUser, onVolver }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const allowed = useMemo(() => canManageUsers(currentUser), [currentUser]);

  const fetchUsers = async () => {
    if (!allowed) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('usuarios')
        .select('id,nombre,celular,rol,activo,pin,valido_hasta,permisos,created_at,updated_at,ultimo_acceso')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setUsers((data || []).map((user) => ({
        ...user,
        permisos: Array.isArray(user.permisos) ? user.permisos : [],
        pinDraft: '',
      })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [allowed]);

  const updateForm = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'rol') {
        next.permisos = DEFAULT_PERMISSIONS_BY_ROLE[value] || [];
        if (value !== 'temporal') next.valido_hasta = '';
      }
      return next;
    });
  };

  const toggleFormPermission = (permission) => {
    setForm((prev) => ({
      ...prev,
      permisos: prev.permisos.includes(permission)
        ? prev.permisos.filter((item) => item !== permission)
        : [...prev.permisos, permission],
    }));
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      if (!form.nombre.trim()) throw new Error('Captura el nombre del usuario.');
      if (form.celular.length !== 10) throw new Error('El celular debe tener 10 dígitos.');
      if (form.pin.length !== 6) throw new Error('El PIN debe tener 6 dígitos.');
      if (!form.permisos.length) throw new Error('Selecciona por lo menos un permiso.');

      const payload = {
        nombre: form.nombre.trim(),
        celular: form.celular,
        rol: form.rol,
        pin: form.pin,
        activo: form.activo,
        valido_hasta: form.rol === 'temporal' && form.valido_hasta ? `${form.valido_hasta}T23:59:59-06:00` : null,
        permisos: form.permisos,
        updated_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase.from('usuarios').insert([payload]);
      if (insertError) throw insertError;

      setMessage('Usuario creado correctamente.');
      setForm(emptyForm);
      await fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateUserLocal = (id, updater) => {
    setUsers((prev) => prev.map((user) => user.id === id ? updater(user) : user));
  };

  const toggleUserPermission = (id, permission) => {
    updateUserLocal(id, (user) => ({
      ...user,
      permisos: user.permisos.includes(permission)
        ? user.permisos.filter((item) => item !== permission)
        : [...user.permisos, permission],
    }));
  };

  const saveUser = async (user) => {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      if (user.rol === 'super_admin' && user.id !== currentUser.id) {
        throw new Error('No se permite crear o modificar otro super administrador desde esta pantalla.');
      }

      const payload = {
        rol: user.rol,
        activo: user.activo,
        valido_hasta: user.rol === 'temporal' && user.valido_hasta ? user.valido_hasta : null,
        permisos: user.permisos,
        updated_at: new Date().toISOString(),
      };

      if (user.pinDraft) {
        if (!/^\d{6}$/.test(user.pinDraft)) throw new Error('El nuevo PIN debe tener 6 dígitos.');
        payload.pin = user.pinDraft;
      }

      const { error: updateError } = await supabase.from('usuarios').update(payload).eq('id', user.id);
      if (updateError) throw updateError;

      setMessage(`Acceso actualizado para ${user.nombre}.`);
      await fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!allowed) {
    return (
      <div className="max-w-3xl mx-auto bg-aztks-grey border border-red-500/40 rounded-2xl p-8 mt-10 text-center">
        <ShieldCheck className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Acceso restringido</h2>
        <p className="text-sm text-gray-400 mb-6">Esta sección solo está disponible para el superadministrador de SOC_AZTKS.</p>
        <button onClick={onVolver} className="rounded-xl border border-gray-700 px-5 py-3 text-xs font-bold uppercase text-gray-300 hover:text-white">Volver</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <button onClick={onVolver} className="text-gray-500 hover:text-white text-xs uppercase font-bold tracking-wider flex items-center mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver al menú
          </button>
          <h2 className="text-2xl font-display font-bold uppercase tracking-widest text-white">Administración de accesos</h2>
          <p className="text-sm text-gray-500 mt-1">Crea usuarios, asigna roles, PIN y permisos para SOC_AZTKS.</p>
        </div>
        <button onClick={fetchUsers} disabled={loading} className="rounded-xl border border-aztks-green/40 text-aztks-green px-5 py-3 text-xs font-bold uppercase flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {(message || error) && (
        <div className={`rounded-xl border p-4 text-sm font-bold ${error ? 'border-red-500/40 bg-red-950/30 text-red-200' : 'border-aztks-green/40 bg-aztks-green/10 text-aztks-green'}`}>
          {error || message}
        </div>
      )}

      <section className="bg-aztks-grey border border-gray-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3 mb-5">
          <UserPlus className="w-5 h-5 text-aztks-orange" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Nuevo usuario</h3>
        </div>

        <form onSubmit={handleCreateUser} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <AccessInput label="Nombre completo" value={form.nombre} onChange={(value) => updateForm('nombre', value)} placeholder="Nombre del usuario" />
            <AccessInput label="Celular" value={form.celular} onChange={(value) => updateForm('celular', normalizePhone(value))} placeholder="10 dígitos" />
            <AccessInput label="PIN inicial" value={form.pin} onChange={(value) => updateForm('pin', normalizePin(value))} placeholder="6 dígitos" />
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block">Rol</label>
              <select className="w-full bg-[#121212] border border-gray-700 p-3 rounded-xl text-sm text-white" value={form.rol} onChange={(event) => updateForm('rol', event.target.value)}>
                {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button type="button" onClick={() => updateForm('activo', !form.activo)} className={`rounded-xl border px-4 py-3 text-xs font-bold uppercase text-left ${form.activo ? 'border-aztks-green bg-aztks-green/10 text-aztks-green' : 'border-red-500/40 bg-red-950/20 text-red-300'}`}>
              Estado: {form.activo ? 'Activo' : 'Inactivo'}
            </button>
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block">Válido hasta</label>
              <input type="date" disabled={form.rol !== 'temporal'} value={form.valido_hasta} onChange={(event) => updateForm('valido_hasta', event.target.value)} className="w-full bg-[#121212] border border-gray-700 p-3 rounded-xl text-sm text-white disabled:opacity-40" />
            </div>
          </div>

          <PermissionGrid selected={form.permisos} onToggle={toggleFormPermission} />

          <button type="submit" disabled={saving} className="w-full bg-aztks-orange hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl px-6 py-4 text-xs font-bold uppercase tracking-wider">
            {saving ? 'Guardando...' : 'Crear usuario'}
          </button>
        </form>
      </section>

      <section className="bg-aztks-grey border border-gray-800 rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-5">Usuarios registrados</h3>
        {loading ? (
          <div className="text-sm text-gray-500">Cargando usuarios...</div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="rounded-2xl border border-gray-800 bg-[#121212] p-4 space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-end">
                  <div>
                    <div className="text-white font-bold text-sm">{user.nombre}</div>
                    <div className="text-gray-500 text-xs font-mono mt-1">{user.celular}</div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block">Rol</label>
                    <select disabled={user.rol === 'super_admin'} className="w-full bg-[#0d0d0d] border border-gray-700 p-3 rounded-xl text-sm text-white disabled:opacity-50" value={user.rol} onChange={(event) => updateUserLocal(user.id, (current) => ({ ...current, rol: event.target.value, permisos: DEFAULT_PERMISSIONS_BY_ROLE[event.target.value] || current.permisos }))}>
                      {user.rol === 'super_admin' && <option value="super_admin">Super administrador</option>}
                      {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block">Nuevo PIN</label>
                    <input value={user.pinDraft || ''} onChange={(event) => updateUserLocal(user.id, (current) => ({ ...current, pinDraft: normalizePin(event.target.value) }))} placeholder="Opcional" className="w-full bg-[#0d0d0d] border border-gray-700 p-3 rounded-xl text-sm text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block">Válido hasta</label>
                    <input type="date" disabled={user.rol !== 'temporal'} value={user.valido_hasta ? user.valido_hasta.slice(0, 10) : ''} onChange={(event) => updateUserLocal(user.id, (current) => ({ ...current, valido_hasta: event.target.value ? `${event.target.value}T23:59:59-06:00` : null }))} className="w-full bg-[#0d0d0d] border border-gray-700 p-3 rounded-xl text-sm text-white disabled:opacity-40" />
                  </div>
                  <button type="button" onClick={() => updateUserLocal(user.id, (current) => ({ ...current, activo: !current.activo }))} className={`rounded-xl border px-4 py-3 text-xs font-bold uppercase ${user.activo ? 'border-aztks-green bg-aztks-green/10 text-aztks-green' : 'border-red-500/40 bg-red-950/20 text-red-300'}`}>
                    {user.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </div>

                <PermissionGrid selected={user.permisos} onToggle={(permission) => toggleUserPermission(user.id, permission)} disabled={user.rol === 'super_admin' && user.id === currentUser.id} />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-800 pt-3">
                  <div className="text-[11px] text-gray-500">
                    Último acceso: {user.ultimo_acceso ? new Date(user.ultimo_acceso).toLocaleString('es-MX') : 'Sin registro'}
                  </div>
                  <button type="button" onClick={() => saveUser(user)} disabled={saving} className="rounded-xl border border-aztks-green/40 text-aztks-green px-5 py-3 text-xs font-bold uppercase flex items-center justify-center gap-2 disabled:opacity-50">
                    <Save className="w-4 h-4" /> Guardar cambios
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AccessInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block">{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full bg-[#121212] border border-gray-700 p-3 rounded-xl text-sm text-white focus:border-aztks-orange outline-none" />
    </div>
  );
}

function PermissionGrid({ selected, onToggle, disabled = false }) {
  return (
    <div>
      <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">Permisos</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
        {PERMISSION_OPTIONS.map((permission) => {
          const active = selected.includes(permission.value);
          return (
            <button
              key={permission.value}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(permission.value)}
              className={`rounded-xl border px-3 py-3 text-left text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${active ? 'border-aztks-green bg-aztks-green/10 text-aztks-green' : 'border-gray-800 bg-[#0d0d0d] text-gray-500 hover:text-white'}`}
            >
              {permission.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
