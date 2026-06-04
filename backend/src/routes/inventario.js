import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

const clasificarAlerta = ({ stockActual, stockMinimo }) => {
  if (stockActual === 0)                        return 'AGOTADO'
  if (stockActual <= stockMinimo * 0.5)         return 'CRÍTICO'
  if (stockActual <= stockMinimo)               return 'BAJO'
  return 'OK'
}

router.get('/', autenticar, async (_, res) => {
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    include: { proveedor: { select: { nombre: true } } },
    orderBy: { stockActual: 'asc' },
  })
  res.json(productos.map(p => ({ ...p, alerta: clasificarAlerta(p) })))
})

export default router
