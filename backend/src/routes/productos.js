import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirAdmin } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

const validarCampos = ({ nombre, proveedorId, precioCompra, precioVenta }) => {
  if (!nombre || !proveedorId || precioCompra <= 0 || precioVenta <= 0)
    return 'Nombre, proveedor y precios (mayores a 0) son obligatorios'
}

router.get('/', autenticar, async (_, res) => {
  try {
    const productos = await prisma.producto.findMany({
      where: { activo: true },
      include: { proveedor: { select: { nombre: true } } },
      orderBy: { nombre: 'asc' },
    })
    res.json(productos)
  } catch {
    res.status(500).json({ error: 'Error al obtener productos' })
  }
})

router.post('/', autenticar, requerirAdmin, async (req, res) => {
  const { nombre, precioCompra, precioVenta, stockActual, stockMinimo, proveedorId } = req.body
  const err = validarCampos(req.body)
  if (err) return res.status(400).json({ error: err })

  try {
    const producto = await prisma.producto.create({
      data: { nombre, precioCompra, precioVenta, stockActual: stockActual ?? 0, stockMinimo: stockMinimo ?? 5, proveedorId },
    })
    res.status(201).json(producto)
  } catch {
    res.status(500).json({ error: 'Error al crear producto' })
  }
})

router.put('/:id', autenticar, requerirAdmin, async (req, res) => {
  const err = validarCampos(req.body)
  if (err) return res.status(400).json({ error: err })

  const { nombre, precioCompra, precioVenta, stockMinimo, proveedorId } = req.body
  try {
    const producto = await prisma.producto.update({
      where: { id: parseInt(req.params.id) },
      data: { nombre, precioCompra, precioVenta, stockMinimo, proveedorId },
    })
    res.json(producto)
  } catch {
    res.status(500).json({ error: 'Error al actualizar producto' })
  }
})

router.delete('/:id', autenticar, requerirAdmin, async (req, res) => {
  const id = parseInt(req.params.id)
  try {
    const producto = await prisma.producto.findUnique({ where: { id } })
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' })
    if (producto.stockActual > 0)
      return res.status(409).json({ error: `No se puede eliminar: tiene ${producto.stockActual} unidades en stock.` })

    try {
      await prisma.producto.delete({ where: { id } })
      res.json({ ok: true, deleted: true })
    } catch (e) {
      if (e.code === 'P2003') {
        await prisma.producto.update({ where: { id }, data: { activo: false } })
        return res.json({ ok: true, deactivated: true })
      }
      throw e
    }
  } catch {
    res.status(500).json({ error: 'Error al eliminar producto' })
  }
})

export default router
