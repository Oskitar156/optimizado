import { Router } from 'express'
import { autenticar } from '../middleware/auth.js'
import { obtenerPdf, obtenerXml } from '../services/facturaService.js'

const router = Router()

router.get('/:id/factura/pdf', autenticar, async (req, res) => {
  try {
    const { pdfBuffer, venta } = await obtenerPdf(parseInt(req.params.id))
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${venta.numeroFactura}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    res.send(pdfBuffer)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.get('/:id/factura/xml', autenticar, async (req, res) => {
  try {
    const xml = await obtenerXml(parseInt(req.params.id))
    res.setHeader('Content-Type', 'application/xml')
    res.send(xml)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

export default router
