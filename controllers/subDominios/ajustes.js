import moment from 'moment'
import { getCollectionSD, getItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import { ObjectId } from 'mongodb'

export const getAjustesCliente = async (req, res) => {
  const { clienteId } = req.body
  if (!clienteId) return res.status(400).json({ error: 'Falta el cliente' })
  try {
    const ajustes = await getCollectionSD({ enviromentClienteId: clienteId, nameCollection: 'ajustes' })
    const ajusteToObject = {}
    ajustes.forEach(ajuste => {
      ajusteToObject[ajuste.tipo] = ajuste
    })
    return res.status(200).json({ status: 'ajustes obtenidos exitosamente', ajustes: ajusteToObject })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: `Error de servidor al momento de obtener ajustes ${e.message}` })
  }
}
export const getTipoAjustesCliente = async (req, res) => {
  const clienteId = req.body.clienteId
  if (!clienteId) return res.status(400).json({ error: 'Falta el cliente' })
  const tipo = req.body.tipo
  try {
    const ajustes = await getItemSD({ enviromentClienteId: clienteId, nameCollection: 'ajustes', filters: { tipo } })
    return res.status(200).json(ajustes)
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: `Error de servidor al momento de obtener ajustes ${tipo} ${e.message}` })
  }
}
export const upsertAjusteCliente = async (req, res) => {
  const ajuste = req.body.ajuste
  const clienteId = req.body.clienteId
  console.log({ ajuste })
  if (ajuste.cuentaSuperAvitAcum && ajuste.cuentaSuperAvitAcum._id) ajuste.cuentaSuperAvitAcum = new ObjectId(ajuste.cuentaSuperAvitAcum._id)
  if (ajuste.cuentaPerdidaAcum && ajuste.cuentaPerdidaAcum._id) ajuste.cuentaPerdidaAcum = new ObjectId(ajuste.cuentaPerdidaAcum._id)
  if (ajuste.cuentaSuperAvitOperdidaActual && ajuste.cuentaSuperAvitOperdidaActual._id) ajuste.cuentaSuperAvitOperdidaActual = new ObjectId(ajuste.cuentaSuperAvitOperdidaActual._id)
  if (ajuste.cuentaVariacionInventario && ajuste.cuentaVariacionInventario._id) ajuste.cuentaVariacionInventario = new ObjectId(ajuste.cuentaVariacionInventario._id)
  if (ajuste.cuentaDescuentoCompra && ajuste.cuentaDescuentoCompra._id) ajuste.cuentaDescuentoCompra = new ObjectId(ajuste.cuentaDescuentoCompra._id)
  if (ajuste.cuentaISLR && ajuste.cuentaISLR._id) ajuste.cuentaISLR = new ObjectId(ajuste.cuentaISLR._id)
  if (ajuste.cuentaIva && ajuste.cuentaIva._id) ajuste.cuentaIva = new ObjectId(ajuste.cuentaIva._id)
  if (ajuste.cuentaRetIva && ajuste.cuentaRetIva._id) ajuste.cuentaRetIva = new ObjectId(ajuste.cuentaRetIva._id)
  if (ajuste.cuentaRetIslrCompra && ajuste.cuentaRetIslrCompra._id) ajuste.cuentaRetIslrCompra = new ObjectId(ajuste.cuentaRetIslrCompra._id)
  if (ajuste.cuentaRetIvaVenta && ajuste.cuentaRetIvaVenta._id) ajuste.cuentaRetIvaVenta = new ObjectId(ajuste.cuentaRetIvaVenta._id)
  if (ajuste.cuentaIgtf && ajuste.cuentaIgtf._id) ajuste.cuentaIgtf = new ObjectId(ajuste.cuentaIgtf._id)
  if (ajuste.cuentaVariacionCambiaria && ajuste.cuentaVariacionCambiaria._id) ajuste.cuentaVariacionCambiaria = new ObjectId(ajuste.cuentaVariacionCambiaria._id)
  if (ajuste.cuentaVariacionCambiariaGastos && ajuste.cuentaVariacionCambiariaGastos._id) ajuste.cuentaVariacionCambiariaGastos = new ObjectId(ajuste.cuentaVariacionCambiariaGastos._id)
  if (ajuste.cuentaDescuentosDevolucionesCompras && ajuste.cuentaDescuentosDevolucionesCompras._id) ajuste.cuentaDescuentosDevolucionesCompras = new ObjectId(ajuste.cuentaDescuentosDevolucionesCompras._id)
  if (ajuste.cuentaIvaId) ajuste.cuentaIvaId = new ObjectId(ajuste.cuentaIvaId)
  if (ajuste.cuentaPorCobrarClienteId) ajuste.cuentaPorCobrarClienteId = new ObjectId(ajuste.cuentaPorCobrarClienteId)
  if (ajuste.cuentaDiferenciaVentasId) ajuste.cuentaDiferenciaVentasId = new ObjectId(ajuste.cuentaDiferenciaVentasId)
  if (ajuste.cuentaDiferenciasCajas) ajuste.cuentaDiferenciasCajas = new ObjectId(ajuste.cuentaDiferenciasCajas)
  if (ajuste.cuentaDescuentosProductosId) ajuste.cuentaDescuentosProductosId = new ObjectId(ajuste.cuentaDescuentosProductosId)
  if (ajuste.cuentaIGTFPorPagarId) ajuste.cuentaIGTFPorPagarId = new ObjectId(ajuste.cuentaIGTFPorPagarId)
  if (ajuste.cuentaCobroRetencion && ajuste.cuentaCobroRetencion._id) ajuste.cuentaCobroRetencion = ajuste.cuentaCobroRetencion = new ObjectId(ajuste.cuentaCobroRetencion._id)
  if (ajuste.cuentaDiferenciaCompras && ajuste.cuentaDiferenciaCompras._id) ajuste.cuentaDiferenciaCompras = ajuste.cuentaDiferenciaCompras = new ObjectId(ajuste.cuentaDiferenciaCompras._id)
  if (ajuste._id) delete ajuste._id
  if (ajuste.puedeDesbloquearComprobantes) {
    ajuste.puedeDesbloquearComprobantes = ajuste.puedeDesbloquearComprobantes.map(userId => new ObjectId(userId))
  }
  if (ajuste.puedeRecibir && ajuste.puedeRecibir[0]) ajuste.puedeRecibir = ajuste.puedeRecibir.map(puedeRecibir => new ObjectId(puedeRecibir._id))
  if (ajuste.puedeCrear && ajuste.puedeCrear[0]) ajuste.puedeCrear = ajuste.puedeCrear.map(puedeCrear => new ObjectId(puedeCrear._id))
  if (ajuste.puedeCrearProductos && ajuste.puedeCrearProductos[0]) ajuste.puedeCrearProductos = ajuste.puedeCrearProductos.map(puedeCrearProductos => new ObjectId(puedeCrearProductos._id))
  if (ajuste.puedeEditarProductos && ajuste.puedeEditarProductos[0]) ajuste.puedeEditarProductos = ajuste.puedeEditarProductos.map(puedeEditarProductos => new ObjectId(puedeEditarProductos._id))
  if (ajuste.puedeAgregarEditarCantidadesCostos && ajuste.puedeAgregarEditarCantidadesCostos[0]) ajuste.puedeAgregarEditarCantidadesCostos = ajuste.puedeAgregarEditarCantidadesCostos.map(puedeAgregarEditarCantidadesCostos => new ObjectId(puedeAgregarEditarCantidadesCostos._id))
  if (ajuste.puedeImportarProductos && ajuste.puedeImportarProductos[0]) ajuste.puedeImportarProductos = ajuste.puedeImportarProductos.map(puedeImportarProductos => new ObjectId(puedeImportarProductos._id))
  if (ajuste.puedeEnviarMercancia && ajuste.puedeEnviarMercancia[0]) ajuste.puedeEnviarMercancia = ajuste.puedeEnviarMercancia.map(puedeEnviarMercancia => new ObjectId(puedeEnviarMercancia._id))
  if (ajuste.cuentaPerdidasAjusteInventario && ajuste.cuentaPerdidasAjusteInventario._id) ajuste.cuentaPerdidasAjusteInventario = new ObjectId(ajuste.cuentaPerdidasAjusteInventario._id)
  if (ajuste.cuentaUtilidadAjusteInventario && ajuste.cuentaUtilidadAjusteInventario._id) ajuste.cuentaUtilidadAjusteInventario = ajuste.cuentaUtilidadAjusteInventario = new ObjectId(ajuste.cuentaUtilidadAjusteInventario._id)
  if (ajuste.puedeModificarPrecioProducto && ajuste.puedeModificarPrecioProducto[0]) ajuste.puedeModificarPrecioProducto = ajuste.puedeModificarPrecioProducto.map(puedeModificarPrecioProducto => new ObjectId(puedeModificarPrecioProducto._id))
  if (ajuste.puedeCrearNotasCredito && ajuste.puedeCrearNotasCredito[0]) ajuste.puedeCrearNotasCredito = ajuste.puedeCrearNotasCredito.map(puedeCrearNotasCredito => new ObjectId(puedeCrearNotasCredito._id))
  if (ajuste.puedeCrearNotasDebito && ajuste.puedeCrearNotasDebito[0]) ajuste.puedeCrearNotasDebito = ajuste.puedeCrearNotasDebito.map(puedeCrearNotasDebito => new ObjectId(puedeCrearNotasDebito._id))
  if (ajuste.accesoFacturacionFija && ajuste.accesoFacturacionFija[0]) ajuste.accesoFacturacionFija = ajuste.accesoFacturacionFija.map(accesoFacturacionFija => new ObjectId(accesoFacturacionFija._id))
  if (ajuste.puedeCrearEditarFacturacionFija && ajuste.puedeCrearEditarFacturacionFija[0]) ajuste.puedeCrearEditarFacturacionFija = ajuste.puedeCrearEditarFacturacionFija.map(puedeCrearEditarFacturacionFija => new ObjectId(puedeCrearEditarFacturacionFija._id))
  if (ajuste.numeroFacturaInicial) ajuste.numeroFacturaInicial = Number(ajuste.numeroFacturaInicial)
  if (ajuste.numeroRetIslrInicial || ajuste.numeroRetIvaInicial) {
    const verificarNumeros = await getItemSD({
      enviromentClienteId: clienteId,
      nameCollection: 'ajustes',
      filters: { tipo: 'tributos' }
    })
    if (ajuste.numeroRetIslrInicial) {
      ajuste.numeroRetIslrInicial = Number(ajuste.numeroRetIslrInicial)
      if (verificarNumeros.numeroRetIslrInicial !== Number(ajuste.numeroRetIslrInicial)) {
        upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'retencionIslr' }, update: { $set: { contador: Number(ajuste.numeroRetIslrInicial) } } })
      }
    }
    if (ajuste.numeroRetIvaInicial) {
      ajuste.numeroRetIvaInicial = Number(ajuste.numeroRetIvaInicial)
      if (verificarNumeros.numeroRetIvaInicial !== Number(ajuste.numeroRetIvaInicial)) {
        upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'retencionIva' }, update: { $set: { contador: Number(ajuste.numeroRetIvaInicial) } } })
      }
    }
  }
  if (!clienteId) return res.status(400).json({ error: 'Falta el cliente' })
  try {
    if (!ajuste.fechaCreacion) ajuste.fechaCreacion = moment().toDate()
    if (ajuste.nivelCuenta) ajuste.nivelCuenta = parseInt(ajuste.nivelCuenta)
    const ajusteActualizado = await upsertItemSD({
      enviromentClienteId: clienteId,
      nameCollection: 'ajustes',
      filters: { tipo: ajuste.tipo },
      update: { $set: { ...ajuste } }
    })

    return res.status(200).json({ status: 'ajuste actualizado exitosamente', ajuste: ajusteActualizado })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: `Error de servidor al momento de actualizar ajuste ${ajuste.tipo} ${e.message}` })
  }
}
