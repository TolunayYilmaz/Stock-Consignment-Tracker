import FileSaver from 'file-saver'

const saveAs = FileSaver.saveAs ?? FileSaver.default?.saveAs

const PRODUCTS = ['Arpa', 'Buğday', 'Mısır', 'Yağlık Ayçekirdeği', 'Çerezlik Çekirdek']

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF47762A' } }
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
const TOTAL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE8CE' } }
const TOTAL_FONT = { bold: true, size: 11 }

function fmtDate(d) {
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('tr-TR')
}

function headerRow(ws, headers) {
  const row = ws.addRow(headers)
  row.height = 20
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF36531F' } } }
  })
  return row
}

function styling(ws) {
  ws.views = [{ state: 'frozen', ySplit: 1 }]
  ws.eachRow((row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      cell.border = { top: { style: 'thin', color: { argb: 'FFEFE7DE' } }, bottom: { style: 'thin', color: { argb: 'FFEFE7DE' } } }
    })
  })
}

export function buildWorkbook({ customers = [], transactions = [], sales = [], dashboard = [] }, ExcelJS) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Stok Emanet Takip'
  wb.created = new Date()
  wb.calcProperties.fullCalcOnLoad = true

  const wsCustomers = wb.addWorksheet('Müşteri Listesi')
  wsCustomers.columns = [{ width: 32 }, ...PRODUCTS.map(() => ({ width: 18 }))]
  headerRow(wsCustomers, ['Müşteri Adı', ...PRODUCTS.map((p) => `${p} (ton)`)])
  for (const c of customers) {
    wsCustomers.addRow([c.name, ...PRODUCTS.map((p) => c.balances?.[p] ?? 0)])
  }
  styling(wsCustomers)

  const wsTx = wb.addWorksheet('İşlemler')
  wsTx.columns = [{ width: 12 }, { width: 30 }, { width: 14 }, { width: 20 }, { width: 13 }, { width: 13 }, { width: 16 }]
  headerRow(wsTx, ['Tarih', 'Müşteri', 'İşlem Tipi', 'Ürün', 'Miktar (ton)', 'Fiyat (₺/kg)', 'Toplam Tutar (TL)'])
  transactions.forEach((t, i) => {
    const r = i + 2
    wsTx.addRow([fmtDate(t.date), t.customer_name, t.type, t.product_name, t.quantity, t.price, null])
    wsTx.getCell(`G${r}`).value = { formula: `E${r}*F${r}`, result: +(t.quantity * t.price).toFixed(2) }
  })
  if (transactions.length) {
    const r = transactions.length + 2
    const row = wsTx.addRow([null, 'TOPLAM', null, null, null, null, null])
    row.getCell(2).font = TOTAL_FONT
    row.eachCell({ includeEmpty: true }, (cell) => (cell.fill = TOTAL_FILL))
    wsTx.getCell(`G${r}`).value = { formula: `SUM(G2:G${r - 1})` }
  }
  styling(wsTx)

  const wsSales = wb.addWorksheet('Satışlar')
  wsSales.columns = [{ width: 12 }, { width: 30 }, { width: 20 }, { width: 13 }, { width: 17 }, { width: 16 }]
  headerRow(wsSales, ['Tarih', 'Müşteri', 'Ürün', 'Miktar (ton)', 'Satış Fiyatı (₺/kg)', 'Toplam Tutar (TL)'])
  sales.forEach((s, i) => {
    const r = i + 2
    wsSales.addRow([fmtDate(s.date), s.customer_name, s.product_name, s.quantity, s.price, null])
    wsSales.getCell(`F${r}`).value = { formula: `D${r}*E${r}`, result: +(s.quantity * s.price).toFixed(2) }
  })
  if (sales.length) {
    const r = sales.length + 2
    const row = wsSales.addRow([null, 'TOPLAM', null, null, null, null])
    row.getCell(2).font = TOTAL_FONT
    row.eachCell({ includeEmpty: true }, (cell) => (cell.fill = TOTAL_FILL))
    wsSales.getCell(`F${r}`).value = { formula: `SUM(F2:F${r - 1})` }
  }
  styling(wsSales)

  const wsSum = wb.addWorksheet('Stok ve Kâr Özeti')
  wsSum.columns = [
    { width: 22 },
    { width: 16 },
    { width: 13 },
    { width: 17 },
    { width: 13 },
    { width: 15 },
    { width: 19 },
    { width: 15 },
  ]
  headerRow(wsSum, ['Ürün', 'Toplam Alış (ton)', 'Emanet (ton)', 'Fiziksel Stok (ton)', 'Satılan (ton)', 'Toplam Ciro (TL)', 'Ort. Alış Fiyatı (₺/kg)', 'Kâr/Zarar (TL)'])
  dashboard.forEach((d) => {
    wsSum.addRow([
      d.product_name,
      d.total_purchased_quantity,
      d.emanet_balance,
      d.physical_stock,
      d.sold_quantity,
      d.sold_amount,
      d.avg_buy_price,
      d.profit_loss,
    ])
  })
  styling(wsSum)

  const p = dashboard.length
  const salesDataRows = sales.length
  const summary = [
    ['TOPLAM STOK (ton)', p ? { formula: `SUM(D2:D${p + 1})` } : { result: 0 }],
    ['TOPLAM CİRO (TL)', salesDataRows ? { formula: `SUM('Satışlar'!F2:F${salesDataRows + 1})` } : { result: 0 }],
    ['GENEL KÂR/ZARAR (TL)', p ? { formula: `SUM(H2:H${p + 1})` } : { result: 0 }],
    [
      'ORT. SATIŞ FİYATI (₺/kg)',
      salesDataRows ? { formula: `AVERAGE('Satışlar'!E2:E${salesDataRows + 1})` } : { result: 0 },
    ],
  ]
  summary.forEach(([label, value], i) => {
    const r = p + 2 + i
    const l = wsSum.getCell(`A${r}`)
    l.value = label
    l.font = TOTAL_FONT
    l.fill = TOTAL_FILL
    const v = wsSum.getCell(`B${r}`)
    v.value = value
    v.font = TOTAL_FONT
    v.fill = TOTAL_FILL
  })

  return wb
}

export async function exportToExcel(data) {
  const mod = await import('exceljs')
  const ExcelJS = mod.default ?? mod
  const wb = buildWorkbook(data, ExcelJS)
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  saveAs(blob, `stok-emanet-export-${new Date().toISOString().slice(0, 10)}.xlsx`)
}