import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirAdmin } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

/* ── Login ── */
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña requeridos' })

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user?.activo || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Credenciales incorrectas' })

    const token = jwt.sign(
      { id: user.id, rol: user.rol, nombre: user.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )
    res.json({ token, user: { id: user.id, nombre: user.nombre, rol: user.rol, email: user.email } })
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

/* ── Registrar usuario (solo admin) ── */
router.post('/register', autenticar, requerirAdmin, async (req, res) => {
  const { email, password, nombre, rol } = req.body
  if (!email || !password || !nombre)
    return res.status(400).json({ error: 'Email, contraseña y nombre son requeridos' })

  try {
    if (await prisma.user.findUnique({ where: { email } }))
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' })

    const user = await prisma.user.create({
      data: { email, password: await bcrypt.hash(password, 10), nombre, rol: rol || 'VENDEDOR' },
      select: { id: true, nombre: true, email: true, rol: true, createdAt: true },
    })
    res.status(201).json({ message: 'Usuario creado exitosamente', user })
  } catch {
    res.status(500).json({ error: 'Error al crear el usuario' })
  }
})

/* ── Cambiar contraseña ── */
router.put('/cambiar-password', autenticar, async (req, res) => {
  const { passwordActual, passwordNueva } = req.body
  if (!passwordActual || !passwordNueva)
    return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' })
  if (passwordNueva.length < 6)
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' })

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    const valid = await bcrypt.compare(passwordActual, user.password)
    const validDirect = passwordActual === user.password // fallback por compatibilidad
    if (!valid && !validDirect)
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' })

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(passwordNueva, 10) },
    })
    res.json({ message: 'Contraseña actualizada exitosamente' })
  } catch {
    res.status(500).json({ error: 'Error al cambiar la contraseña' })
  }
})

/* ── Alertas ── */
router.get('/alertas', autenticar, async (_, res) => {
  try {
    const [productos, ordenesPendientes] = await Promise.all([
      prisma.producto.findMany({ where: { activo: true }, orderBy: { stockActual: 'asc' } }),
      prisma.ordenCompra.findMany({
        where: { estado: 'PENDIENTE' },
        include: { proveedor: { select: { nombre: true } } },
        orderBy: { fecha: 'desc' },
        take: 5,
      }),
    ])

    const stockBajo = productos.filter(p => p.stockActual <= p.stockMinimo).slice(0, 10)

    const alertas = [
      ...stockBajo.map(p => ({
        id: `stock-${p.id}`,
        tipo: p.stockActual === 0 ? 'agotado' : 'stock_bajo',
        titulo: p.stockActual === 0 ? 'Producto Agotado' : 'Stock Bajo',
        mensaje: `${p.nombre} tiene ${p.stockActual} unidades (mín: ${p.stockMinimo})`,
        fecha: p.createdAt,
      })),
      ...ordenesPendientes.map(o => ({
        id: `orden-${o.id}`,
        tipo: 'orden_pendiente',
        titulo: 'Orden Pendiente',
        mensaje: `La orden #${o.id} de ${o.proveedor.nombre} está pendiente. Fecha de entrega: ${
          o.fechaEntrega
            ? new Date(o.fechaEntrega).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Sin fecha asignada'
        }`,
        fecha: o.fecha,
      })),
    ]

    res.json({ alertas, total: alertas.length })
  } catch {
    res.status(500).json({ error: 'Error al cargar alertas' })
  }
})

export default router
