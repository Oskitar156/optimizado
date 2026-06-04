import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirAdmin } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

const validar = ({ nombre, telefono, nit }) => {
  if (!nombre || !telefono) return 'Nombre y teléfono son obligatorios'
  if (nit && nit.replace(/\D/g, '').length !== 10) return 'El NIT debe tener exactamente 10 dígitos (9 + DV)'
}

router.get('/', autenticar, async (_, res) => {
  const data = await prisma.proveedor.findMany({ orderBy: { nombre: 'asc' } })
  res.json(data)
})

router.post('/', autenticar, requerirAdmin, async (req, res) => {
  const err = validar(req.body)
  if (err) return res.status(400).json({ error: err })
  const { nombre, telefono, nit, direccion, notas } = req.body
  const data = await prisma.proveedor.create({ data: { nombre, telefono, nit, direccion, notas } })
  res.status(201).json(data)
})

router.put('/:id', autenticar, requerirAdmin, async (req, res) => {
  const err = validar(req.body)
  if (err) return res.status(400).json({ error: err })
  const { nombre, telefono, nit, direccion, notas } = req.body
  const data = await prisma.proveedor.update({
    where: { id: parseInt(req.params.id) },
    data: { nombre, telefono, nit, direccion, notas },
  })
  res.json(data)
})

router.put('/:id/toggle-activo', autenticar, requerirAdmin, async (req, res) => {
  const id = parseInt(req.params.id)
  const p  = await prisma.proveedor.findUnique({ where: { id } })
  const data = await prisma.proveedor.update({ where: { id }, data: { activo: !p.activo } })
  res.json(data)
})

router.delete('/:id', autenticar, requerirAdmin, async (req, res) => {
  const id = parseInt(req.params.id)
  try {
    const activos = await prisma.producto.count({ where: { proveedorId: id, activo: true } })
    if (activos > 0)
      return res.status(409).json({ error: `No se puede eliminar: tiene ${activos} producto(s) activo(s) asociado(s).` })
    await prisma.proveedor.delete({ where: { id } })
    res.json({ ok: true })
  } catch (e) {
    if (e.code === 'P2003') return res.status(409).json({ error: 'No se puede eliminar: tiene registros de compras asociados.' })
    res.status(500).json({ error: 'Error al eliminar proveedor' })
  }
})

export default router
