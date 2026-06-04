import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirAdmin } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

router.get('/', autenticar, async (_, res) => {
  const data = await prisma.ordenCompra.findMany({
    include: { proveedor: true, items: { include: { producto: true } } },
    orderBy: { fecha: 'desc' },
  })
  res.json(data)
})

router.post('/', autenticar, requerirAdmin, async (req, res) => {
  const { proveedorId, items, notas, fechaEntrega } = req.body
  try {
    const total = items.reduce((acc, i) => acc + Number(i.cantidad) * Number(i.precioUnit), 0)
    const orden = await prisma.ordenCompra.create({
      data: {
        proveedorId: parseInt(proveedorId),
        total,
        notas,
        fechaEntrega: fechaEntrega ? new Date(fechaEntrega) : null,
        items: {
          create: items.map(i => ({
            productoId: parseInt(i.productoId),
            cantidad:   Number(i.cantidad),
            precioUnit: Number(i.precioUnit),
            subtotal:   Number(i.cantidad) * Number(i.precioUnit),
          })),
        },
      },
      include: { items: true },
    })
    res.status(201).json(orden)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.put('/:id/recibir', autenticar, requerirAdmin, async (req, res) => {
  const id = parseInt(req.params.id)
  try {
    await prisma.$transaction(async (tx) => {
      const orden = await tx.ordenCompra.findUnique({ where: { id }, include: { items: true } })
      if (!orden || orden.estado !== 'PENDIENTE') throw new Error('Orden no válida')
      for (const item of orden.items)
        await tx.producto.update({ where: { id: item.productoId }, data: { stockActual: { increment: item.cantidad } } })
      await tx.ordenCompra.update({ where: { id }, data: { estado: 'RECIBIDA' } })
    }, { timeout: 30000 })
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.put('/:id/cancelar', autenticar, requerirAdmin, async (req, res) => {
  await prisma.ordenCompra.update({ where: { id: parseInt(req.params.id) }, data: { estado: 'CANCELADA' } })
  res.json({ ok: true })
})

export default router
