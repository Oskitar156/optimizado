const VARIANTS = {
  amber:  'bg-amber-500 hover:bg-amber-600 shadow-amber-100',
  orange: 'bg-orange-500 hover:bg-orange-600 shadow-orange-100',
  blue:   'bg-blue-600 hover:bg-blue-700 shadow-blue-100',
  indigo: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100',
  red:    'bg-red-500 hover:bg-red-600 shadow-red-100',
  violet: 'bg-violet-600 hover:bg-violet-700 shadow-violet-100',
  purple: 'bg-purple-600 hover:bg-purple-700 shadow-purple-100',
}

export default function Button({ children, variant = 'amber', icon: Icon, onClick, className = '', type = 'button', ...props }) {
  return (
    <button type={type} onClick={onClick}
      className={`flex items-center justify-center gap-2 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${VARIANTS[variant] ?? VARIANTS.amber} ${className}`}
      {...props}>
      {Icon && <Icon size={16} />}
      {children && <span>{children}</span>}
    </button>
  )
}
