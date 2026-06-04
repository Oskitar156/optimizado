import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

router.get('/dashboard', autenticar, async (req, res) => {
  const esAdmin    = req.user.rol === 'ADMINISTRADOR'
  const usuarioId  = req.user.id
  const hoy        = new Date(); hoy.setHours(0, 0, 0, 0)
  const filtroUser = esAdmin ? {} : { usuarioId }

  const productosActivos     = await prisma.producto.findMany({ where: { activo: true } })
  const productosStockCritico = productosActivos
    .filter(p => p.stockActual <= p.stockMinimo)
    .sort((a, b) => a.stockActual - b.stockActual)

  const [ventasHoy, ultimasVentas, ultimosClientes] = await Promise.all([
    prisma.venta.aggregate({
      where: { ...filtroUser, fecha: { gte: hoy }, estado: 'COMPLETADA' },
      _sum: { total: true },
    }),
    prisma.venta.findMany({
      where: filtroUser,
      take: 5,
      orderBy: { fecha: 'desc' },
      include: { items: { include: { producto: true } }, usuario: { select: { nombre: true } } },
    }),
    esAdmin
      ? prisma.cliente.findMany({ take: 5, orderBy: { createdAt: 'desc' } })
      : prisma.cliente.findMany({
          where: { ventas: { some: { usuarioId } } },
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),
  ])

  res.json({
    ventasHoy:          ventasHoy._sum.total ?? 0,
    stockBajo:          productosStockCritico.length,
    ultimasVentas,
    ultimosClientes,
    productosAgotarse:  productosStockCritico,
    esAdmin,
  })
})

router.get('/ventas', autenticar, async (req, res) => {
  const esAdmin    = req.user.rol === 'ADMINISTRADOR'
  const { desde, hasta } = req.query
  const data = await prisma.venta.findMany({
    where: {
      ...(esAdmin ? {} : { usuarioId: req.user.id }),
      fecha: { gte: desde ? new Date(desde) : undefined, lte: hasta ? new Date(hasta) : undefined },
      estado: 'COMPLETADA',
    },
    include: { items: { include: { producto: true } }, cliente: true, usuario: { select: { nombre: true } } },
    orderBy: { fecha: 'desc' },
  })
  res.json(data)
})

export default router
