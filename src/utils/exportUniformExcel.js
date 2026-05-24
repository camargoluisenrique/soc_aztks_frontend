import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import logoAztks from '../assets/logo_aztks.png';
import jerseyJuegoNegro from '../assets/excel/jersey_juego_negro.png';
import shortOficialNegro from '../assets/excel/short_oficial_negro.png';
import playeraNegra from '../assets/excel/playera_negra.png';
import playeraAzul from '../assets/excel/playera_azul.png';
import casacaNaranja from '../assets/excel/casaca_naranja.png';
import playeraAmarillaReferencia from '../assets/excel/playera_amarilla_referencia.png';

const COLORS = {
  black: 'FF263238',
  graphite: 'FF263238',
  graphiteSoft: 'FF3B4650',
  grey: 'FF374151',
  orange: 'FFF05A28',
  orangeDeep: 'FFE64A19',
  green: 'FF00A651',
  greenDark: 'FF007A3D',
  blue: 'FF1457D9',
  blueSoft: 'FFEAF1FF',
  yellowSoft: 'FFFFF1B8',
  softOrange: 'FFFFE0D2',
  softGreen: 'FFE0F6EA',
  softOrange2: 'FFFFCDBA',
  softGreen2: 'FFC8F1D8',
  light: 'FFF7F9FA',
  white: 'FFFFFFFF',
  border: 'FF98A2AE',
  medium: 'FFD8DDE3',
};

const moneyFormat = '$#,##0.00';

const border = (style = 'thin', color = COLORS.border) => ({
  top: { style, color: { argb: color } },
  left: { style, color: { argb: color } },
  bottom: { style, color: { argb: color } },
  right: { style, color: { argb: color } },
});

const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

const font = ({ bold = false, size = 10, color = 'FF000000', italic = false } = {}) => ({
  name: 'Aptos',
  bold,
  size,
  color: { argb: color },
  italic,
});

const alignment = (horizontal = 'center', wrapText = true) => ({
  horizontal,
  vertical: 'middle',
  wrapText,
});

const setRangeStyle = (worksheet, range, style = {}) => {
  const [start, end] = range.split(':');
  const startCell = worksheet.getCell(start);
  const endCell = worksheet.getCell(end || start);

  for (let row = startCell.row; row <= endCell.row; row += 1) {
    for (let col = startCell.col; col <= endCell.col; col += 1) {
      Object.assign(worksheet.getCell(row, col), style);
    }
  }
};

const mergeValue = (worksheet, range, value, style = {}) => {
  worksheet.mergeCells(range);
  const cell = worksheet.getCell(range.split(':')[0]);
  cell.value = value;
  setRangeStyle(worksheet, range, style);
  return cell;
};

