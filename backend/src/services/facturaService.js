import PDFDocument from 'pdfkit'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/* ── Helpers ── */
const pad       = (n, len = 4) => String(n).padStart(len, '0')
const dinero    = (n) => n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fecha     = (d) => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
const hexARgb   = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))

/* ── Configuración de empresa ── */
async function obtenerConfig() {
  return prisma.configuracionEmpresa.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } })
}

/* ── Número de factura correlativo ── */
export async function generarNumeroFactura(tx) {
  const ultima = await (tx || prisma).venta.findFirst({
    where: { numeroFactura: { not: null } },
    orderBy: { id: 'desc' },
    select: { numeroFactura: true },
  })
  const siguiente = ultima ? parseInt(ultima.numeroFactura.replace('FAC-', ''), 10) + 1 : 1
  return `FAC-${pad(siguiente)}`
}

/* ── XML UBL 2.1 ── */
export function generarXml(venta, config) {
  const iso   = new Date(venta.fecha).toISOString()
  const dFecha = iso.split('T')[0]
  const dHora  = iso.split('T')[1].slice(0, 8)

  let totalIva = 0
  const lineas = venta.items.map((item, idx) => {
    const iva = item.cantidad * (item.producto?.precioCompra || 0) * 19 / 119
    totalIva += iva
    return `
    <cac:InvoiceLine>
      <cbc:ID>${idx + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="EA">${item.cantidad}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="COP">${(item.cantidad * item.precioUnit).toFixed(2)}</cbc:LineExtensionAmount>
      <cac:Item><cbc:Description>${item.producto?.nombre || 'Producto'}</cbc:Description></cac:Item>
      <cac:Price><cbc:PriceAmount currencyID="COP">${item.precioUnit.toFixed(2)}</cbc:PriceAmount></cac:Price>
    </cac:InvoiceLine>`
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>DIAN 2.1</cbc:CustomizationID>
  <cbc:ID>${venta.numeroFactura}</cbc:ID>
  <cbc:IssueDate>${dFecha}</cbc:IssueDate>
  <cbc:IssueTime>${dHora}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty><cac:Party>
    <cac:PartyName><cbc:Name>${config.nombre}</cbc:Name></cac:PartyName>
    <cac:PartyTaxScheme>
      <cbc:CompanyID>${config.nit}</cbc:CompanyID>
      <cbc:TaxLevelCode>NO_RESPONSABLE_IVA</cbc:TaxLevelCode>
      <cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme>
    </cac:PartyTaxScheme>
    <cac:PartyLegalEntity><cbc:RegistrationName>${config.nombre}</cbc:RegistrationName></cac:PartyLegalEntity>
    <cac:Contact>
      <cbc:Telephone>${config.telefono}</cbc:Telephone>
      <cbc:ElectronicMail>${config.correo}</cbc:ElectronicMail>
    </cac:Contact>
    <cac:PhysicalLocation><cac:Address><cbc:Line>${config.direccion}</cbc:Line></cac:Address></cac:PhysicalLocation>
  </cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party>
    <cac:PartyName><cbc:Name>${venta.cliente?.nombre || 'Consumidor Final'}</cbc:Name></cac:PartyName>
    <cac:PartyTaxScheme>
      <cbc:CompanyID>${venta.cliente?.identificacion || '000000000'}</cbc:CompanyID>
      <cac:TaxScheme><cbc:ID>01</cbc:ID></cac:TaxScheme>
    </cac:PartyTaxScheme>
  </cac:Party></cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="COP">${totalIva.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="COP">${venta.total.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="COP">${totalIva.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>0.00</cbc:Percent>
        <cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${venta.total.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${venta.total.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">${venta.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="COP">${venta.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lineas.join('')}
</Invoice>`
}

/* ── PDF ── */
export function generarPdf(venta, config) {
  return new Promise((resolve, reject) => {
    const doc      = new PDFDocument({ size: 'LETTER', margin: 50 })
    const buffers  = []
    doc.on('data', chunk => buffers.push(chunk))
    doc.on('end',  () => resolve(Buffer.concat(buffers)))
    doc.on('error', reject)

    const accent = hexARgb(config.colorPrimario || '#f97316')
    const W      = doc.page.width - 100

    // Header
    doc.fontSize(18).font('Helvetica-Bold').fillColor(accent).text(config.nombre, 50, 50)
    doc.fontSize(8).font('Helvetica').fillColor('#666666')
      .text(`NIT: ${config.nit}`, 50, 75)
      .text(config.direccion, 50, 87)
      .text(config.correo, 50, 102)
      .text(config.telefono, 220, 102)
      .text(config.web, 380, 102)

    doc.moveTo(50, 122).lineTo(50 + W, 122).strokeColor(accent).lineWidth(2).stroke()

    // Título
    doc.fontSize(26).font('Helvetica-Bold').fillColor('#1a1a1a')
    const titulo  = 'F   A   C   T   U   R   A'
    doc.text(titulo, (doc.page.width - doc.widthOfString(titulo)) / 2, 138)

    // Info factura
    const iY = 180
    const [c1, c2, c3, c4] = [50, 200, 320, 440]
    const infoFila = (y, label1, val1, label2, val2, bg) => {
      doc.rect(50, y, W, 20).fill(bg)
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#444444')
        .text(label1, c1 + 5, y + 6)
      if (label2) doc.text(label2, c3 + 5, y + 6)
      doc.fontSize(8).font('Helvetica').fillColor('#333333')
        .text(val1, c2 + 5, y + 6)
      if (val2) doc.text(val2, c4 + 5, y + 6)
    }
    infoFila(iY,      'Fecha de la factura', fecha(venta.fecha), 'N.° de factura', venta.numeroFactura, '#f0f0f0')
    infoFila(iY + 20, '', fecha(venta.fecha), '', venta.numeroFactura, '#ffffff')
    infoFila(iY + 38, 'Destinatario', venta.cliente?.nombre || 'Consumidor Final', venta.cliente?.identificacion ? 'ID: ' + venta.cliente.identificacion : '', '', '#f0f0f0')
    infoFila(iY + 58, 'Vendedor', venta.usuario?.nombre || '—', '', '', '#ffffff')

    // Tabla productos
    const tY = iY + 95
    doc.rect(50, tY, W, 28).fill(accent)
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff')
      .text('Cantidad', 60, tY + 9)
      .text('Descripción', 130, tY + 9)
      .text('Precio unitario', 375, tY + 9)
      .text('Total', 475, tY + 9)

    let rowY = tY + 28
    venta.items.forEach((item, idx) => {
      doc.rect(50, rowY, W, 22).fill(idx % 2 === 0 ? '#ffffff' : '#fafafa')
      doc.fontSize(8).font('Helvetica').fillColor('#333333')
        .text(String(item.cantidad), 60, rowY + 6, { width: 60 })
        .text(item.producto?.nombre || 'Producto', 130, rowY + 6, { width: 240 })
        .text(`$${dinero(item.precioUnit)}`, 375, rowY + 6, { width: 80 })
        .text(`$${dinero(item.subtotal)}`, 465, rowY + 6, { width: 80 })
      rowY += 22
    })

    // Filas vacías (mínimo 5 filas)
    for (let i = 0; i < Math.max(0, 5 - venta.items.length); i++) {
      doc.rect(50, rowY, W, 22).fill((venta.items.length + i) % 2 === 0 ? '#ffffff' : '#fafafa')
      rowY += 22
    }

    doc.moveTo(50, rowY).lineTo(50 + W, rowY).strokeColor('#e0e0e0').lineWidth(0.5).stroke()

    // Totales
    const tX  = 320
    const tVX = 465
    const tRY = rowY + 12
    let ivaTotal = 0
    venta.items.forEach(item => { ivaTotal += item.cantidad * (item.producto?.precioCompra || 0) * 19 / 119 })

    doc.fontSize(8).font('Helvetica').fillColor('#555555')
      .text('Subtotal',              tX, tRY,      { width: 90, align: 'right' })
      .text(`$${dinero(venta.total)}`, tVX, tRY,  { width: 80 })
      .text('Impuesto (IVA costo)',  tX, tRY + 18, { width: 90, align: 'right' })
      .text(`$${dinero(ivaTotal)}`,   tVX, tRY + 18, { width: 80 })

    doc.rect(tX - 5, tRY + 38, W - tX + 55, 22).fill(accent)
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
      .text('Total debido',              tX, tRY + 43, { width: 90, align: 'right' })
      .text(`$${dinero(venta.total)}`,   tVX, tRY + 43, { width: 80 })

    // Footer
    const fY = doc.page.height - 80
    doc.moveTo(50, fY).lineTo(50 + W, fY).strokeColor('#e0e0e0').lineWidth(0.5).stroke()
    const pie = config.piePagina || '¡Gracias por su confianza!'
    doc.fontSize(12).font('Helvetica-Bold').fillColor(accent)
      .text(pie, doc.page.width - doc.widthOfString(pie) - 50, fY + 15)

    doc.end()
  })
}

/* ── Orquestador ── */
async function obtenerVentaParaFactura(ventaId) {
  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    include: { cliente: true, usuario: { select: { nombre: true } }, items: { include: { producto: true } } },
  })
  if (!venta) throw new Error('Venta no encontrada')

  const config = await obtenerConfig()

  if (!venta.numeroFactura) {
    venta.numeroFactura = await generarNumeroFactura()
    await prisma.venta.update({ where: { id: ventaId }, data: { numeroFactura: venta.numeroFactura } })
  }

  if (!venta.xmlFactura) {
    venta.xmlFactura = generarXml(venta, config)
    await prisma.venta.update({ where: { id: ventaId }, data: { xmlFactura: venta.xmlFactura } })
  }

  return { venta, config }
}

export async function obtenerPdf(ventaId) {
  const { venta, config } = await obtenerVentaParaFactura(ventaId)
  return { pdfBuffer: await generarPdf(venta, config), venta }
}

export async function obtenerXml(ventaId) {
  const { venta } = await obtenerVentaParaFactura(ventaId)
  return venta.xmlFactura
}
