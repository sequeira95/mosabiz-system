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
  'documentosFiscales', 'detalleDocumentosFiscales', 'ventassucursales', 'ventaszonas', 'zonasPorSucursales', 'declaraciones', 'ajustePrecioProducto', 'conciliacionTesoreria',
  'perfiles', 'empleados'
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
    collection: 'planCuenta',
    indices:
    [
      { key: { tipo: 1 }, background: true },
      { key: { nivelCuenta: 1 }, background: true },
      { key: { nivelCuenta: 1, codigo: 1 }, background: true }
    ]
  },
  {
    collection: 'terceros',
    indices:
    [
      { key: { cuentaId: 1 }, background: true },
      { key: { terceroNombre: 1 }, background: true },
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
      { key: { comprobanteId: 1 }, background: true },
      { key: { cuentaId: 1 }, background: true },
      { key: { periodoId: 1, fecha: 1, isPreCierre: 1, isCierre: 1 }, background: true },
      { key: { periodoId: 1, isPreCierre: 1 }, background: true },
      { key: { periodoId: 1, isPreCierre: 1, terceroNombre: 1 }, background: true },
      { key: { periodoId: 1, fecha: 1, isPreCierre: 1, isCierre: 1, cuentaCodigo: 1 }, background: true },
      { key: { periodoId: 1, isPreCierre: 1, cuentaCodigo: 1 }, background: true },
      { key: { periodoId: 1, fecha: 1, cuentaCodigo: 1 }, background: true },
      { key: { periodoId: 1, fecha: 1 }, background: true },
      { key: { cuentaId: 1, fecha: 1 }, background: true },
    ]
  },
  {
    collection: 'estadoBancarios',
    indices:
    [
      { key: { periodoId: 1 }, background: true },
      { key: { cuentaId: 1, periodoId: 1 }, background: true },
      { key: { periodoId: 1, monto: 1 }, background: true },
      { key: { cuentaId: 1, periodoId: 1, monto: 1 }, background: true }
    ]
  },
  {
    collection: 'categorias',
    indices:
    [
      { key: { tipo: 1, activo: 1 }, background: true },
      { key: { tipo: 1 }, background: true }
    ]
  },
  {
    collection: 'zonas',
    indices:
    [
      { key: { tipo: 1, activo: 1 }, background: true }
    ]
  },
  {
    collection: 'categoriaPorZona',
    indices:
    [
      { key: { categoriaId: 1, zonaId: 1 }, background: true },
      { key: { zonaId: 1 }, background: true },
      { key: { categoriaId: 1 }, background: true }
    ]
  },
  {
    collection: 'activosFijos',
    indices:
    [
      { key: { nombre: 1, codigo: 1 }, background: true },
      { key: { fechaAdquisicion: 1 }, background: true },
      { key: { categoria: 1 }, background: true },
      { key: { zona: 1 }, background: true }
    ]
  },
  {
    collection: 'almacenes',
    indices:
    [
      { key: { tipo: 1, activo: 1 }, background: true },
      { key: { nombre: 1 }, background: true },
      { key: { nombre: 1, codigo: 1 }, background: true },
    ]
  },
  {
    collection: 'categoriaPorAlmacen',
    indices:
    [
      { key: { categoriaId: 1, almacenId: 1 }, background: true },
      { key: { almacenId: 1 }, background: true },
      { key: { categoriaId: 1 }, background: true }
    ]
  },
  {
    collection: 'historial',
    indices:
    [
      { key: { idMovimiento: 1 }, background: true },
      { key: { idMovimiento: 1, tipo: 1 }, background: true },
      { key: { idProducto: 1, tipo: 1 }, background: true }
    ]
  },
  {
    collection: 'productos',
    indices:
    [
      { key: { categoria: 1 }, background: true },
      { key: { activo: 1 }, background: true },
      { key: { codigo: 1, nombre: 1 }, background: true },
      { key: { nombre: 1, codigo: 1 }, background: true },
      { key: { codigo: 1 }, background: true }
    ]
  },
  {
    collection: 'contadores',
    indices:
    [
      { key: { tipo: 1 }, background: true }
    ]
  },
  {
    collection: 'movimientos',
    indices:
    [
      { key: { estado: 1 }, background: true },
      { key: { tipo: 1 }, background: true },
      { key: { estado: 1, tipo: 1 }, background: true },
      { key: { tipo: 1, estado: 1 }, background: true },
      { key: { compraId: 1 }, background: true },
    ]
  },
  {
    collection: 'detalleMovimientos',
    indices:
    [
      { key: { movimientoId: 1 }, background: true }
    ]
  },
  {
    collection: 'productosPorAlmacen',
    indices:
    [
      { key: { productoId: 1, almacenId: 1 }, background: true },
      { key: { productoId: 1, almacenId: 1, movimientoAfectado: 1 }, background: true },
      { key: { almacenId: 1, movimientoAfectado: 1, productoId: 1, lote: 1 }, background: true },
      { key: { productoId: 1, almacenId: 1, movimientoId: 1, lote: 1 }, background: true },
      { key: { productoId: 1, almacenId: 1, lote: 1 }, background: true },
      { key: { productoId: 1, lote: 1 }, background: true },
      { key: { productoId: 1 }, background: true },
      { key: { almacenId: 1 }, background: true },
      { key: { tipo: 1 }, background: true },
      { key: { movimientoId: 1 }, background: true },
      { key: { productoId: 1, movimientoId: 1, almacenId: 1, tipoMovimiento: 1 }, background: true },
      { key: { movimientoAfectado: 1, productoId: 1, lote: 1 }, background: true },
      { key: { productoId: 1, almacenId: 1, movimientoId: 1 }, background: true },
      { key: { productoId: 1, almacenId: 1, movimientoAfectado: 1 }, background: true },
      { key: { tipoMovimiento: 1, productoId: 1, almacenId: 1 }, background: true },
      { key: { tipoMovimiento: 1, productoId: 1, zonaId: 1 }, background: true },
      { key: { productoId: 1, movimientoId: 1 }, background: true },
      { key: { movimientoId: 1, lote: 1, almacenId: 1 }, background: true },
      { key: { tipoMovimiento: 1, almacenId: 1, productoId: 1 }, background: true },
      { key: { movimientoAfectado: 1 }, background: true },
      { key: { movimientoAfectado: 1, productoId: 1 }, background: true },
      { key: { fechaMovimiento: 1, almacenId: 1 }, background: true },
      { key: { almacenId: 1, lote: 1 }, background: true },
      { key: { documentoId: 1, tipo: 1, tipoMovimiento: 1 }, background: true },
      { key: { documentoId: 1, productoId: 1, tipo: 1, tipoMovimiento: 1 }, background: true },
    ]
  },
  {
    collection: 'retencionISLR',
    indices:
    [
      { key: { tipo: 1 }, background: true },
      { key: { codigo: 1 }, background: true }
    ]
  },
  {
    collection: 'bancos',
    indices:
    [
      { key: { nombre: 1, descripcion: 1, tipo: 1, isNacionalDivisas: 1 }, background: true },
      { key: { tipo: 1, tipoBanco: 1 }, background: true },
      { key: { tipoBanco: 1 }, background: true },
      { key: { tipo: 1, isNacionalDivisas: 1, tipoBanco: 1 }, background: true },
      { key: { tipo: 1, tipoBanco: 1, isNacionalDivisas: 1 }, background: true },
    ]
  },
  {
    collection: 'clientes',
    indices:
    [
      { key: { tipoDocumento: 1, documentoIdentidad: 1 }, background: true },
      { key: { razonSocial: 1 }, background: true },
    ]
  },
  {
    collection: 'servicios',
    indices:
    [
      { key: { categoria: 1 }, background: true },
      { key: { codigo: 1 }, background: true },
      { key: { tipo: 1 }, background: true },
      { key: { tipo: 1, activo: 1 }, background: true },
    ]
  },
  {
    collection: 'proveedores',
    indices:
    [
      { key: { categoria: 1 }, background: true },
      { key: { activo: 1 }, background: true },
      { key: { tipoDocumento: 1, documentoIdentidad: 1 }, background: true },
      { key: { razonSocial: 1 }, background: true },
    ]
  },
  {
    collection: 'metodosPagos',
    indices:
    [
      { key: { proveedorId: 1 }, background: true },
    ]
  },
  {
    collection: 'compras',
    indices:
    [
      { key: { _id: 1, estado: 1 }, background: true },
      { key: { estado: 1 }, background: true },
      { key: { statusInventario: 1 }, background: true },
    ]
  },
  {
    collection: 'detalleCompra',
    indices:
    [
      { key: { compraId: 1 }, background: true },
    ]
  },
  {
    collection: 'transacciones',
    indices:
    [
      { key: { fechaPago: 1, banco: 1 }, background: true },
      { key: { fechaPago: 1, caja: 1 }, background: true },
      { key: { documentoId: 1, fechaPago: 1 }, background: true },
      { key: { documentoId: 1 }, background: true },
      { key: { fechaPago: 1 }, background: true },
      { key: { cierreCajaId: 1, isCobro: 1 }, background: true },
      { key: { cierreCajaId: 1 }, background: true },
      { key: { documentoId: 1, cierreCajaId: 1, banco: 1 }, background: true },
      { key: { cierreCajaId: 1, caja: 1, banco: 1 }, background: true },
      { key: { cierreCajaId: 1, isCobro: 1, caja: 1 }, background: true },
    ]
  },
  {
    collection: 'documentosFiscales',
    indices:
    [
      { key: { tipoMovimiento: 1, estado: 1, tipoDocumento: 1, fecha: 1 }, background: true },
      { key: { fecha: 1, estado: 1, tipoMovimiento: 1, tipoDocumento: 1 }, background: true },
      { key: { tipoMovimiento: 1, tipoDocumento: 1, fecha: 1 }, background: true },
      { key: { facturaAsociada: 1 }, background: true },
      { key: { facturaAsociada: 1, tipoDocumento: 1 }, background: true },
      { key: { estado: 1, tipoDocumento: 1, proveedorId: 1, fecha: 1 }, background: true },
      { key: { tipoMovimiento: 1, estado: 1, tipoDocumento: 1, numeroOrden: 1 }, background: true },
      { key: { tipoMovimiento: 1, estado: 1, tipoDocumento: 1, numeroFactura: 1 }, background: true },
      { key: { tipoMovimiento: 1, tipoDocumento: 1, estado: 1 }, background: true },
      { key: { estado: 1, tipoDocumento: 1, tipoMovimiento: 1 }, background: true },
      { key: { tipoMovimiento: 1, fecha: 1 }, background: true },
      { key: { tipoMovimiento: 1, tipoDocumento: 1, periodoIvaInit: 1, periodoIvaEnd: 1 }, background: true },
      { key: { facturaAsociada: 1, tipoDocumento: 1, estado: 1 }, background: true },
      { key: { tipoDocumento: 1, estado: 1 }, background: true },
      { key: { _id: 1, declarado: 1, periodoIvaNombre: 1 }, background: true },
      { key: { periodoIvaInit: 1, periodoIvaEnd: 1 }, background: true },
      { key: { tipoMovimiento: 1, tipoDocumento: 1, declarado: 1, fecha: 1 }, background: true },
      { key: { tipoMovimiento: 1, tipoDocumento: 1, declarado: 1, fecha: 1, periodoIvaNombre: 1 }, background: true },
      { key: { numeroFactura: 1, proveedorId: 1, tipoMovimiento: 1 }, background: true },
      { key: { numeroFactura: 1, tipoMovimiento: 1 }, background: true },
      { key: { numeroFactura: 1, numeroControl: 1 }, background: true },
      { key: { numeroFactura: 1, proveedorId: 1 }, background: true },
      { key: { numeroFactura: 1 }, background: true },
      { key: { numeroFactura: 1, proveedorId: 1, estado: 1 }, background: true },
      { key: { numeroFactura: 1, estado: 1 }, background: true },
      { key: { periodoIvaNombre: 1 }, background: true },
      { key: { cajaId: 1 }, background: true },
      { key: { _id: 1, tipoMovimiento: 1, tipoDocumento: 1 }, background: true },
      { key: { tipoMovimiento: 1, tipoDocumento: 1 }, background: true },
      { key: { tipoMovimiento: 1, tipoDocumento: 1, numeroFactura: 1 }, background: true },
      { key: { tipoMovimiento: 1, tipoDocumento: 1, activo: 1 }, background: true },
      { key: { tipoMovimiento: 1, tipoDocumento: 1, activo: 1, numeroFactura: 1 }, background: true },
      { key: { notaEntregaAsociada: 1 }, background: true },
      { key: { fecha: 1, tipoMovimiento: 1 }, background: true },
    ]
  },
  {
    collection: 'detalleDocumentosFiscales',
    indices:
    [
      { key: { documentoId: 1 }, background: true },
    ]
  },
  {
    collection: 'ventassucursales',
    indices:
    [
      { key: { usuarios: 1 }, background: true },
      { key: { codigo: 1 }, background: true },
    ]
  },
  {
    collection: 'ventaszonas',
    indices:
    [
      { key: { nombre: 1 }, background: true },
    ]
  },
  {
    collection: 'zonasPorSucursales',
    indices:
    [
      { key: { zonaId: 1 }, background: true },
      { key: { zonaId: 1, sucursalId: 1 }, background: true },
    ]
  },
  {
    collection: 'declaraciones',
    indices:
    [
      { key: { tipoDeclaracion: 1, periodoInit: 1, priodoFin: 1 }, background: true },
      { key: { tipoMovimiento: 1, tipoDeclaracion: 1, periodoInit: 1, priodoFin: 1 }, background: true },
    ]
  },
  {
    collection: 'ajustePrecioProducto',
    indices:
    [
      { key: { fecha: 1, productoId: 1 }, background: true },
      { key: { productoId: 1, fecha: 1 }, background: true },
      { key: { productoId: 1 }, background: true },
      { key: { fecha: 1 }, background: true },
    ]
  },
  {
    collection: 'conciliacionTesoreria',
    indices:
    [
      { key: { cajaBancoId: 1 }, background: true },
      { key: { year: 1, mes: 1 }, background: true },
      { key: { cajaBancoId: 1, year: 1, mes: 1 }, background: true },
      { key: { year: 1, mes: 1, cajaBancoId: 1 }, background: true },
    ]
  },
  {
    collection: 'perfiles',
    indices:
    [
      { key: { _id: 1, isNomina: 1 }, background: true },
      { key: { isNomina: 1 }, background: true },
      { key: { nombre: 1 }, background: true },
    ]
  },
  {
    collection: 'empleados',
    indices:
    [
      { key: { codigo: 1, activo: 1 }, background: true }
    ]
  },
]
export const tipoMovimientos = {
  solicitudInterna: 'solicitudInterna',
  solicitudCompra: 'solicitudCompra',
  transferencia: 'transferencia',
  Ajuste: 'Ajuste',
  devolucion: 'devolucion',
  recepcion: 'recepcion',
  'despacho-ventas': 'despacho-ventas',
  'devolucion-ventas': 'devolucion-ventas',
  dataInit: 'dataInit'
}
export const tipoMovimientosShort = {
  solicitudInterna: 'SI',
  solicitudCompra: 'SC',
  transferencia: 'TR',
  Ajuste: 'AJ',
  devolucion: 'DEV',
  recepcion: 'REC',
  'despacho-ventas': 'Despacho',
  'devolucion-ventas': 'DEV-V'
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
  },
  { text: 'Devolución', value: 'Devolución', sigla: 'DEV', isFiscal: false }
]

export const tiposDocumentosFiscales = {
  notaDebito: 'Nota de débito',
  notaCredito: 'Nota de crédito',
  factura: 'Factura',
  retIslr: 'Retención ISLR',
  retIva: 'Retención IVA',
  'RET ISLR': 'Retención ISLR',
  'RET IVA': 'Retención IVA',
  notaEntrega: 'Nota de entrega',
  devolucion: 'Devolución'
}
export const tiposDeclaracion = {
  islr: 'retIslr',
  iva: 'retIva',
  planillaIva: 'planillaIva'
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
  const cadenaConCeros = numero.toString().padStart(8, '0')

  // Cortar la cadena al tamaño máximo deseado
  const cadenaFormateada = `${fecha}${cadenaConCeros.slice(0, 8)}`

  return cadenaFormateada
}

export const constTiposResidenteISLR = {
  pnr: 'Persona natural residente',
  pnnr: 'Persona natural no residente',
  pjd: 'Persona juridica domiciliada',
  pjnd: 'Persona juridica no domiciliada'
  // pjncd: 'PJNCD',
}
