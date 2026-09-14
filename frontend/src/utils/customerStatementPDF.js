import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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
  doc.text(`Musteri: ${customer.name}`, 14, 33)
  doc.setFont('helvetica', 'normal')
  doc.text(`Belge Tarihi: ${fmtDate(new Date())}`, pageW - 14, 33, { align: 'right' })

  // Line separator
  doc.setDrawColor(180)
  doc.setLineWidth(0.4)
  doc.line(14, 36, pageW - 14, 36)

  // Table
  const body = merged.map((r) => [
    fmtDate(r.date),
    r.type,
    r.product_name,
    r.harvest_year || '-',
    `${fmtNum(r.quantity)} ton`,
    `${fmtNum(r.price)} TL`,
    `${fmtNum(r.total)} TL`,
  ])

  autoTable(doc, {
    startY: 39,
    margin: { left: 14, right: 14 },
    head: [['Tarih', 'Islem Tipi', 'Urun', 'Hasat Yili', 'Miktar (Ton)', 'Fiyat (TL)', 'Toplam Tutar (TL)']],
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
    if (t.type === 'Emanet') {
      balances[t.product_name] = (balances[t.product_name] || 0) + t.quantity
    } else if (t.type === 'Emanetten Alis') {
      balances[t.product_name] = (balances[t.product_name] || 0) - t.quantity
    }
  }

  const activeBalances = Object.entries(balances).filter(([, v]) => v > 0)
  let y = doc.lastAutoTable.finalY + 10

  if (activeBalances.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Guncel Emanet Bakiye:', 14, y)
    y += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    for (const [product, qty] of activeBalances) {
      doc.text(`  ${product}: ${fmtNum(qty)} ton`, 14, y)
      y += 5
    }
  } else {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text('Guncel emanet bakiyesi bulunmamaktadir.', 14, y)
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
  doc.text('Musteri Imza', 52.5, sigY + 5, { align: 'center' })

  // Right signature
  doc.line(pageW - 85, sigY, pageW - 20, sigY)
  doc.text('Firma Yetkilisi Imza', pageW - 52.5, sigY + 5, { align: 'center' })

  // Footer note
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(140)
  doc.text(
    `Bu belge sistem tarafindan otomatik uretilmistir. ${fmtDate(new Date())} ${new Date().toLocaleTimeString('tr-TR')}`,
    pageW / 2,
    sigY + 14,
    { align: 'center' }
  )

  // Download
  const safeName = customer.name.replace(/[^\w\u00C0-\u024F]+/g, '_')
  doc.save(`${safeName}_Cari_Ekstre.pdf`)
}