const imageUrlToBase64 = async (url) => {
  const response = await fetch(url);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const addImage = async (workbook, worksheet, url, range, extension = 'png') => {
  const base64 = await imageUrlToBase64(url);
  const imageId = workbook.addImage({ base64, extension });
  worksheet.addImage(imageId, range);
};

const formatDate = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const normalizeText = (value, fallback = '') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

const sanitizeFileName = (value) => normalizeText(value, 'Stock').replace(/[\\/:*?"<>|]/g, '_').trim();

const getLabelFill = (index, economicMode, grayscale) => {
  if (economicMode || grayscale) return index % 2 === 0 ? COLORS.light : COLORS.medium;
  const palette = [COLORS.softGreen, COLORS.softOrange, COLORS.softGreen2, COLORS.softOrange2];
  return palette[index % palette.length];
};

const getVisualCaptionFill = (index, economicMode, grayscale) => {
  if (economicMode || grayscale) return COLORS.graphiteSoft;
  const palette = [COLORS.greenDark, COLORS.graphiteSoft, COLORS.blue, COLORS.orangeDeep, COLORS.green, COLORS.orange];
  return palette[index % palette.length];
};

const inferOfficialDescription = (item) => {
  const type = normalizeText(item.tipo).toLowerCase();
  const color = normalizeText(item.color);

  if (type.includes('playera')) {
    if (normalizeText(item.formato).toLowerCase().includes('paquete')) {
      return 'Playeras de entrenamiento tipo T-shirt (set 3 colores: azul, amarilla y negra)';
    }
    return `Playera de entrenamiento tipo T-shirt ${color}`.trim();
  }

  if (type.includes('jersey')) return `Jersey de juego ${color || 'negro o tricolor'} personalizado`.trim();
  if (type.includes('short')) return 'Short negro oficial de uso mixto para entrenamiento y juego';
  if (type.includes('casaca')) return 'Casaca de entrenamiento en color variable';

  return `${normalizeText(item.tipo)} ${color}`.trim();
};

const inferPrenda = (item) => {
  const type = normalizeText(item.tipo);
  if (type.toLowerCase().includes('short')) return 'Short Negro';
  return type;
};

const inferColor = (item) => {
  const type = normalizeText(item.tipo).toLowerCase();
  const color = normalizeText(item.color);

  if (type.includes('playera') && normalizeText(item.formato).toLowerCase().includes('paquete')) return 'Azul / Amarilla / Negra';
  if (type.includes('jersey')) return color || 'Negro u opcional tricolor';
  if (type.includes('short')) return 'Negro';
  return color;
};

const itemImage = (item) => {
  const type = normalizeText(item.tipo).toLowerCase();
  const color = normalizeText(item.color).toLowerCase();

  if (type.includes('jersey')) return jerseyJuegoNegro;
  if (type.includes('short')) return shortOficialNegro;
  if (color.includes('azul')) return playeraAzul;
  if (color.includes('amarilla')) return playeraAmarillaReferencia;
  if (color.includes('negra') || color.includes('negro')) return playeraNegra;
  if (type.includes('casaca')) return casacaNaranja;
  if (type.includes('playera')) return playeraAzul;

  return playeraAzul;
};

const prepareItems = (items = []) => items.map((item, index) => {
  const cantidad = Number(item.cantidad || 0);
  const precioUnitario = Number(item.precio_unitario || item.precioUnitario || 0);
  const subtotal = Number(item.subtotal ?? cantidad * precioUnitario);

  return {
    id: item.id || `${index + 1}`,
    sku: normalizeText(item.sku),
    tipo: normalizeText(item.tipo),
    prenda: inferPrenda(item),
    formato: normalizeText(item.formato),
    color: inferColor(item),
    descripcion: inferOfficialDescription(item),
    talla: normalizeText(item.talla),
    cantidad,
    unidad: item.tipo?.toLowerCase?.().includes('playera') && item.formato?.toLowerCase?.().includes('paquete') ? 'Set' : 'Pieza',
    categoria: normalizeText(item.categoria),
    rama: normalizeText(item.rama),
    numero: item.numero ?? '',
    precioUnitario,
    subtotal,
    observacion: typeObservation(item),
    image: itemImage(item),
  };
});

const typeObservation = (item) => {
  const type = normalizeText(item.tipo).toLowerCase();
  if (type.includes('playera')) return 'Entrenamiento';
  if (type.includes('jersey')) return 'Juego';
  if (type.includes('short')) return 'Entrenamiento y juego';
  return 'Operativo';
};

const applyWorkbookDefaults = (worksheet) => {
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = cell.alignment || alignment();
      cell.border = cell.border || border('thin');
    });
  });
};

const applyDateAndCurrencyFormats = (worksheet) => {
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (cell.value instanceof Date) cell.numFmt = 'dd/mm/yyyy';
      if (typeof cell.value === 'number' && String(cell.address).match(/^[PQHIG]/)) cell.numFmt = moneyFormat;
    });
  });
};

