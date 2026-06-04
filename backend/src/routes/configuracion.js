import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirAdmin } from '../middleware/auth.js'
import { exec } from 'child_process'
import { promisify } from 'util'

const router    = Router()
const prisma    = new PrismaClient()
const execAsync = promisify(exec)

router.get('/empresa', autenticar, async (_, res) => {
  try {
    const config = await prisma.configuracionEmpresa.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    })
    res.json(config)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/empresa', autenticar, async (req, res) => {
  const { nombre, nit, direccion, telefono, correo, web, colorPrimario, piePagina, mostrarLogo } = req.body
  try {
    const config = await prisma.configuracionEmpresa.upsert({
      where: { id: 1 },
      update: { nombre, nit, direccion, telefono, correo, web, colorPrimario, piePagina, mostrarLogo },
      create: { id: 1, nombre, nit, direccion, telefono, correo, web, colorPrimario, piePagina, mostrarLogo },
    })
    res.json(config)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.post('/backup-sql', autenticar, requerirAdmin, async (req, res) => {
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!directUrl) return res.status(500).json({ error: 'No se encontró la URL de conexión a la base de datos' })

  const fecha    = new Date().toISOString().slice(0, 10)
  const filename = `stocklat_backup_${fecha}.sql`

  try {
    const { stdout } = await execAsync(
      `pg_dump "${directUrl}" --no-password --schema=public`,
      { maxBuffer: 50 * 1024 * 1024, timeout: 60_000 }
    )
    res.setHeader('Content-Type', 'application/sql')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(stdout)
  } catch {
    // pg_dump no disponible → exportar JSON estructurado
    try {
      const [users, productos, clientes, ventas, items, proveedores, compras, itemsCompra, config] =
        await Promise.all([
          prisma.user.findMany(),
          prisma.producto.findMany(),
          prisma.cliente.findMany(),
          prisma.venta.findMany({ include: { items: true } }),
          prisma.itemVenta.findMany(),
          prisma.proveedor.findMany(),
          prisma.ordenCompra.findMany(),
          prisma.itemOrdenCompra.findMany(),
          prisma.configuracionEmpresa.findMany(),
        ])

      const backup = {
        version: '1.0',
        fechaBackup: new Date().toISOString(),
        sistema: 'Stocklat',
        nota: 'pg_dump no disponible. Instala PostgreSQL CLI para obtener backup SQL completo.',
        tablas: { users, productos, clientes, ventas, itemsVenta: items, proveedores, ordenesCompra: compras, itemsOrdenCompra: itemsCompra, configuracionEmpresa: config },
      }

      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="stocklat_backup_${fecha}.json"`)
      res.send(JSON.stringify(backup, null, 2))
    } catch (dbErr) {
      res.status(500).json({ error: 'Error al generar el respaldo: ' + dbErr.message })
    }
  }
})

export default router
