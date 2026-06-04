import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Package, ShoppingCart, Tag, Truck, Users, Settings, LayoutGrid, ShoppingBag, FileText } from 'lucide-react'
import { AiOutlineLeft } from 'react-icons/ai'
import logo from '../resourses/logo.png'
import ModalFacturacion from '../common/ModalFacturacion'

const NAV_LINKS = [
  { path: '/dashboard',     icon: LayoutGrid,  label: 'Dashboard' },
  { path: '/inventario',    icon: Package,      label: 'Inventario' },
  { path: '/ventas',        icon: ShoppingCart, label: 'Ventas' },
  { path: '/productos',     icon: Tag,          label: 'Productos' },
  { path: '/compras',       icon: ShoppingBag,  label: 'Compras' },
  { path: '/proveedores',   icon: Truck,        label: 'Proveedores' },
  { path: '/clientes',      icon: Users,        label: 'Clientes' },
  { path: '/configuracion', icon: Settings,     label: 'Configuración' },
]

export default function Sidebar() {
  const [collapsed,       setCollapsed]       = useState(false)
  const [showFacturacion, setShowFacturacion] = useState(false)

  const linkCls = (isActive) => `
    relative flex items-center rounded-lg text-sm font-medium whitespace-nowrap overflow-hidden
    transition-all duration-150
    ${isActive ? 'bg-violet-50 text-violet-600 font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
    ${collapsed ? 'justify-center px-0' : 'justify-start gap-3 px-2.5'} py-2.5
  `

  return (
    <>
      <aside className={`
        relative z-[100] flex flex-col h-screen bg-white border-r border-gray-200
        py-5 shrink-0 transition-all duration-300 ease-in-out shadow-xl shadow-gray-200/50
        ${collapsed ? 'w-[60px]' : 'w-[220px]'}
      `}>

        {/* Toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute top-10 -right-5 z-[110] w-7 h-7 rounded-full bg-white border border-gray-400
            flex items-center justify-center shadow-md hover:border-violet-600 transition-all duration-300 group"
        >
          <AiOutlineLeft size={10} className={`text-gray-900 group-hover:text-violet-600 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>

        {/* Logo */}
        <div className={`mb-10 mt-2 shrink-0 transition-all duration-300 ${collapsed ? 'px-0 flex justify-center' : 'px-5'}`}>
          <div className={`flex items-center transition-all duration-300 ${collapsed ? 'gap-0' : 'gap-4'}`}>
            <div className={`shrink-0 flex items-center justify-center bg-violet-50 rounded-2xl border border-violet-100 shadow-sm overflow-hidden group transition-all duration-300 ${collapsed ? 'w-10 h-10' : 'w-12 h-12'}`}>
              <img src={logo} alt="Logo" className="w-full h-full object-contain p-1.5 transition-transform duration-500 group-hover:scale-110" />
            </div>
            <div className={`flex flex-col transition-all duration-300 ${collapsed ? 'opacity-0 w-0 invisible -translate-x-4' : 'opacity-100 w-auto visible translate-x-0'}`}>
              <span className="text-gray-900 font-extrabold text-xl tracking-tighter leading-none">
                Stock<span className="text-violet-600">lat</span>
              </span>
              <span className="text-[15px] text-gray-400 font-bold uppercase tracking-widest mt-1 whitespace-nowrap">
                Manager
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-2 flex-1">
          {NAV_LINKS.map(({ path, icon: Icon, label }) => (
            <NavLink key={path} to={path} className={({ isActive }) => linkCls(isActive)}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-violet-600 rounded-r-full" />}
                  <Icon size={18} className="shrink-0" />
                  <span className={`transition-all duration-150 ${collapsed ? 'opacity-0 w-0 invisible' : 'opacity-100 w-auto visible'}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          <div className="my-2.5 mx-1 h-px bg-gray-100" />

          <button
            onClick={() => setShowFacturacion(true)}
            className={`relative flex items-center rounded-lg text-sm font-medium whitespace-nowrap overflow-hidden
              transition-all duration-150 text-violet-600 bg-violet-50 hover:bg-violet-100
              ${collapsed ? 'justify-center px-0' : 'justify-start gap-3 px-2.5'} py-2.5`}
          >
            <FileText size={18} className="shrink-0" />
            <span className={`transition-all duration-150 font-semibold ${collapsed ? 'opacity-0 w-0 invisible' : 'opacity-100 w-auto visible'}`}>
              Facturación
            </span>
          </button>
        </nav>
      </aside>

      {showFacturacion && <ModalFacturacion onClose={() => setShowFacturacion(false)} />}
    </>
  )
}