const buildSolicitudSheet = async (workbook, data, assets, options) => {
  const worksheet = workbook.addWorksheet('FE-UNI-001 Solicitud', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
    views: [{ showGridLines: false, state: 'frozen', ySplit: 4 }],
  });

  const economicMode = options.modo === 'economico';
  const grayscale = Boolean(options.escalaGrises);
  const showVisuals = options.referenciasVisuales && !economicMode;
  const dark = grayscale || economicMode ? COLORS.graphiteSoft : COLORS.greenDark;
  const accent = grayscale || economicMode ? COLORS.medium : COLORS.orangeDeep;

  worksheet.columns = [
    { width: 2 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 12 },
    { width: 14 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 2 },
  ];

  for (let row = 1; row <= 40; row += 1) worksheet.getRow(row).height = 22;
  [...Array(7).keys()].forEach((index) => {
    worksheet.getRow(11 + index).height = 24;
    worksheet.getRow(20 + index).height = 24;
  });

  mergeValue(worksheet, 'B1:G3', '', { fill: fill(COLORS.white), border: border('medium') });
  mergeValue(worksheet, 'H1:N2', 'FORMATO PARA SOLICITUD DE UNIFORME', {
    font: font({ bold: true, size: 18 }), fill: fill(COLORS.white), border: border('medium'), alignment: alignment(),
  });
  mergeValue(worksheet, 'H3:K3', 'SOC_AZTKS · Control documental', {
    font: font({ italic: true, size: 10, color: COLORS.grey }), fill: fill(COLORS.light), border: border('medium'), alignment: alignment(),
  });
  mergeValue(worksheet, 'L3:N3', 'FE-UNI-001', {
    font: font({ bold: true, size: 12, color: COLORS.white }), fill: fill(dark), border: border('medium'), alignment: alignment(),
  });
  await addImage(workbook, worksheet, assets.logo, 'B1:G3');

  mergeValue(worksheet, 'B4:N4', 'DATOS GENERALES DEL DEPORTISTA', {
    font: font({ bold: true, size: 11 }), fill: fill(grayscale || economicMode ? COLORS.medium : COLORS.softGreen2), border: border('medium'), alignment: alignment(),
  });

  const fields = [
    ['B5', 'Fecha', 'C5:D5', data.fecha], ['E5', 'Folio', 'F5:G5', data.folio], ['H5', 'Tipo solicitud', 'I5:J5', data.tipoSolicitud], ['K5', 'Tipo jersey', 'L5:N5', data.tipoJersey],
    ['B6', 'Deportista', 'C6:D6', data.deportista], ['E6', 'Responsable / Tutor', 'F6:G6', data.responsable], ['H6', 'Categoría', 'I6:J6', data.categoria], ['K6', 'Rama', 'L6:N6', data.rama],
    ['B7', 'Talla jersey', 'C7:D7', data.tallaJersey], ['E7', 'Talla short', 'F7:G7', data.tallaShort], ['H7', 'Nombre en jersey', 'I7:J7', data.nombreJersey], ['K7', 'Número en jersey', 'L7:N7', data.numeroJersey],
  ];

  fields.forEach(([labelCell, label, valueRange, value], index) => {
    const cell = worksheet.getCell(labelCell);
    cell.value = label;
    cell.font = font({ bold: true, size: 10 });
    cell.fill = fill(getLabelFill(index, economicMode, grayscale));
    cell.border = border('medium');
    cell.alignment = alignment();
    mergeValue(worksheet, valueRange, value, { font: font({ size: 10 }), fill: fill(COLORS.white), border: border('medium'), alignment: alignment() });
  });

  mergeValue(worksheet, 'B9:N9', 'REFERENCIA VISUAL DE PRENDAS', {
    font: font({ bold: true, size: 11, color: COLORS.white }), fill: fill(accent), border: border('medium'), alignment: alignment(),
  });

  if (showVisuals) {
    [['C', 'E', 11, 17, 'Jersey juego negro', assets.jersey], ['G', 'I', 11, 17, 'Short negro oficial', assets.short], ['K', 'M', 11, 17, 'Playera T-shirt azul', assets.playeraAzul], ['C', 'E', 20, 26, 'Playera T-shirt negra', assets.playeraNegra], ['G', 'I', 20, 26, 'Casacas varios colores', assets.casaca], ['K', 'M', 20, 26, 'Playera T-shirt amarilla', assets.playeraAmarilla]].forEach(([colA, colB, rowA, rowB, label], index) => {
      mergeValue(worksheet, `${colA}${rowA}:${colB}${rowB}`, '', { fill: fill(COLORS.white), border: border('medium') });
      mergeValue(worksheet, `${colA}${rowB + 1}:${colB}${rowB + 1}`, label, {
        font: font({ bold: true, size: 9, color: COLORS.white }), fill: fill(getVisualCaptionFill(index, economicMode, grayscale)), border: border('medium'), alignment: alignment(),
      });
    });

    await addImage(workbook, worksheet, assets.jersey, 'C12:E16');
    await addImage(workbook, worksheet, assets.short, 'G12:I16');
    await addImage(workbook, worksheet, assets.playeraAzul, 'K12:M16');
    await addImage(workbook, worksheet, assets.playeraNegra, 'C21:E25');
    await addImage(workbook, worksheet, assets.casaca, 'G21:I25');
    await addImage(workbook, worksheet, assets.playeraAmarilla, 'K21:M25');
  } else {
    mergeValue(worksheet, 'B11:M17', 'REFERENCIAS VISUALES OCULTAS EN MODO ECONÓMICO\n\nEsta versión reduce el uso de tinta eliminando miniaturas y color de alto consumo.', {
      font: font({ bold: true, size: 12 }), fill: fill(COLORS.white), border: border('medium'), alignment: alignment(),
    });
    mergeValue(worksheet, 'B20:M26', 'Prendas contempladas:\n• Casacas de entrenamiento: varios colores\n• Playeras de entrenamiento tipo T-shirt: azul, amarilla y negra\n• Jersey de juego: negro o tricolor\n• Short negro: entrenamiento y juego', {
      font: font({ size: 10 }), fill: fill(COLORS.white), border: border('medium'), alignment: alignment('left'),
    });
  }

  mergeValue(worksheet, 'B29:N29', 'RESUMEN DE SOLICITUD', {
    font: font({ bold: true, size: 11, color: COLORS.white }), fill: fill(dark), border: border('medium'), alignment: alignment(),
  });

  [['B30:C30', 'SKU'], ['D30:H30', 'Descripción'], ['I30:J30', 'Talla'], ['K30:L30', 'Cantidad'], ['M30:N30', 'Observación']].forEach(([range, title]) => {
    mergeValue(worksheet, range, title, { font: font({ bold: true, color: COLORS.white }), fill: fill(dark), border: border('medium'), alignment: alignment() });
  });

  data.items.slice(0, 5).forEach((item, index) => {
    const row = 31 + index;
    mergeValue(worksheet, `B${row}:C${row}`, item.sku, { font: font(), fill: fill(COLORS.white), border: border('medium'), alignment: alignment() });
    mergeValue(worksheet, `D${row}:H${row}`, item.descripcion, { font: font(), fill: fill(COLORS.white), border: border('medium'), alignment: alignment('left') });
    mergeValue(worksheet, `I${row}:J${row}`, item.talla, { font: font(), fill: fill(COLORS.white), border: border('medium'), alignment: alignment() });
    mergeValue(worksheet, `K${row}:L${row}`, item.cantidad, { font: font(), fill: fill(COLORS.white), border: border('medium'), alignment: alignment() });
    mergeValue(worksheet, `M${row}:N${row}`, item.observacion, { font: font(), fill: fill(COLORS.white), border: border('medium'), alignment: alignment() });
  });

  mergeValue(worksheet, 'B36:F36', 'Atención al cliente', { font: font({ bold: true, color: COLORS.white }), fill: fill(grayscale || economicMode ? dark : COLORS.graphiteSoft), border: border('medium'), alignment: alignment() });
  mergeValue(worksheet, 'J36:N36', 'Responsable del deportista', { font: font({ bold: true, color: COLORS.white }), fill: fill(grayscale || economicMode ? dark : COLORS.graphiteSoft), border: border('medium'), alignment: alignment() });
  mergeValue(worksheet, 'B37:F38', '', { fill: fill(COLORS.white), border: border('medium') });
  mergeValue(worksheet, 'J37:N38', '', { fill: fill(COLORS.white), border: border('medium') });

  applyWorkbookDefaults(worksheet);
};

