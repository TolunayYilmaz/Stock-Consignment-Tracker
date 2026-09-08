import FileSaver from 'file-saver'

const saveAs = FileSaver.saveAs ?? FileSaver.default?.saveAs

const PRODUCTS = ['Arpa', 'Buğday', 'Mısır', 'Yağlık Ayçekirdeği', 'Çerezlik Çekirdek']
const MAX_ROW = 500
const PRODUCT_LIST = `"${PRODUCTS.join(',')}"`
const TYPE_LIST = '"Normal Alış,Emanet,Emanetten Alış"'
const CUSTOMER_LIST = `='Müşteri Listesi'!$B$2:$B$${MAX_ROW}`

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F75B5' } }
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
const TON_FMT = '#,##0.00'
const TL_FMT = '#,##0.00 "TL"'

function addListValidation(ws, col, listFormula, allowBlank = true) {
  ws.dataValidations.add(`${col}2:${col}${MAX_ROW}`, {
    type: 'list',
    allowBlank,
    showErrorMessage: true,
    errorTitle: 'Geçersiz değer',
    error: 'Lütfen açılır listeden bir değer seçin.',
    formulae: [listFormula],
  })
}

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
  })
  return row
}

export function buildWorkbook({ customers = [], transactions = [], sales = [] }, ExcelJS) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Stok Emanet Takip'
  wb.created = new Date()
  wb.calcProperties.fullCalcOnLoad = true

  const wsTx = wb.addWorksheet('İşlemler')
  wsTx.views = [{ state: 'frozen', ySplit: 1 }]
  wsTx.columns = [{ width: 13 }, { width: 25 }, { width: 14 }, { width: 7 }, { width: 15 }, { width: 28 }, { width: 35 }, { width: 35 }]
  headerRow(wsTx, ['Tarih', 'Müşteri', 'İşlem Türü', 'Ürün', 'Miktar (Ton)', 'Fiyat (TL)', 'Toplam Tutar (TL)', 'Güncel Kalan Emanet (Ton)'])
  addListValidation(wsTx, 'B', CUSTOMER_LIST)
  addListValidation(wsTx, 'C', TYPE_LIST)
  addListValidation(wsTx, 'D', PRODUCT_LIST)

  const wsSales = wb.addWorksheet('Satışlar')
  wsSales.views = [{ state: 'frozen', ySplit: 1 }]
  wsSales.columns = [{ width: 13 }, { width: 25 }, { width: 9 }, { width: 15 }, { width: 20 }, { width: 35 }]
  headerRow(wsSales, ['Tarih', 'Müşteri (Satılan Kişi)', 'Ürün', 'Miktar (Ton)', 'Satış Fiyatı (TL)', 'Toplam Tutar (TL)'])
  addListValidation(wsSales, 'B', CUSTOMER_LIST)
  addListValidation(wsSales, 'C', PRODUCT_LIST)

  const wsCustomers = wb.addWorksheet('Müşteri Listesi')
  wsCustomers.views = [{ state: 'frozen', ySplit: 1 }]
  wsCustomers.columns = [{ width: 35 }, { width: 30 }, { width: 35 }, { width: 35 }, { width: 35 }, { width: 35 }, { width: 35 }]
  headerRow(wsCustomers, [
    'Müşteri No',
    'Müşteri Adı Soyadı',
    ...PRODUCTS.map((p) => `Kalan ${p} Emanet (Ton)`),
  ])
  wsCustomers.dataValidations.add(`B2:B${MAX_ROW}`, {
    type: 'custom',
    allowBlank: false,
    showErrorMessage: true,
    errorTitle: 'Yinelenen müşteri',
    error: 'Aynı müşteri adı birden fazla kez kullanılamaz.',
    formulae: ['COUNTIF($B$2:$B$500, B2)<=1'],
  })

  const wsSum = wb.addWorksheet('Stok ve Kâr Özeti')
  wsSum.views = [{ state: 'frozen', ySplit: 1 }]
  wsSum.columns = [{ width: 25 }, { width: 35 }, { width: 35 }, { width: 35 }, { width: 26 }, { width: 35 }, { width: 35 }, { width: 24 }, { width: 27 }]
  headerRow(wsSum, [
    'Ürün',
    'Satın Alınan Toplam (Ton)',
    'Satın Alınmayan Emanet Toplam (Ton)',
    'Satılan Toplam (Ton)',
    'Güncel Depo Stoğu (Ton)',
    'Ort. Alış Fiyatı (TL)',
    'Ort. Satış Fiyatı (TL)',
    'Toplam Kâr/Zarar (TL)',
    'Ton Başına Ort. Kâr (TL)',
  ])

  const txMul = (r) => `IF(AND(ISNUMBER(E${r}), ISNUMBER(F${r})), E${r}*F${r}, 0)`
  const txRunning = (r) =>
    `IF(C${r}="","",IF(OR(C${r}="Emanet", C${r}="Emanetten Alış"), SUMIFS(E$2:E${r}, B$2:B${r}, B${r}, D$2:D${r}, D${r}, C$2:C${r}, "Emanet") - SUMIFS(E$2:E${r}, B$2:B${r}, B${r}, D$2:D${r}, D${r}, C$2:C${r}, "Emanetten Alış"), "-"))`

  transactions.forEach((t, i) => {
    const r = i + 2
    wsTx.getCell(`A${r}`).value = fmtDate(t.date)
    wsTx.getCell(`B${r}`).value = t.customer_name
    wsTx.getCell(`C${r}`).value = t.type
    wsTx.getCell(`D${r}`).value = t.product_name
    wsTx.getCell(`E${r}`).value = t.quantity
    wsTx.getCell(`E${r}`).numFmt = TON_FMT
    wsTx.getCell(`F${r}`).value = t.price
    wsTx.getCell(`F${r}`).numFmt = TL_FMT
    wsTx.getCell(`G${r}`).value = { formula: txMul(r) }
    wsTx.getCell(`G${r}`).numFmt = TL_FMT
    wsTx.getCell(`H${r}`).value = { formula: txRunning(r) }
    wsTx.getCell(`H${r}`).numFmt = TON_FMT
  })
  for (let r = transactions.length + 2; r <= MAX_ROW; r++) {
    wsTx.getCell(`F${r}`).value = { formula: `IF(C${r}="Emanet", 0, "")` }
    wsTx.getCell(`F${r}`).numFmt = TL_FMT
    wsTx.getCell(`G${r}`).value = { formula: txMul(r) }
    wsTx.getCell(`G${r}`).numFmt = TL_FMT
    wsTx.getCell(`H${r}`).value = { formula: txRunning(r) }
    wsTx.getCell(`H${r}`).numFmt = TON_FMT
  }

  sales.forEach((s, i) => {
    const r = i + 2
    wsSales.getCell(`A${r}`).value = fmtDate(s.date)
    wsSales.getCell(`B${r}`).value = s.customer_name
    wsSales.getCell(`C${r}`).value = s.product_name
    wsSales.getCell(`D${r}`).value = s.quantity
    wsSales.getCell(`D${r}`).numFmt = TON_FMT
    wsSales.getCell(`E${r}`).value = s.price
    wsSales.getCell(`E${r}`).numFmt = TL_FMT
    wsSales.getCell(`F${r}`).value = { formula: `IF(AND(ISNUMBER(D${r}), ISNUMBER(E${r})), D${r}*E${r}, 0)` }
    wsSales.getCell(`F${r}`).numFmt = TL_FMT
  })
  for (let r = sales.length + 2; r <= MAX_ROW; r++) {
    wsSales.getCell(`F${r}`).value = { formula: `IF(AND(ISNUMBER(D${r}), ISNUMBER(E${r})), D${r}*E${r}, 0)` }
    wsSales.getCell(`F${r}`).numFmt = TL_FMT
  }

  const custBal = (r, p) =>
    `IF($B${r}="","", SUMIFS(İşlemler!E:E, İşlemler!B:B, $B${r}, İşlemler!D:D, "${p}", İşlemler!C:C, "Emanet") - SUMIFS(İşlemler!E:E, İşlemler!B:B, $B${r}, İşlemler!D:D, "${p}", İşlemler!C:C, "Emanetten Alış"))`
  customers.forEach((c, i) => {
    const r = i + 2
    wsCustomers.getCell(`A${r}`).value = { formula: `IF(B${r}="","", "M-"&TEXT(ROW()-1,"000"))` }
    wsCustomers.getCell(`B${r}`).value = c.name
    PRODUCTS.forEach((p, pi) => {
      wsCustomers.getCell(String.fromCharCode(67 + pi) + r).value = { formula: custBal(r, p) }
      wsCustomers.getCell(String.fromCharCode(67 + pi) + r).numFmt = TON_FMT
    })
  })
  for (let r = customers.length + 2; r <= MAX_ROW; r++) {
    wsCustomers.getCell(`A${r}`).value = { formula: `IF(B${r}="","", "M-"&TEXT(ROW()-1,"000"))` }
    PRODUCTS.forEach((p, pi) => {
      wsCustomers.getCell(String.fromCharCode(67 + pi) + r).value = { formula: custBal(r, p) }
      wsCustomers.getCell(String.fromCharCode(67 + pi) + r).numFmt = TON_FMT
    })
  }

  PRODUCTS.forEach((p, i) => {
    const r = i + 2
    wsSum.getCell(`A${r}`).value = p
    wsSum.getCell(`B${r}`).value = {
      formula: `SUMIFS(İşlemler!E:E, İşlemler!D:D, A${r}, İşlemler!C:C, "Normal Alış") + SUMIFS(İşlemler!E:E, İşlemler!D:D, A${r}, İşlemler!C:C, "Emanetten Alış")`,
    }
    wsSum.getCell(`B${r}`).numFmt = TON_FMT
    wsSum.getCell(`C${r}`).value = {
      formula: `SUMIFS(İşlemler!E:E, İşlemler!D:D, A${r}, İşlemler!C:C, "Emanet") - SUMIFS(İşlemler!E:E, İşlemler!D:D, A${r}, İşlemler!C:C, "Emanetten Alış")`,
    }
    wsSum.getCell(`C${r}`).numFmt = TON_FMT
    wsSum.getCell(`D${r}`).value = { formula: `SUMIF(Satışlar!C:C, A${r}, Satışlar!D:D)` }
    wsSum.getCell(`D${r}`).numFmt = TON_FMT
    wsSum.getCell(`E${r}`).value = { formula: `B${r}+C${r}-D${r}` }
    wsSum.getCell(`E${r}`).numFmt = TON_FMT
    wsSum.getCell(`F${r}`).value = {
      formula: `IF((SUMIFS(İşlemler!E:E, İşlemler!D:D, A${r}, İşlemler!C:C, "Normal Alış") + SUMIFS(İşlemler!E:E, İşlemler!D:D, A${r}, İşlemler!C:C, "Emanetten Alış"))=0, 0, (SUMIFS(İşlemler!G:G, İşlemler!D:D, A${r}, İşlemler!C:C, "Normal Alış") + SUMIFS(İşlemler!G:G, İşlemler!D:D, A${r}, İşlemler!C:C, "Emanetten Alış"))/(SUMIFS(İşlemler!E:E, İşlemler!D:D, A${r}, İşlemler!C:C, "Normal Alış") + SUMIFS(İşlemler!E:E, İşlemler!D:D, A${r}, İşlemler!C:C, "Emanetten Alış")))`,
    }
    wsSum.getCell(`F${r}`).numFmt = TL_FMT
    wsSum.getCell(`G${r}`).value = {
      formula: `IF(SUMIF(Satışlar!C:C, A${r}, Satışlar!D:D)=0, 0, SUMIF(Satışlar!C:C, A${r}, Satışlar!F:F)/SUMIF(Satışlar!C:C, A${r}, Satışlar!D:D))`,
    }
    wsSum.getCell(`G${r}`).numFmt = TL_FMT
    wsSum.getCell(`H${r}`).value = { formula: `(G${r}-F${r})*D${r}` }
    wsSum.getCell(`H${r}`).numFmt = TL_FMT
    wsSum.getCell(`I${r}`).value = { formula: `IF(D${r}=0, 0, G${r}-F${r})` }
    wsSum.getCell(`I${r}`).numFmt = TL_FMT
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