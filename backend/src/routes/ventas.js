import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirAdmin } from '../middleware/auth.js'
import { generarNumeroFactura } from '../services/facturaService.js'

const router = Router()
const prisma = new PrismaClient()

router.get('/', autenticar, async (req, res) => {
  try {
    const esAdmin  = req.user.rol === 'ADMINISTRADOR'
    const filtro   = esAdmin ? {} : { usuarioId: parseInt(req.user.id) }
    const data     = await prisma.venta.findMany({
      where: filtro,
      include: { cliente: true, usuario: { select: { nombre: true } }, items: { include: { producto: true } } },
      orderBy: { fecha: 'desc' },
    })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', autenticar, async (req, res) => {
  const { clienteId, items, notas } = req.body
  try {
    const venta = await prisma.$transaction(async (tx) => {
      let total = 0
      const itemsData = []

      for (const item of items) {
        const producto = await tx.producto.findUnique({ where: { id: item.productoId } })
        if (!producto || producto.stockActual < item.cantidad)
          throw new Error(`Stock insuficiente para ${producto?.nombre ?? item.productoId}`)

        const subtotal = item.cantidad * item.precioUnit
        total += subtotal
        itemsData.push({ productoId: item.productoId, cantidad: item.cantidad, precioUnit: item.precioUnit, subtotal })
        await tx.producto.update({ where: { id: item.productoId }, data: { stockActual: { decrement: item.cantidad } } })
      }

      const numeroFactura = await generarNumeroFactura(tx)
      const venta = await tx.venta.create({
        data: { total, notas, usuarioId: req.user.id, clienteId: clienteId ?? null, numeroFactura, items: { create: itemsData } },
        include: { items: true },
      })

      if (clienteId)
        await tx.cliente.update({ where: { id: clienteId }, data: { totalCompras: { increment: total } } })

      return venta
    }, { timeout: 30000 })

    res.status(201).json(venta)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.put('/:id/anular', autenticar, requerirAdmin, async (req, res) => {
  const id = parseInt(req.params.id)
  try {
    await prisma.$transaction(async (tx) => {
      const venta = await tx.venta.findUnique({ where: { id }, include: { items: true } })
      if (!venta || venta.estado === 'ANULADA') throw new Error('Venta no válida')
      for (const item of venta.items)
        await tx.producto.update({ where: { id: item.productoId }, data: { stockActual: { increment: item.cantidad } } })
      await tx.venta.update({ where: { id }, data: { estado: 'ANULADA' } })
    }, { timeout: 30000 })
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

export default router