const buildOrdenCompraSheet = async (workbook, data, assets, options) => {
  const worksheet = workbook.addWorksheet('FI-UNI-002 Orden Compra', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
    views: [{ showGridLines: false, state: 'frozen', ySplit: 8 }],
  });

  const economicMode = options.modo === 'economico';
  const grayscale = Boolean(options.escalaGrises);
  const showVisuals = options.referenciasVisuales && !economicMode;
  const dark = grayscale || economicMode ? COLORS.graphiteSoft : COLORS.greenDark;
  const accent = grayscale || economicMode ? COLORS.medium : COLORS.orangeDeep;

  worksheet.columns = [
    { width: 2 }, { width: 14 }, { width: 24 }, { width: 24 }, { width: 11 }, { width: 16 }, { width: 18 },
    { width: 14 }, { width: 15 }, { width: 13 }, { width: 13 }, { width: 22 }, { width: 2 },
  ];

  for (let row = 1; row <= 28; row += 1) worksheet.getRow(row).height = 22;
  worksheet.getRow(1).height = 28;
  worksheet.getRow(2).height = 28;
  worksheet.getRow(3).height = 24;
  worksheet.getRow(4).height = 24;
  worksheet.getRow(5).height = 32;
  worksheet.getRow(6).height = 32;
  worksheet.getRow(9).height = 24;

  mergeValue(worksheet, 'B1:F3', '', { fill: fill(COLORS.white), border: border('medium') });
  mergeValue(worksheet, 'G1:L2', 'ORDEN DE COMPRA', { font: font({ bold: true, size: 18 }), fill: fill(COLORS.white), border: border('medium'), alignment: alignment() });
  mergeValue(worksheet, 'G3:I3', 'Formato administrativo', { font: font({ italic: true, size: 10, color: COLORS.grey }), fill: fill(COLORS.light), border: border('medium'), alignment: alignment() });
  mergeValue(worksheet, 'J3:L3', 'FI-UNI-002', { font: font({ bold: true, color: COLORS.white, size: 12 }), fill: fill(dark), border: border('medium'), alignment: alignment() });
  await addImage(workbook, worksheet, assets.logo, 'B1:F3');

  mergeValue(worksheet, 'B4:L4', 'DATOS DE COMPRA Y ENTREGA', {
    font: font({ bold: true, size: 11 }), fill: fill(grayscale || economicMode ? COLORS.medium : COLORS.softOrange2), border: border('medium'), alignment: alignment(),
  });

  const fields = [
    ['B5', 'Folio', 'C5:D5', data.folio], ['E5', 'Proveedor', 'F5:G5', data.proveedor], ['H5', 'Fecha pedido', 'I5:J5', data.fecha], ['K5', 'Entrega', 'L5:L5', data.fechaEntrega],
    ['B6', 'Fecha pago', 'C6:D6', data.fechaPago], ['E6', 'Términos', 'F6:G6', data.terminos], ['H6', 'Lugar entrega', 'I6:J6', data.lugarEntrega], ['K6', 'Solicitante', 'L6:L6', data.solicitante],
  ];

  fields.forEach(([labelCell, label, valueRange, value], index) => {
    const cell = worksheet.getCell(labelCell);
    cell.value = label;
    cell.font = font({ bold: true, size: 10 });
    cell.fill = fill(getLabelFill(index, economicMode, grayscale));
    cell.border = border('medium');
    cell.alignment = alignment();
    mergeValue(worksheet, valueRange, value, { font: font({ size: 10 }), fill: fill(COLORS.white), border: border('medium'), alignment: alignment() });
  });

  [['B9:B9', 'Código / SKU'], ['C9:D9', 'Descripción'], ['E9:E9', 'Cantidad'], ['F9:F9', 'Unidad'], ['G9:G9', 'Talla'], ['H9:H9', 'Precio unitario'], ['I9:I9', 'Precio total'], ['J9:L9', 'Referencia visual']].forEach(([range, title]) => {
    mergeValue(worksheet, range, title, { font: font({ bold: true, color: COLORS.white }), fill: fill(title === 'Referencia visual' ? accent : dark), border: border('medium'), alignment: alignment() });
  });

  data.items.forEach((item, index) => {
    const row = 10 + index;
    worksheet.getRow(row).height = showVisuals ? 58 : 40;
    worksheet.getCell(`B${row}`).value = item.sku;
    worksheet.getCell(`E${row}`).value = item.cantidad;
    worksheet.getCell(`F${row}`).value = item.unidad;
    worksheet.getCell(`G${row}`).value = item.talla;
    worksheet.getCell(`H${row}`).value = item.precioUnitario;
    worksheet.getCell(`I${row}`).value = { formula: `E${row}*H${row}`, result: item.subtotal };
    mergeValue(worksheet, `C${row}:D${row}`, item.descripcion, { font: font(), fill: fill(COLORS.white), border: border('medium'), alignment: alignment('left') });
    mergeValue(worksheet, `J${row}:L${row}`, showVisuals ? '' : 'Oculto en modo económico', { font: font({ size: 9 }), fill: fill(COLORS.white), border: border('medium'), alignment: alignment() });

    ['B', 'E', 'F', 'G', 'H', 'I'].forEach((col) => {
      const cell = worksheet.getCell(`${col}${row}`);
      cell.font = font();
      cell.fill = fill(COLORS.white);
      cell.border = border('medium');
      cell.alignment = alignment();
    });

    worksheet.getCell(`H${row}`).numFmt = moneyFormat;
    worksheet.getCell(`I${row}`).numFmt = moneyFormat;
  });

  if (showVisuals) {
    for (let index = 0; index < data.items.length; index += 1) {
      const row = 10 + index;
      await addImage(workbook, worksheet, data.items[index].image, `J${row}:L${row}`);
    }
  }

  const totalRow = Math.max(15, 11 + data.items.length + 1);
  mergeValue(worksheet, `F${totalRow}:G${totalRow}`, 'TOTAL A PAGAR', { font: font({ bold: true, color: COLORS.white }), fill: fill(dark), border: border('medium'), alignment: alignment() });
  worksheet.getCell(`H${totalRow}`).value = { formula: `SUM(I10:I${9 + data.items.length})`, result: data.total };
  worksheet.getCell(`H${totalRow}`).font = font({ bold: true });
  worksheet.getCell(`H${totalRow}`).fill = fill(COLORS.light);
  worksheet.getCell(`H${totalRow}`).border = border('medium');
  worksheet.getCell(`H${totalRow}`).alignment = alignment();
  worksheet.getCell(`H${totalRow}`).numFmt = moneyFormat;

  mergeValue(worksheet, `B${totalRow + 2}:L${totalRow + 4}`, 'Observaciones: Casacas de entrenamiento en varios colores. Playeras de entrenamiento tipo T-shirt en azul, amarilla y negra. Jersey de juego disponible en negro o tricolor. Short negro de uso para entrenamiento y juego.', {
    font: font({ size: 9 }), fill: fill(COLORS.white), border: border('medium'), alignment: alignment('left'),
  });

  mergeValue(worksheet, `B${totalRow + 8}:E${totalRow + 8}`, 'Administración académica', { font: font({ bold: true, color: COLORS.white }), fill: fill(grayscale || economicMode ? dark : COLORS.graphiteSoft), border: border('medium'), alignment: alignment() });
  mergeValue(worksheet, `H${totalRow + 8}:L${totalRow + 8}`, 'Proveedor', { font: font({ bold: true, color: COLORS.white }), fill: fill(grayscale || economicMode ? dark : COLORS.graphiteSoft), border: border('medium'), alignment: alignment() });
  mergeValue(worksheet, `B${totalRow + 9}:E${totalRow + 10}`, '', { fill: fill(COLORS.white), border: border('medium') });
  mergeValue(worksheet, `H${totalRow + 9}:L${totalRow + 10}`, '', { fill: fill(COLORS.white), border: border('medium') });

  applyWorkbookDefaults(worksheet);
};

