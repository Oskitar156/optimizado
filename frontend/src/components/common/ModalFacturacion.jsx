import { useState, useEffect, useRef } from 'react'
import { X, FileText, Search, Plus, Trash2, Loader2, CheckCircle2, Package, Hash, Tag, User } from 'lucide-react'
import api from '../../services/api'

/* ── Constantes ── */
const INPUT_CLS = 'w-full bg-gray-50 border-2 border-gray-50 focus:border-amber-400 focus:bg-white rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-gray-700 outline-none transition-all'
const ICON_CLS  = 'absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-amber-500 transition-colors'

/* ── Buscador de Producto ── */
function ProductoSearch({ onAdd, itemsActuales, productos }) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const cerrar = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [])

  const idsEnUso = itemsActuales.map(i => i.producto.id)
  const results  = query.trim()
    ? productos.filter(p => !idsEnUso.includes(p.id) &&
        (p.nombre.toLowerCase().includes(query.toLowerCase()) || String(p.id).includes(query))
      ).slice(0, 7)
    : []

  const seleccionar = (p) => { onAdd(p); setQuery(''); setOpen(false) }

  return (
    <div ref={ref} className="relative">
      <div className="relative group">
        <div className={ICON_CLS}><Search size={16} /></div>
        <input type="text" placeholder="Escribe el nombre o ID del producto..." value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className={INPUT_CLS} />
        {query && (
          <button type="button" onMouseDown={() => { setQuery(''); setOpen(false) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
            <X size={14} />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute top-full mt-1 w-full bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-400 font-bold uppercase tracking-widest">Sin resultados para "{query}"</p>
          ) : results.map(p => (
            <button key={p.id} type="button" onMouseDown={() => seleccionar(p)} disabled={p.stockActual === 0}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-amber-50 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed group">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                  <Package size={13} />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-800 group-hover:text-amber-700">{p.nombre}</p>
                  <p className="text-[10px] text-gray-400 font-bold">ID: {p.id} · Stock: {p.stockActual}{p.stockActual === 0 ? ' (Agotado)' : ''}</p>
                </div>
              </div>
              <span className="text-xs font-black text-green-600 shrink-0">${p.precioVenta?.toFixed(2)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Modal Principal ── */
export default function ModalFacturacion({ onClose }) {
  const [clientes,        setClientes]        = useState([])
  const [productos,       setProductos]       = useState([])
  const [idQuery,         setIdQuery]         = useState('')
  const [suggestions,     setSuggestions]     = useState([])
  const [showSugg,        setShowSugg]        = useState(false)
  const [clienteSel,      setClienteSel]      = useState(null)
  const [modoNuevo,       setModoNuevo]       = useState(false)
  const [nuevoCliente,    setNuevoCliente]    = useState({ identificacion: '', nombre: '', telefono: '', correo: '' })
  const [items,           setItems]           = useState([])
  const [notas,           setNotas]           = useState('')
  const [saving,          setSaving]          = useState(false)
  const [success,         setSuccess]         = useState(false)
  const [error,           setError]           = useState('')
  const clienteRef = useRef(null)

  useEffect(() => {
    api.get('/clientes').then(r => setClientes(r.data)).catch(() => {})
    api.get('/productos').then(r => setProductos(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    const cerrar = (e) => { if (clienteRef.current && !clienteRef.current.contains(e.target)) setShowSugg(false) }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [])

  /* ── Búsqueda de cliente ── */
  const buscarCliente = (val) => {
    setIdQuery(val); setClienteSel(null); setModoNuevo(false)
    if (!val.trim()) { setSuggestions([]); setShowSugg(false); return }
    const q = val.toLowerCase()
    setSuggestions(clientes.filter(c =>
      String(c.id).startsWith(q) ||
      (c.identificacion ?? '').toLowerCase().includes(q) ||
      c.nombre.toLowerCase().includes(q) ||
      (c.telefono ?? '').includes(q)
    ).slice(0, 6))
    setShowSugg(true)
  }

  const seleccionarCliente = (c) => {
    setClienteSel(c)
    setIdQuery(c.identificacion || String(c.id))
    setSuggestions([]); setShowSugg(false); setModoNuevo(false)
  }

  const limpiarCliente = () => {
    setClienteSel(null); setModoNuevo(false); setIdQuery('')
    setSuggestions([]); setNuevoCliente({ identificacion: '', nombre: '', telefono: '', correo: '' })
  }

  /* ── Gestión de items ── */
  const agregarItem = (producto) => {
    setItems(prev => {
      const existe = prev.find(i => i.producto.id === producto.id)
      return existe
        ? prev.map(i => i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i)
        : [...prev, { producto, cantidad: 1 }]
    })
  }

  const actualizarCantidad = (id, val) => {
    const n = parseInt(val)
    if (!isNaN(n) && n >= 1) setItems(prev => prev.map(i => i.producto.id === id ? { ...i, cantidad: n } : i))
  }

  const total = items.reduce((acc, i) => acc + i.producto.precioVenta * i.cantidad, 0)

  /* ── Submit ── */
  async function handleSubmit(e) {
    e.preventDefault()
    if (items.length === 0) { setError('Agrega al menos un producto.'); return }
    for (const it of items) {
      if (it.cantidad > it.producto.stockActual) { setError(`Stock insuficiente para "${it.producto.nombre}".`); return }
    }
    setSaving(true); setError('')
    try {
      let clienteId = clienteSel?.id ?? null
      if (modoNuevo) {
        if (!nuevoCliente.nombre.trim()) { setError('El nombre del cliente es obligatorio.'); setSaving(false); return }
        const { data: nc } = await api.post('/clientes', nuevoCliente)
        clienteId = nc.id
      }
      await api.post('/ventas', {
        clienteId, notas,
        items: items.map(i => ({ productoId: i.producto.id, cantidad: i.cantidad, precioUnit: i.producto.precioVenta })),
      })
      setSuccess(true); setTimeout(onClose, 1800)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar la venta.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-modal-in flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-5 bg-amber-50 border-b border-amber-100 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <FileText className="text-amber-500" size={20} /> Nueva Factura
            </h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Registrar venta al cliente</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-amber-100 text-amber-600 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="w-12 h-12 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <p className="text-xs font-black text-green-600 uppercase tracking-tighter">¡Venta registrada exitosamente!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="overflow-y-auto custom-scrollbar flex-1 p-6 space-y-5">

              {/* Cliente */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente (opcional)</label>

                {clienteSel ? (
                  <div className="flex items-center gap-3 bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-black shrink-0">
                      {clienteSel.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-800 truncate">{clienteSel.nombre}</p>
                      <p className="text-[10px] text-gray-400 font-bold">
                        {clienteSel.identificacion ? `ID: ${clienteSel.identificacion}` : `Nº: ${clienteSel.id}`}
                        {clienteSel.telefono ? ` · ${clienteSel.telefono}` : ''}
                      </p>
                    </div>
                    <button type="button" onClick={limpiarCliente} className="p-1 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div ref={clienteRef} className="relative">
                    <div className="relative group">
                      <div className={ICON_CLS}><Hash size={16} /></div>
                      <input type="text" value={idQuery} onChange={e => buscarCliente(e.target.value)}
                        onFocus={() => idQuery && setShowSugg(true)}
                        placeholder="Escribe la identificación o nombre del cliente..."
                        className={INPUT_CLS} />
                    </div>

                    {showSugg && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden">
                        {suggestions.map(c => (
                          <button key={c.id} type="button" onMouseDown={() => seleccionarCliente(c)}
                            className="w-full text-left px-4 py-2.5 hover:bg-amber-50 transition-colors flex items-center gap-3 group">
                            <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-black shrink-0">
                              {c.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-800 group-hover:text-amber-700">{c.nombre}</p>
                              <p className="text-[10px] text-gray-400 font-bold">
                                {c.identificacion ? `ID: ${c.identificacion}` : `Nº: ${c.id}`}
                                {c.telefono ? ` · ${c.telefono}` : ''}
                              </p>
                            </div>
                          </button>
                        ))}
                        <button type="button" onMouseDown={() => { setModoNuevo(true); setShowSugg(false); setNuevoCliente(f => ({ ...f, identificacion: idQuery.trim() })) }}
                          className="w-full text-left px-4 py-2.5 hover:bg-amber-50 transition-colors flex items-center gap-2 border-t border-gray-50">
                          <Plus size={13} className="text-amber-500" />
                          <span className="text-xs font-black text-amber-600">
                            {suggestions.length === 0 ? 'No encontrado — crear nuevo cliente' : 'Crear nuevo cliente'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Formulario nuevo cliente */}
                {modoNuevo && !clienteSel && (
                  <div className="mt-2 p-4 bg-amber-50/60 border-2 border-amber-100 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
                        <User size={12} /> Nuevo Cliente
                      </p>
                      <button type="button" onClick={limpiarCliente} className="p-1 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
                        <X size={12} />
                      </button>
                    </div>

                    {[
                      { label: 'Identificación (cédula / NIT)', key: 'identificacion', placeholder: 'Ej. 1234567890' },
                      { label: 'Nombre *',                     key: 'nombre',         placeholder: 'Nombre completo' },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key}>
                        <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">{label}</label>
                        <input type="text" value={nuevoCliente[key]}
                          onChange={e => setNuevoCliente(f => ({ ...f, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="w-full bg-white border-2 border-gray-100 rounded-xl py-2 px-3 text-sm font-bold text-gray-700 placeholder-gray-300 focus:outline-none focus:border-amber-400 transition-all" />
                      </div>
                    ))}

                    <div className="grid grid-cols-2 gap-2">
                      {[['Teléfono', 'telefono', '+57...'], ['Correo', 'correo', 'correo@...']].map(([label, key, ph]) => (
                        <div key={key}>
                          <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">{label}</label>
                          <input type={key === 'correo' ? 'email' : 'text'} value={nuevoCliente[key]}
                            onChange={e => setNuevoCliente(f => ({ ...f, [key]: e.target.value }))}
                            placeholder={ph}
                            className="w-full bg-white border-2 border-gray-100 rounded-xl py-2 px-3 text-sm font-bold text-gray-700 placeholder-gray-300 focus:outline-none focus:border-amber-400 transition-all" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-50" />

              {/* Productos */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Agregar Producto</label>
                <ProductoSearch onAdd={agregarItem} itemsActuales={items} productos={productos} />
              </div>

              {/* Lista de items */}
              {items.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Productos en la factura</label>
                  {items.map(i => (
                    <div key={i.producto.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl px-3 py-3">
                      <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                        <Package size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-gray-800 truncate">{i.producto.nombre}</p>
                        <p className="text-[10px] text-gray-400 font-bold">Stock disponible: {i.producto.stockActual}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <label className="text-[9px] text-gray-400 font-black uppercase">Cant.</label>
                        <input type="number" min={1} max={i.producto.stockActual} value={i.cantidad}
                          onChange={e => actualizarCantidad(i.producto.id, e.target.value)}
                          className="w-14 text-center text-xs font-black text-gray-800 bg-white border-2 border-gray-100 rounded-xl py-1 focus:outline-none focus:border-amber-400 transition-all" />
                      </div>
                      <p className="text-xs font-black text-green-600 w-16 text-right shrink-0">
                        ${(i.producto.precioVenta * i.cantidad).toFixed(2)}
                      </p>
                      <button type="button" onClick={() => setItems(p => p.filter(x => x.producto.id !== i.producto.id))}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <div className="flex justify-end pt-1">
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3 text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</p>
                      <p className="text-xl font-black text-amber-600">${total.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notas */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notas (opcional)</label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-3.5 text-gray-300 group-focus-within:text-amber-500 transition-colors">
                    <Tag size={16} />
                  </div>
                  <textarea rows={2} placeholder="Observaciones..." value={notas}
                    onChange={e => setNotas(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-50 focus:border-amber-400 focus:bg-white rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-gray-700 outline-none transition-all resize-none" />
                </div>
              </div>

              {error && <div className="bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold uppercase tracking-wide px-3 py-2 rounded-xl">{error}</div>}
            </div>

            {/* Footer */}
            <div className="p-5 bg-gray-50 border-t border-gray-100 flex gap-3 shrink-0">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving || items.length === 0}
                className="flex-[2] py-2.5 text-xs font-black uppercase tracking-widest text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                {saving && <Loader2 size={13} className="animate-spin" />}
                {saving ? 'Procesando...' : `Facturar $${total.toFixed(2)}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
