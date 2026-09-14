import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const trToEn = (text) => {
  if (!text) return text
  return text
    .toString()
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C')
}

const fmtDate = (d) => {
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '-'
  return dt.toLocaleDateString('tr-TR')
}

const fmtNum = (n) =>
  n != null ? Number(n).toLocaleString('tr-TR', { maximumFractionDigits: 3 }) : '0'

export function generateCustomerStatementPDF({ customer, transactions, sales }) {
  const txList = (transactions || [])
    .filter((t) => t.customer_name === customer.name)
    .map((t) => ({
      date: t.date,
      type: t.type,
      product_name: t.product_name,
      harvest_year: t.harvest_year,
      quantity: t.quantity,
      price: t.price,
      total: t.quantity * t.price,
    }))

  const saleList = (sales || [])
    .filter((s) => s.customer_name === customer.name)
    .map((s) => ({
      date: s.date,
      type: 'Satis',
      product_name: s.product_name,
      harvest_year: s.harvest_year,
      quantity: s.quantity,
      price: s.price,
      total: s.quantity * s.price,
    }))

  const merged = [...txList, ...saleList].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  )

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  // Header
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('OZYER TARIM & TICARET', pageW / 2, 18, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('MUSTERI CARI HESAP EKSTRESI', pageW / 2, 25, { align: 'center' })

  // Customer name and document date
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(trToEn(`Müşteri: ${customer.name}`), 14, 33)
  doc.setFont('helvetica', 'normal')
  doc.text(`Belge Tarihi: ${fmtDate(new Date())}`, pageW - 14, 33, { align: 'right' })

  // Line separator
  doc.setDrawColor(180)
  doc.setLineWidth(0.4)
  doc.line(14, 36, pageW - 14, 36)

  // Table
  const body = merged.map((r) => [
    fmtDate(r.date),
    trToEn(r.type),
    trToEn(r.product_name),
    r.harvest_year || '-',
    `${fmtNum(r.quantity)} ton`,
    `${fmtNum(r.price)} TL`,
    `${fmtNum(r.total)} TL`,
  ])

  autoTable(doc, {
    startY: 39,
    margin: { left: 14, right: 14 },
    head: [[
      'Tarih',
      trToEn('İşlem Tipi'),
      trToEn('Ürün'),
      trToEn('Hasat Yılı'),
      'Miktar (Ton)',
      'Fiyat (TL)',
      'Toplam Tutar (TL)',
    ]],
    body,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, halign: 'center', valign: 'middle' },
    headStyles: { fillColor: [34, 87, 122], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 24 },
      2: { cellWidth: 30 },
      3: { cellWidth: 18 },
      4: { cellWidth: 24 },
      5: { cellWidth: 24 },
      6: { cellWidth: 30 },
    },
  })

  // Emanet balance summary
  const balances = {}
  for (const t of txList) {
    const type = trToEn(t.type)
    if (type === 'Emanet') {
      balances[t.product_name] = (balances[t.product_name] || 0) + t.quantity
    } else if (type === 'Emanetten Alis') {
      balances[t.product_name] = (balances[t.product_name] || 0) - t.quantity
    }
  }

  const activeBalances = Object.entries(balances).filter(([, v]) => v > 0)
  let y = doc.lastAutoTable.finalY + 10

  if (activeBalances.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(trToEn('Güncel Emanet Bakiye:'), 14, y)
    y += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    for (const [product, qty] of activeBalances) {
      doc.text(`  ${trToEn(product)}: ${fmtNum(qty)} ton`, 14, y)
      y += 5
    }
  } else {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text(trToEn('Güncel emanet bakiyesi bulunmamaktadır.'), 14, y)
    y += 6
  }

  // Signature area
  const sigY = Math.max(y + 10, 260)
  doc.setDrawColor(120)
  doc.setLineWidth(0.3)

  // Left signature
  doc.line(20, sigY, 85, sigY)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(trToEn('Müşteri İmza'), 52.5, sigY + 5, { align: 'center' })

  // Right signature
  doc.line(pageW - 85, sigY, pageW - 20, sigY)
  doc.text(trToEn('Firma Yetkilisi İmza'), pageW - 52.5, sigY + 5, { align: 'center' })

  // Footer note
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(140)
  doc.text(
    trToEn(`Bu belge sistem tarafından otomatik üretilmiştir.`) + ` ${fmtDate(new Date())} ${new Date().toLocaleTimeString('tr-TR')}`,
    pageW / 2,
    sigY + 14,
    { align: 'center' }
  )

  // Download
  const safeName = trToEn(customer.name).replace(/[^\w]+/g, '_')
  doc.save(`${safeName}_Cari_Ekstre.pdf`)
}