const buildControlSheet = async (workbook, data, assets, options) => {
  const worksheet = workbook.addWorksheet('Control Operativo', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
    views: [{ showGridLines: false, state: 'frozen', ySplit: 5 }],
  });

  const economicMode = options.modo === 'economico';
  const grayscale = Boolean(options.escalaGrises);
  const dark = grayscale || economicMode ? COLORS.graphiteSoft : COLORS.greenDark;

  const widths = [10, 12, 14, 14, 18, 16, 14, 18, 16, 20, 10, 10, 12, 10, 10, 12, 12, 16, 16, 16, 16, 18, 24];
  worksheet.columns = widths.map((width) => ({ width }));
  for (let row = 1; row <= 18; row += 1) worksheet.getRow(row).height = 22;

  mergeValue(worksheet, 'A1:E3', '', { fill: fill(COLORS.white), border: border('medium') });
  mergeValue(worksheet, 'F1:W2', 'CONTROL OPERATIVO DE UNIFORMES · SOC_AZTKS', { font: font({ bold: true, size: 16 }), fill: fill(COLORS.white), border: border('medium'), alignment: alignment() });
  mergeValue(worksheet, 'F3:W3', 'Hoja técnica para administración, seguimiento logístico, proveedor, entregas, pagos y auditoría interna.', { font: font({ italic: true, size: 10, color: COLORS.grey }), fill: fill(COLORS.light), border: border('medium'), alignment: alignment() });
  await addImage(workbook, worksheet, assets.logo, 'A1:E3');

  const headers = ['Folio', 'Fecha', 'Estatus', 'Tipo pedido', 'Deportista / destino', 'Responsable', 'SKU', 'Prenda', 'Formato', 'Color', 'Talla', 'Cantidad', 'Categoría', 'Rama', 'Dorsal', 'Precio unitario', 'Subtotal', 'Proveedor', 'Fecha entrega acordada', 'Fecha entrega real', 'Fecha pago acordada', 'Lugar entrega', 'Observaciones'];
  headers.forEach((title, index) => {
    const cell = worksheet.getCell(5, index + 1);
    cell.value = title;
    cell.font = font({ bold: true, color: COLORS.white });
    cell.fill = fill(dark);
    cell.alignment = alignment();
    cell.border = border('medium');
  });

  data.items.forEach((item, index) => {
    const row = 6 + index;
    const values = [
      data.folio, data.fecha, data.estatus, data.tipoPedido, data.deportista, data.responsable, item.sku, item.prenda, item.formato,
      item.color, item.talla, item.cantidad, item.categoria || data.categoria, item.rama || data.rama, item.numero || data.numeroJersey,
      item.precioUnitario, { formula: `L${row}*P${row}`, result: item.subtotal }, data.proveedor, data.fechaEntrega, data.fechaEntregaReal,
      data.fechaPago, data.lugarEntrega, item.observacion,
    ];
    values.forEach((value, colIndex) => {
      const cell = worksheet.getCell(row, colIndex + 1);
      cell.value = value;
      cell.font = font({ size: 9 });
      cell.fill = fill(COLORS.white);
      cell.border = border('thin');
      cell.alignment = [5, 6, 8, 9, 10, 18, 22, 23].includes(colIndex + 1) ? alignment('left') : alignment();
    });
    worksheet.getCell(`P${row}`).numFmt = moneyFormat;
    worksheet.getCell(`Q${row}`).numFmt = moneyFormat;
  });

  const endRow = Math.max(6, 5 + data.items.length);
  mergeValue(worksheet, 'A11:C11', 'RESUMEN', { font: font({ bold: true, color: COLORS.white }), fill: fill(dark), border: border('medium'), alignment: alignment() });
  [['A12', 'Total piezas', `=SUM(L6:L${endRow})`], ['A13', 'Total estimado', `=SUM(Q6:Q${endRow})`], ['A14', 'Órdenes abiertas', `=COUNTIF(C6:C${endRow},"POR_PEDIR")`]].forEach(([labelCell, label, formulaValue]) => {
    const row = worksheet.getCell(labelCell).row;
    worksheet.getCell(`A${row}`).value = label;
    worksheet.getCell(`A${row}`).font = font({ bold: true });
    worksheet.getCell(`A${row}`).fill = fill(COLORS.light);
    worksheet.getCell(`A${row}`).border = border('medium');
    worksheet.getCell(`A${row}`).alignment = alignment('left');
    mergeValue(worksheet, `B${row}:C${row}`, { formula: formulaValue.replace('=', ''), result: row === 12 ? data.totalPrendas : row === 13 ? data.total : data.items.length }, {
      font: font({ bold: true }), fill: fill(COLORS.white), border: border('medium'), alignment: alignment(),
    });
    if (row === 13) worksheet.getCell(`B${row}`).numFmt = moneyFormat;
  });

  applyWorkbookDefaults(worksheet);
  applyDateAndCurrencyFormats(worksheet);
};

