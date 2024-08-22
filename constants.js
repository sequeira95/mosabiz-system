export const dataBasePrincipal = 'aibiz'

export const dataBaseSecundaria = process.env.DB_NAME
export const subDominioName = process.env.ENVIROMENTID
export const lengthCodigoByNiveles = {
  1: 1,
  2: 2,
  3: 4,
  4: 6,
  5: 9,
  6: 12
}
export const nivelesCodigoByLength = {
  1: 1,
  2: 2,
  4: 3,
  6: 4,
  9: 5,
  12: 6
}
export const ObjectNumbersMonths = {
  ENERO: 1,
  FEBRERO: 2,
  MARZO: 3,
  ABRIL: 4,
  MAYO: 5,
  JUNIO: 6,
  JULIO: 7,
  AGOSTO: 8,
  SEPTIEMBRE: 9,
  OCTUBRE: 10,
  NOVIEMBRE: 11,
  DICIEMBRE: 12

}
export const getParentCode = (code) => {
  const nivel = nivelesCodigoByLength[String(code).length]
  const length = lengthCodigoByNiveles[nivel - 1]
  const parentCode = String(code).slice(0, length)
  return parentCode
}

export const statusOptionsPeriodos = {
  activo: 'Activo',
  preCierre: 'Pre-cierre',
  cerrado: 'Cerrado'
}
export const keyActivosFijos = {
  fechaAdquisicion: 'Fecha adquisición',
  zona: 'Zona',
  categoria: 'Categoría',
  nombre: 'Nombre',
  codigo: 'Código',
  descripcion: 'Descripción',
  tipo: 'Tipo',
  unidad: 'Unidad',
  cantidad: 'Cantidad',
  vidaUtil: 'Vida útil',
  comprobanteRegistroActivo: 'Comprobante de registro de activo'
}
export const collectionNameClient = [
  'ajustes', 'periodos', 'planCuenta', 'planCuentaRespaldo', 'comprobantes', 'detallesComprobantes', 'terceros', 'estadoBancarios', 'categorias',
  'zonas', 'categoriaPorZona', 'activosFijos', 'almacenes', 'categoriaPorAlmacen', 'historial', 'productos', 'contadores', 'movimientos', 'detalleMovimientos',
  'productosPorAlmacen', 'retencionISLR', 'bancos', 'clientes', 'servicios', 'iva', 'proveedores', 'metodosPagos', 'compras', 'detalleCompra', 'transacciones',
  'documentosFiscales', 'detalleDocumentosFiscales', 'ventassucursales', 'ventaszonas', 'zonasPorSucursales', 'declaraciones'
]
export const collectionNameAIbiz = [
  'islr', 'iva', 'bancos', 'retIva'
]
export const ListIndexesClient = [
  {
    collection: 'ajustes',
    indices:
    [
      { key: { tipo: 1 }, background: true }
    ]
  },
  {
    collection: 'ajustes',
    indices:
    [
      { key: { tipo: 1 }, background: true }
    ]
  },
  {
    collection: 'comprobantes',
    indices:
    [
      { key: { periodoId: 1 }, background: true },
      { key: { periodoId: 1, nombre: 1 }, background: true }
    ]
  },
  {
    collection: 'detallesComprobantes',
    indices:
    [
      { key: { comprobanteId: 1 }, background: true }
    ]
  }
]
export const tipoMovimientosShort = {
  solicitudInterna: 'SI',
  solicitudCompra: 'SC',
  transferencia: 'TR',
  Ajuste: 'AJ',
  devolucion: 'DEV',
  recepcion: 'REC'
}

// ventas
export const documentosVentas = [
  {
    text: 'Facturas',
    value: 'Factura',
    sigla: 'FC',
    isFiscal: true
  },
  {
    text: 'Nota de crédito',
    value: 'Nota de crédito',
    sigla: 'NC',
    isFiscal: true
  },
  {
    text: 'Nota de débito',
    value: 'Nota de débito',
    sigla: 'ND',
    isFiscal: true
  },
  {
    text: 'Pedido de venta',
    value: 'Pedido de venta',
    sigla: 'PV',
    isFiscal: false
  },
  {
    text: 'Nota de entrega',
    value: 'Nota de entrega',
    sigla: 'NE',
    isFiscal: false
  },
  {
    text: 'Presupuesto',
    value: 'Presupuesto',
    sigla: 'PT',
    isFiscal: false
  }
]

export const tiposDocumentosFiscales = {
  notaDebito: 'Nota de débito',
  notaCredito: 'Nota de crédito',
  factura: 'Factura',
  retIslr: 'Retención ISLR',
  retIva: 'Retención IVA',
  'RET ISLR': 'Retención ISLR',
  'RET IVA': 'Retención IVA',
  notaEntrega: 'Nota de entrega'
}
export const tiposDeclaracion = {
  islr: 'retIslr',
  iva: 'retIva'
}
export const tiposIVa = {
  general: 'General',
  reducida: 'Reducida',
  adicional: 'General+Adicional'
}

export const formatearNumeroRetencionIslr = (numero) => {
  // Convertir el número a cadena y rellenar con ceros a la izquierda
  const cadenaConCeros = numero.toString().padStart(6, '0')

  // Cortar la cadena al tamaño máximo deseado
  const cadenaFormateada = cadenaConCeros.slice(0, 6)

  return cadenaFormateada
}

export const formatearNumeroRetencionIva = (numero, fecha) => {
  // Convertir el número a cadena y rellenar con ceros a la izquierda
  const cadenaConCeros = numero.toString().padStart(8, '')

  // Cortar la cadena al tamaño máximo deseado
  const cadenaFormateada = `${fecha}${cadenaConCeros.slice(0, 8)}`

  return cadenaFormateada
}