export async function exportUniformExcel({ order, items, options = {} }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SOC_AZTKS';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;

  const preparedItems = prepareItems(items);
  const data = {
    folio: normalizeText(order.folio, 'PREVIA'),
    fecha: formatDate(order.fechaPedido),
    estatus: normalizeText(order.estatus, 'POR_PEDIR'),
    tipoPedido: normalizeText(order.tipoPedido, 'Personalizado'),
    deportista: normalizeText(order.deportista, 'Stock almacén'),
    responsable: normalizeText(order.responsable, 'Pendiente'),
    categoria: normalizeText(order.categoria, 'Sin categoría'),
    rama: normalizeText(order.rama, 'Sin rama'),
    numeroJersey: normalizeText(order.numeroJersey),
    nombreJersey: normalizeText(order.nombreJersey),
    tallaJersey: normalizeText(order.tallaJersey),
    tallaShort: normalizeText(order.tallaShort),
    tipoSolicitud: normalizeText(order.tipoSolicitud, 'Nuevo Ingreso'),
    tipoJersey: normalizeText(order.tipoJersey, 'Oscuro'),
    proveedor: normalizeText(order.proveedor, 'Almacén Central / Proveedor General'),
    fechaEntrega: formatDate(order.fechaEntregaAcordada),
    fechaEntregaReal: formatDate(order.fechaEntregaReal),
    fechaPago: formatDate(order.fechaPagoAcordada),
    terminos: normalizeText(order.terminosEntrega, 'Normal'),
    lugarEntrega: normalizeText(order.lugarEntrega, 'Instalaciones Domo Aztks'),
    solicitante: normalizeText(order.solicitante, 'Admin. SOC_AZTKS'),
    totalPrendas: preparedItems.reduce((acc, item) => acc + Number(item.cantidad || 0), 0),
    total: preparedItems.reduce((acc, item) => acc + Number(item.subtotal || 0), 0),
    items: preparedItems,
  };

  const assets = {
    logo: logoAztks,
    jersey: jerseyJuegoNegro,
    short: shortOficialNegro,
    playeraNegra,
    playeraAzul,
    casaca: casacaNaranja,
    playeraAmarilla: playeraAmarillaReferencia,
  };

  const finalOptions = {
    modo: options.modo || 'normal',
    referenciasVisuales: options.referenciasVisuales !== false,
    escalaGrises: Boolean(options.escalaGrises),
  };

  await buildSolicitudSheet(workbook, data, assets, finalOptions);
  await buildOrdenCompraSheet(workbook, data, assets, finalOptions);
  await buildControlSheet(workbook, data, assets, finalOptions);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const suffix = finalOptions.modo === 'economico' ? 'ECO' : finalOptions.escalaGrises ? 'GRIS' : 'OFICIAL';
  saveAs(blob, `REQUISICION_UNIFORMES_SOC_AZTKS_${suffix}_${sanitizeFileName(data.deportista)}.xlsx`);
}
