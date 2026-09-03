'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { BRAND_CONFIG } from '../../lib/brandConfig';
import {
  getMesas,
  crearPedido,
  atenderSolicitud,
  liberarMesa,
  cambiarEstadoPedido,
  seedDatabase,
  DbTable,
  DbOrder,
  DbRequest,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  ocuparMesa,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  subirImagenProducto,
  crearMesa,
  eliminarMesa,
  facturarPedido,
  DatosFacturacionPayload,
  DbProduct,
  DbCategory
} from '../../lib/dbActions';
import {
  Bell,
  Receipt,
  RefreshCw,
  Trash2,
  QrCode,
  Database,
  ShoppingBag,
  Truck,
  Coffee,
  User,
  Phone,
  MapPin,
  Printer,
  Sparkles,
  CheckCircle,
  TrendingUp,
  Loader2,
  DollarSign,
  Calendar,
  BarChart3,
  Pencil,
  ImageOff
} from 'lucide-react';
import { Button, IconButton, Badge, EmptyState, Modal, useToast, useConfirm } from '../../components/ui';

type TabId = 'monitoreo' | 'pedidos' | 'qrs' | 'metrics' | 'inventario' | 'facturacion';

export default function AdminDashboard() {
  const toast = useToast();
  const confirmDialog = useConfirm();

  // Rol de la vista. DEMO: se entra directo al panel, sin login ni PIN.
  // Arranca como "dueño" (acceso completo, incluye Métricas) y se puede
  // cambiar a "caja" desde el header para mostrar la vista del personal.
  const [rolActivo, setRolActivo] = useState<'caja' | 'dueno'>('dueno');

  // Navegación
  const [tabActiva, setTabActiva] = useState<TabId>('monitoreo');

  // Datos del Servidor
  const [mesas, setMesas] = useState<DbTable[]>([]);
  const [pedidos, setPedidos] = useState<DbOrder[]>([]);
  const [solicitudes, setSolicitudes] = useState<DbRequest[]>([]);
  const [productosList, setProductosList] = useState<DbProduct[]>([]);
  const [categoriasList, setCategoriasList] = useState<DbCategory[]>([]);

  // Estados del Formulario de Productos (CRUD)
  const [mostrarFormProducto, setMostrarFormProducto] = useState(false);
  const [productoEditando, setProductoEditando] = useState<DbProduct | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formPrecio, setFormPrecio] = useState('');
  const [formImagenUrl, setFormImagenUrl] = useState('');
  const [formCategoriaId, setFormCategoriaId] = useState<string | number>('');
  const [formStock, setFormStock] = useState('');
  const [formStockMinimo, setFormStockMinimo] = useState('2');
  const [formEsCafe, setFormEsCafe] = useState(false);
  const [formDisponible, setFormDisponible] = useState(true);

  // Estados de Gestión de Categorías (CRUD)
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState('');
  const [guardandoCategoria, setGuardandoCategoria] = useState(false);
  const [categoriaEditandoId, setCategoriaEditandoId] = useState<number | null>(null);
  const [categoriaEditandoNombre, setCategoriaEditandoNombre] = useState('');

  // Subida de imagen de producto
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [errorSubidaImagen, setErrorSubidaImagen] = useState('');

  // Estados para el Consumo Manual desde Caja
  const [mostrarModalConsumoManual, setMostrarModalConsumoManual] = useState(false);
  const [mesaConsumoManual, setMesaConsumoManual] = useState<DbTable | null>(null);
  const [itemsConsumoManual, setItemsConsumoManual] = useState<{ producto: DbProduct; cantidad: number; observaciones?: string }[]>([]);
  const [manualProductoSeleccionadoId, setManualProductoSeleccionadoId] = useState<string | number>('');
  const [manualCantidad, setManualCantidad] = useState(1);
  const [manualObservaciones, setManualObservaciones] = useState('');
  const [manualEnviarACocina, setManualEnviarACocina] = useState(true);

  // Estados para el Modal de Cobro & Facturación
  const [mostrarModalFacturacion, setMostrarModalFacturacion] = useState(false);
  const [pedidoParaFacturar, setPedidoParaFacturar] = useState<DbOrder | null>(null);
  const [facturaTipoComprobante, setFacturaTipoComprobante] = useState<'pre_cuenta' | 'factura_b' | 'factura_a'>('factura_b');
  const [facturaMetodoPago, setFacturaMetodoPago] = useState<'efectivo' | 'tarjeta' | 'mercadopago' | 'mixto'>('efectivo');
  const [facturaEfectivoAbonado, setFacturaEfectivoAbonado] = useState('');
  const [facturaMontoEfectivoMixto, setFacturaMontoEfectivoMixto] = useState('');
  const [facturaMontoMercadoPagoMixto, setFacturaMontoMercadoPagoMixto] = useState('');
  const [facturaClienteCuit, setFacturaClienteCuit] = useState('');
  const [facturaClienteRazonSocial, setFacturaClienteRazonSocial] = useState('');
  const [facturaClienteCondicionIva, setFacturaClienteCondicionIva] = useState('Responsable Inscripto');
  const [facturaDescuento, setFacturaDescuento] = useState('0');
  const [facturaPropina, setFacturaPropina] = useState('0');
  const [facturaLiberarMesa, setFacturaLiberarMesa] = useState(true);
  const [procesandoFacturacion, setProcesandoFacturacion] = useState(false);
  const [ticketFacturaImprimir, setTicketFacturaImprimir] = useState<DbOrder | null>(null);

  // Estados de interfaz
  const [cargando, setCargando] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedingMsg, setSeedingMsg] = useState('');

  // Hostname para códigos QR
  const [hostUrl, setHostUrl] = useState('');
  const [mesaTicketImprimir, setMesaTicketImprimir] = useState<DbTable | null>(null);

  // Guardar última longitud de solicitudes para reproducir sonido
  const prevSolicitudesCount = useRef(0);

  // Cargar rol desde sessionStorage en la carga inicial
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHostUrl(window.location.origin);
      // Se recuerda la última vista elegida (caja/dueño) sólo por comodidad;
      // si no hay nada guardado entra como dueño.
      const savedRole = sessionStorage.getItem(`${BRAND_CONFIG.storagePrefix}_admin_rol`);
      if (savedRole === 'caja' || savedRole === 'dueno') {
        setRolActivo(savedRole);
      }
    }
  }, []);

  // Cargar todos los datos
  const cargarDatosCompletos = async () => {
    try {
      const dataMesas = await getMesas();
      setMesas(dataMesas);

      // Cargar pedidos (Mesa y Delivery)
      const { data: dbPedidos, error: pedError } = await supabase
        .from('pedidos')
        .select('*, mesa:mesas(*), detalles:detalles_pedido(*, producto:productos(*))')
        .order('id', { ascending: false });

      if (!pedError && dbPedidos) {
        setPedidos(dbPedidos as unknown as DbOrder[]);
      }

      // Cargar solicitudes pendientes
      const { data: dbSolicitudes, error: solError } = await supabase
        .from('solicitudes')
        .select('*, mesa:mesas(*)')
        .eq('estado', 'pendiente')
        .order('id', { ascending: false });

      if (!solError && dbSolicitudes) {
        const countNuevas = dbSolicitudes.length;
        if (countNuevas > prevSolicitudesCount.current) {
          playChime();
        }
        prevSolicitudesCount.current = countNuevas;
        setSolicitudes(dbSolicitudes as unknown as DbRequest[]);
      }

      // Cargar productos
      const { data: dbProds, error: prodErr } = await supabase
        .from('productos')
        .select('*, categoria:categorias(*)')
        .order('id', { ascending: true });
      if (!prodErr && dbProds) {
        setProductosList(dbProds as unknown as DbProduct[]);
      }

      // Cargar categorías
      const { data: dbCats, error: catsErr } = await supabase
        .from('categorias')
        .select('*')
        .order('nombre', { ascending: true });
      if (!catsErr && dbCats) {
        setCategoriasList(dbCats as unknown as DbCategory[]);
      }
    } catch (err) {
      console.error('Error cargando datos del panel admin:', err);
    } finally {
      setCargando(false);
    }
  };

  // Sonido de campana para notificaciones
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
      gain1.gain.setValueAtTime(0.12, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.4);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.50, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(1567.98, ctx.currentTime + 0.15);
        gain2.gain.setValueAtTime(0.12, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.5);
      }, 150);

    } catch (err) {
      console.warn('AudioContext bloqueado hasta interacción.', err);
    }
  };

  useEffect(() => {
    if (rolActivo) {
      cargarDatosCompletos();

      const channelPedidos = supabase
        .channel('admin-pedidos')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
          cargarDatosCompletos();
        })
        .subscribe();

      const channelMesas = supabase
        .channel('admin-mesas')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, () => {
          cargarDatosCompletos();
        })
        .subscribe();

      const channelSolicitudes = supabase
        .channel('admin-solicitudes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes' }, () => {
          cargarDatosCompletos();
        })
        .subscribe();

      const channelProductos = supabase
        .channel('admin-productos')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => {
          cargarDatosCompletos();
        })
        .subscribe();

      const interval = setInterval(cargarDatosCompletos, 15000);

      return () => {
        supabase.removeChannel(channelPedidos);
        supabase.removeChannel(channelMesas);
        supabase.removeChannel(channelSolicitudes);
        supabase.removeChannel(channelProductos);
        clearInterval(interval);
      };
    }
  }, [rolActivo]);

  // Cambiar entre la vista de Caja/Personal y la de Dueño (sin login: es una demo)
  const cambiarRol = (rol: 'caja' | 'dueno') => {
    setRolActivo(rol);
    try {
      sessionStorage.setItem(`${BRAND_CONFIG.storagePrefix}_admin_rol`, rol);
    } catch (err) {
      console.warn('sessionStorage no disponible:', err);
    }
    // "Métricas" sólo existe para el dueño: si estaba parado ahí y pasa a
    // caja, lo devolvemos al monitoreo para que no quede una pantalla vacía.
    if (rol === 'caja') {
      setTabActiva((actual) => (actual === 'metrics' ? 'monitoreo' : actual));
    }
  };

  // Abrir Modal de Facturación para una Mesa
  const handleAbrirFacturacionMesa = (mesa: DbTable) => {
    const pedidosMesa = pedidos.filter(p => p.mesa_id === mesa.id && p.estado !== 'cancelado');
    if (pedidosMesa.length === 0) {
      toast.show(`La Mesa ${mesa.numero} no tiene consumos registrados para cobrar.`, 'error');
      return;
    }
    const principalOrder = pedidosMesa[0];
    setPedidoParaFacturar(principalOrder);
    setFacturaTipoComprobante('factura_b');
    setFacturaMetodoPago('efectivo');
    setFacturaEfectivoAbonado('');
    setFacturaMontoEfectivoMixto('');
    setFacturaMontoMercadoPagoMixto('');
    setFacturaClienteCuit('');
    setFacturaClienteRazonSocial('');
    setFacturaDescuento('0');
    setFacturaPropina('0');
    setFacturaLiberarMesa(true);
    setMostrarModalFacturacion(true);
  };

  // Abrir Modal de Facturación para un Pedido
  const handleAbrirFacturacionPedido = (pedido: DbOrder) => {
    setPedidoParaFacturar(pedido);
    setFacturaTipoComprobante('factura_b');
    setFacturaMetodoPago('efectivo');
    setFacturaEfectivoAbonado('');
    setFacturaMontoEfectivoMixto('');
    setFacturaMontoMercadoPagoMixto('');
    setFacturaClienteCuit('');
    setFacturaClienteRazonSocial('');
    setFacturaDescuento('0');
    setFacturaPropina('0');
    setFacturaLiberarMesa(true);
    setMostrarModalFacturacion(true);
  };

  // Confirmar Facturación y Cobro
  const handleConfirmarFacturacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pedidoParaFacturar) return;

    if (facturaTipoComprobante === 'factura_a' && (!facturaClienteCuit.trim() || !facturaClienteRazonSocial.trim())) {
      toast.show('Para emitir Factura A debés completar el CUIT y la Razón Social.', 'error');
      return;
    }

    setProcesandoFacturacion(true);

    let desglose: any = null;
    if (facturaMetodoPago === 'mixto') {
      const ef = Number(facturaMontoEfectivoMixto || 0);
      const mp = Number(facturaMontoMercadoPagoMixto || 0);
      desglose = { efectivo: ef, mercadopago: mp };
    }

    const payload: DatosFacturacionPayload = {
      tipo_comprobante: facturaTipoComprobante,
      metodo_pago: facturaMetodoPago,
      desglose_pago: desglose,
      cliente_cuit: facturaClienteCuit || undefined,
      cliente_razon_social: facturaClienteRazonSocial || undefined,
      cliente_condicion_iva: facturaClienteCondicionIva || undefined,
      descuento: Number(facturaDescuento || 0),
      propina: Number(facturaPropina || 0),
      liberarMesaDespues: facturaLiberarMesa
    };

    try {
      const { success, comprobante, error } = await facturarPedido(pedidoParaFacturar.id, payload);
      if (!success || error) throw new Error(error || 'Error al procesar facturación');

      setMostrarModalFacturacion(false);
      setTicketFacturaImprimir(comprobante as DbOrder);

      // Recargar mesas y pedidos desde Supabase
      const dbTables = await getMesas();
      setMesas(dbTables);

      const { data: dbOrders } = await supabase
        .from('pedidos')
        .select('*, detalles:detalles_pedido(*, producto:productos(*)), mesa:mesas(*)')
        .order('id', { ascending: false });
      if (dbOrders) setPedidos(dbOrders as unknown as DbOrder[]);

    } catch (err: any) {
      toast.show('Error en el proceso de cobro: ' + err.message, 'error');
    } finally {
      setProcesandoFacturacion(false);
    }
  };

  // Guardar o actualizar producto en la base de datos (CRUD)
  const handleProductoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim() || !formPrecio.trim() || !formCategoriaId) {
      toast.show('Por favor completa los campos requeridos.', 'error');
      return;
    }

    const price = Number(formPrecio);
    if (isNaN(price) || price < 0) {
      toast.show('El precio debe ser un número válido mayor o igual a 0.', 'error');
      return;
    }

    const stockVal = formStock.trim() === '' ? null : Number(formStock);
    const stockMinVal = formStockMinimo.trim() === '' ? 0 : Number(formStockMinimo);

    const productPayload = {
      nombre: formNombre.trim(),
      descripcion: formDescripcion.trim() || null,
      precio: price,
      imagen_url: formImagenUrl.trim() || null,
      disponible: formDisponible,
      es_cafe: formEsCafe,
      categoria_id: Number(formCategoriaId),
      stock: stockVal,
      stock_minimo: stockMinVal
    };

    try {
      let res;
      if (productoEditando) {
        res = await actualizarProducto(productoEditando.id, productPayload);
      } else {
        res = await crearProducto(productPayload);
      }

      if (res.success) {
        setMostrarFormProducto(false);
        setProductoEditando(null);
        cargarDatosCompletos();
        toast.show('Producto guardado exitosamente.', 'success');
      } else {
        toast.show('Error al guardar producto: ' + res.error, 'error');
      }
    } catch (err: any) {
      toast.show('Error: ' + err.message, 'error');
    }
  };

  // Agregar la siguiente mesa disponible (numero mas alto + 1)
  const handleAgregarMesa = async () => {
    const siguienteNumero = mesas.length > 0 ? Math.max(...mesas.map(m => m.numero)) + 1 : 1;
    const res = await crearMesa(siguienteNumero);
    if (res.success) {
      cargarDatosCompletos();
    } else {
      toast.show('Error al agregar la mesa: ' + res.error, 'error');
    }
  };

  // Eliminar una mesa (solo si esta libre, para no perder una sesion en curso)
  const handleEliminarMesa = async (mesa: DbTable) => {
    if (mesa.estado !== 'libre') {
      toast.show('Esta mesa está en uso. Liberala primero desde Monitoreo de Mesas antes de eliminarla.', 'error');
      return;
    }
    const ok = await confirmDialog({
      title: `¿Eliminar la Mesa ${mesa.numero}?`,
      description: 'Se borrará también su código QR.',
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;

    const res = await eliminarMesa(mesa.id);
    if (res.success) {
      cargarDatosCompletos();
    } else {
      toast.show('Error al eliminar la mesa: ' + res.error, 'error');
    }
  };

  // Manejar la selección de un archivo de imagen para el producto
  const handleSeleccionarImagen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorSubidaImagen('');
    setSubiendoImagen(true);
    const res = await subirImagenProducto(file);
    setSubiendoImagen(false);

    if (res.success && res.url) {
      setFormImagenUrl(res.url);
    } else {
      setErrorSubidaImagen(res.error || 'No se pudo subir la imagen.');
    }
    // Permitir volver a elegir el mismo archivo si hace falta
    e.target.value = '';
  };

  // Crear una nueva categoría de menú
  const handleCrearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaCategoriaNombre.trim()) return;

    setGuardandoCategoria(true);
    const res = await crearCategoria(nuevaCategoriaNombre);
    setGuardandoCategoria(false);

    if (res.success) {
      setNuevaCategoriaNombre('');
      cargarDatosCompletos();
    } else {
      toast.show('Error al crear la categoría: ' + res.error, 'error');
    }
  };

  // Guardar el nombre editado de una categoría
  const handleGuardarCategoriaEditada = async (id: number) => {
    if (!categoriaEditandoNombre.trim()) return;
    const res = await actualizarCategoria(id, categoriaEditandoNombre);
    if (res.success) {
      setCategoriaEditandoId(null);
      setCategoriaEditandoNombre('');
      cargarDatosCompletos();
    } else {
      toast.show('Error al renombrar la categoría: ' + res.error, 'error');
    }
  };

  // Eliminar una categoría (bloqueado si tiene productos asociados)
  const handleEliminarCategoria = async (cat: DbCategory) => {
    const ok = await confirmDialog({
      title: `¿Eliminar la categoría "${cat.nombre}"?`,
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await eliminarCategoria(cat.id);
    if (res.success) {
      cargarDatosCompletos();
    } else {
      toast.show(res.error || 'No se pudo eliminar la categoría.', 'error');
    }
  };

  // Eliminar un producto del catálogo
  const handleEliminarProducto = async (prod: DbProduct) => {
    const ok = await confirmDialog({
      title: `¿Eliminar el producto "${prod.nombre}"?`,
      description: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await eliminarProducto(prod.id);
    if (res.success) {
      cargarDatosCompletos();
    } else {
      toast.show('Error al eliminar: ' + res.error, 'error');
    }
  };

  // Abrir el formulario de edición de un producto existente, precargando sus datos.
  const abrirEdicionProducto = (prod: DbProduct) => {
    setProductoEditando(prod);
    setFormNombre(prod.nombre);
    setFormDescripcion(prod.descripcion || '');
    setFormPrecio(prod.precio.toString());
    setFormImagenUrl(prod.imagen_url || '');
    setFormCategoriaId(prod.categoria_id?.toString() || '');
    setFormStock(prod.stock !== null ? prod.stock.toString() : '');
    setFormStockMinimo((prod.stock_minimo ?? 2).toString());
    setFormEsCafe(prod.es_cafe);
    setFormDisponible(prod.disponible);
    setErrorSubidaImagen('');
    setMostrarFormProducto(true);
  };

  // Agregar un ítem temporal a la lista de consumo manual
  const handleAgregarItemConsumoManual = () => {
    if (!manualProductoSeleccionadoId) {
      toast.show('Seleccioná un producto.', 'error');
      return;
    }
    const prod = productosList.find(p => p.id === Number(manualProductoSeleccionadoId));
    if (!prod) return;

    // Validar stock local antes de agregar a la lista temporal
    if (prod.stock !== null && prod.stock < manualCantidad) {
      toast.show(`No hay stock suficiente para ${prod.nombre}. Disponible: ${prod.stock} unidades.`, 'error');
      return;
    }

    // Agregar
    setItemsConsumoManual(prev => {
      const existe = prev.find(item => item.producto.id === prod.id && item.observaciones === manualObservaciones);
      if (existe) {
        return prev.map(item =>
          item.producto.id === prod.id && item.observaciones === manualObservaciones
            ? { ...item, cantidad: item.cantidad + manualCantidad }
            : item
        );
      }
      return [...prev, { producto: prod, cantidad: manualCantidad, observaciones: manualObservaciones || undefined }];
    });

    // Limpiar campos temporales
    setManualCantidad(1);
    setManualObservaciones('');
  };

  // Guardar un pedido manual desde caja/monitoreo de mesas
  const handleConfirmarConsumoManual = async () => {
    if (!mesaConsumoManual || itemsConsumoManual.length === 0) return;

    try {
      let activeNombre = mesaConsumoManual.cliente_nombre;
      let activeTelefono = mesaConsumoManual.cliente_telefono;

      // A. Si la mesa está libre, ocuparla automáticamente en Supabase
      if (mesaConsumoManual.estado === 'libre') {
        activeNombre = 'Mesa (Manual)';
        activeTelefono = '-';
        await ocuparMesa(mesaConsumoManual.id, activeNombre, activeTelefono);
      }

      // B. Calcular el total
      const totalPedido = itemsConsumoManual.reduce((sum, item) => sum + (item.producto.precio * item.cantidad), 0);

      // C. Crear el pedido
      const res = await crearPedido({
        tipo: 'mesa',
        mesa_id: mesaConsumoManual.id,
        nombre_cliente: activeNombre || 'Mesa (Manual)',
        telefono: activeTelefono || '-',
        total: totalPedido,
        items: itemsConsumoManual.map(item => ({
          productoId: item.producto.id,
          cantidad: item.cantidad,
          precioUnitario: item.producto.precio,
          observaciones: item.observaciones
        }))
      });

      if (res.error) throw res.error;

      // D. Si no se envía a cocina (es decir, ya fue entregado), actualizar el estado del pedido
      if (!manualEnviarACocina && res.data) {
        await cambiarEstadoPedido(res.data.id, 'entregado');
      }

      // Cerrar modal y limpiar
      const numeroMesa = mesaConsumoManual.numero;
      setMostrarModalConsumoManual(false);
      setMesaConsumoManual(null);
      setItemsConsumoManual([]);
      setManualProductoSeleccionadoId('');
      setManualCantidad(1);
      setManualObservaciones('');
      cargarDatosCompletos();
      toast.show('Consumo agregado exitosamente a la mesa ' + numeroMesa, 'success');
    } catch (err: any) {
      console.error('Error al confirmar consumo manual:', err);
      toast.show('Error: ' + err.message, 'error');
    }
  };

  // Inicializar Base de Datos
  const handleSeed = async () => {
    setSeeding(true);
    setSeedingMsg('Inicializando base de datos en Supabase...');
    const result = await seedDatabase();
    setSeedingMsg(result.message);
    setSeeding(false);
    setTimeout(() => {
      setSeedingMsg('');
      cargarDatosCompletos();
    }, 4000);
  };

  // Atender un llamado de Mozo o Cuenta
  const handleAtenderSolicitud = async (solicitudId: number) => {
    const ok = await atenderSolicitud(solicitudId);
    if (ok) {
      cargarDatosCompletos();
    }
  };

  // Liberar Mesa completa
  const handleLiberarMesa = async (mesaId: number) => {
    const ok = await liberarMesa(mesaId);
    if (ok) {
      cargarDatosCompletos();
    }
  };

  // Pedir confirmación y liberar una mesa (usado desde Monitoreo)
  const handleConfirmarLiberarMesa = async (mesa: DbTable) => {
    const ok = await confirmDialog({
      title: `¿Liberar la Mesa ${mesa.numero}?`,
      description: 'Esto borrará los consumos de la sesión actual.',
      confirmLabel: 'Liberar',
      tone: 'danger',
    });
    if (ok) {
      handleLiberarMesa(mesa.id);
    }
  };

  // Actualizar estado de pedido
  const handleEstadoPedido = async (pedidoId: number, estado: string) => {
    const ok = await cambiarEstadoPedido(pedidoId, estado);
    if (ok) {
      cargarDatosCompletos();
    }
  };

  // Pedir confirmación y cancelar un pedido (usado desde Pedidos)
  const handleConfirmarCancelarPedido = async (pedidoId: number) => {
    const ok = await confirmDialog({
      title: '¿Desea cancelar este pedido?',
      confirmLabel: 'Sí, cancelar',
      tone: 'danger',
    });
    if (ok) {
      handleEstadoPedido(pedidoId, 'cancelado');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtrar pedidos activos vs históricos
  const pedidosActivos = pedidos.filter(p => ['pendiente', 'preparando', 'listo'].includes(p.estado));
  const pedidosCompletados = pedidos.filter(p => ['entregado', 'cancelado'].includes(p.estado));

  // Preparar consumos consolidados para ticket
  const pedidosMesaImprimir = mesaTicketImprimir && mesaTicketImprimir.ocupada_desde
    ? pedidos.filter(p =>
        p.mesa_id === mesaTicketImprimir.id &&
        p.estado !== 'cancelado' &&
        new Date(p.created_at) >= new Date(mesaTicketImprimir.ocupada_desde!)
      )
    : [];

  const itemsImprimir = pedidosMesaImprimir.flatMap(p => p.detalles || []);

  interface ItemConsolidado {
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    observaciones?: string;
  }

  const consumosConsolidados: ItemConsolidado[] = [];
  itemsImprimir.forEach(det => {
    const prodNombre = det.producto?.nombre || 'Producto';
    const obs = det.observaciones || '';
    const exist = consumosConsolidados.find(i => i.nombre === prodNombre && (i.observaciones || '') === obs);
    if (exist) {
      exist.cantidad += det.cantidad;
    } else {
      consumosConsolidados.push({
        nombre: prodNombre,
        cantidad: det.cantidad,
        precioUnitario: Number(det.precio_unitario),
        observaciones: det.observaciones || undefined
      });
    }
  });

  const totalTicket = consumosConsolidados.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0);

  // ================= CÁLCULO DE MÉTRICAS (DUEÑO) =================
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  // Calcular Lunes de la semana en curso
  const inicioSemana = new Date(inicioHoy);
  const diaSemana = inicioSemana.getDay();
  const diff = inicioSemana.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
  inicioSemana.setDate(diff);

  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  // Totales de facturación
  const ventasHoy = pedidos
    .filter(p => p.estado !== 'cancelado' && new Date(p.created_at) >= inicioHoy)
    .reduce((sum, p) => sum + Number(p.total), 0);

  const ventasSemana = pedidos
    .filter(p => p.estado !== 'cancelado' && new Date(p.created_at) >= inicioSemana)
    .reduce((sum, p) => sum + Number(p.total), 0);

  const ventasMes = pedidos
    .filter(p => p.estado !== 'cancelado' && new Date(p.created_at) >= inicioMes)
    .reduce((sum, p) => sum + Number(p.total), 0);

  // Rotación de Productos e Infusiones
  const productSalesMap: { [nombre: string]: { cantidad: number; total: number; esCafe: boolean } } = {};

  pedidos
    .filter(p => p.estado !== 'cancelado')
    .forEach(p => {
      p.detalles?.forEach(d => {
        const name = d.producto?.nombre || 'Producto';
        const isCafe = d.producto?.es_cafe || false;
        if (!productSalesMap[name]) {
          productSalesMap[name] = { cantidad: 0, total: 0, esCafe: isCafe };
        }
        productSalesMap[name].cantidad += d.cantidad;
        productSalesMap[name].total += d.cantidad * Number(d.precio_unitario);
      });
    });

  const rankedProducts = Object.entries(productSalesMap)
    .map(([nombre, data]) => ({ nombre, ...data }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const topInfusiones = rankedProducts.filter(p => p.esCafe);
  const topGeneral = rankedProducts;

  // Días y Horas Pico de Clientes
  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayCounts: { [day: string]: number } = {};
  const hourCounts: { [hourRange: string]: number } = {};

  const ranges = ['08:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00', '18:00 - 20:00', '20:00 - 22:00'];
  ranges.forEach(r => { hourCounts[r] = 0; });
  daysOfWeek.forEach(d => { dayCounts[d] = 0; });

  pedidos
    .filter(p => p.estado !== 'cancelado')
    .forEach(p => {
      const date = new Date(p.created_at);
      const dayName = daysOfWeek[date.getDay()];
      dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;

      const hour = date.getHours();
      let range = '08:00 - 10:00';
      if (hour >= 10 && hour < 12) range = '10:00 - 12:00';
      else if (hour >= 12 && hour < 14) range = '12:00 - 14:00';
      else if (hour >= 14 && hour < 16) range = '14:00 - 16:00';
      else if (hour >= 16 && hour < 18) range = '16:00 - 18:00';
      else if (hour >= 18 && hour < 20) range = '18:00 - 20:00';
      else if (hour >= 20) range = '20:00 - 22:00';

      hourCounts[range] = (hourCounts[range] || 0) + 1;
    });

  const topDayArray = Object.entries(dayCounts).sort((a, b) => b[1] - a[1]);
  const topHourArray = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]);

  const topDay = topDayArray[0]?.[1] > 0 ? topDayArray[0] : ['Sin datos', 0];
  const topHour = topHourArray[0]?.[1] > 0 ? topHourArray[0] : ['Sin datos', 0];

  // ================= HELPERS DE PRESENTACIÓN (sólo UI, no lógica de negocio) =================
  const mesaEstadoInfo = (estado: string): { label: string; tone: 'neutral' | 'warning' | 'success' | 'gold' } => {
    if (estado === 'libre') return { label: 'Libre', tone: 'neutral' };
    if (estado === 'esperando_pedido') return { label: 'En Cocina', tone: 'warning' };
    if (estado === 'atendida') return { label: 'Atendida', tone: 'success' };
    return { label: 'Ocupada', tone: 'gold' };
  };

  const NAV_ITEMS: { id: TabId; label: string; icon: React.ComponentType<{ size?: number }>; visible: boolean }[] = [
    { id: 'monitoreo', label: 'Monitoreo de Mesas', icon: Coffee, visible: true },
    { id: 'pedidos', label: 'Pedidos y Delivery', icon: ShoppingBag, visible: true },
    { id: 'facturacion', label: 'Facturación & Caja', icon: Receipt, visible: true },
    { id: 'qrs', label: 'Códigos QR', icon: QrCode, visible: true },
    { id: 'metrics', label: 'Métricas de Venta', icon: BarChart3, visible: rolActivo === 'dueno' },
    { id: 'inventario', label: 'Inventario y Productos', icon: Database, visible: true },
  ];
  const visibleNavItems = NAV_ITEMS.filter(t => t.visible);

  const hayTicketAbierto = !!(mesaTicketImprimir || ticketFacturaImprimir);
  const llamadosCount = solicitudes.filter(s => s.tipo === 'llamar_mozo').length;
  const cuentasCount = solicitudes.filter(s => s.tipo === 'pedir_cuenta').length;

  // ================= PANTALLA PRINCIPAL ADMIN =================
  return (
    <div className="min-h-screen flex flex-col bg-cream text-ink">
      <div className={`flex flex-col flex-1 min-h-screen ${hayTicketAbierto ? 'no-print' : ''}`}>
        {/* HEADER DE ADMINISTRACIÓN */}
        <header className="no-print sticky top-0 z-40 bg-ink text-cream border-b border-white/10 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 bg-gold text-ink rounded-md px-3 py-2 font-bold text-sm tracking-wide shrink-0">
              <Sparkles size={16} />
              <span className="hidden sm:inline">{BRAND_CONFIG.name.toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <h1 className="font-serif text-sm sm:text-base font-semibold uppercase tracking-wide truncate">
                Control y Monitoreo {rolActivo === 'dueno' ? '(Dueño)' : '(Caja)'}
              </h1>
              <p className="text-[11px] text-cream/55">Actualizaciones en tiempo real activas</p>
            </div>
          </div>

          {/* CONTADORES RÁPIDOS Y LOGOUT */}
          <div className="flex gap-2 items-center flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs">
              <Bell size={13} className="text-gold" /> Llamados: <b>{llamadosCount}</b>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs">
              <Receipt size={13} className="text-success" /> Cuentas: <b>{cuentasCount}</b>
            </span>
            <IconButton
              label="Actualizar datos"
              icon={RefreshCw}
              onClick={cargarDatosCompletos}
              className="!bg-white/10 !text-cream border border-white/15 hover:!bg-white/15"
              size="sm"
            />

            {/* Cambio de vista Caja / Dueño (sin login, es una demo) */}
            <div
              role="group"
              aria-label="Cambiar vista del panel"
              className="flex items-center gap-0.5 rounded-full border border-white/15 bg-white/10 p-0.5"
            >
              {([
                { rol: 'caja' as const, label: 'Caja' },
                { rol: 'dueno' as const, label: 'Dueño' },
              ]).map(({ rol, label }) => (
                <button
                  key={rol}
                  onClick={() => cambiarRol(rol)}
                  aria-pressed={rolActivo === rol}
                  className={`min-h-[32px] cursor-pointer rounded-full px-3 text-xs font-semibold transition-colors ${
                    rolActivo === rol ? 'bg-gold text-ink' : 'text-cream/70 hover:text-cream'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col md:flex-row min-h-0">
          {/* RAIL LATERAL (DESKTOP / TABLET, >= 768px) */}
          <nav className="no-print hidden md:flex md:flex-col md:w-56 shrink-0 bg-ink text-cream border-r border-white/10 py-3">
            {visibleNavItems.map(tab => {
              const Icon = tab.icon;
              const activo = tabActiva === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTabActiva(tab.id)}
                  className={[
                    'flex items-center gap-3 px-5 py-3 text-sm font-medium text-left border-l-2 min-h-[44px]',
                    activo ? 'border-gold bg-white/10 text-gold' : 'border-transparent text-cream/65 hover:bg-white/5 hover:text-cream',
                  ].join(' ')}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* CONTENIDO PRINCIPAL */}
          <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">

            {/* SECCIÓN SEEDING */}
            {seedingMsg && (
              <div className="mb-6 flex items-center gap-3 rounded-md border border-gold bg-gold-light px-5 py-4 text-sm font-medium text-ink">
                {seeding ? <Loader2 className="animate-spin shrink-0" size={18} /> : <CheckCircle className="shrink-0" size={18} />}
                <span>{seedingMsg}</span>
              </div>
            )}

            {/* 1. MONITOREO DE MESAS */}
            {tabActiva === 'monitoreo' && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h2 className="font-serif text-lg font-semibold">Mesas Activas</h2>
                  <p className="text-xs text-ink-soft">Tocá &quot;Liberar&quot; para desocupar la mesa y cerrar su sesión.</p>
                </div>

                {mesas.length === 0 ? (
                  <EmptyState
                    icon={Database}
                    title="No se encontraron mesas cargadas"
                    description={'Ve a la pestaña "Inventario y Productos" para inicializarlas.'}
                    className="bg-card rounded-lg border border-line border-dashed"
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {mesas.map((mesa) => {
                      const llamadosMesa = solicitudes.filter(s => s.mesa_id === mesa.id && s.tipo === 'llamar_mozo');
                      const cuentasMesa = solicitudes.filter(s => s.mesa_id === mesa.id && s.tipo === 'pedir_cuenta');

                      // Pedidos de esta sesión activa (creados desde ocupada_desde, excluyendo cancelados)
                      const pedidosMesa = mesa.ocupada_desde
                        ? pedidos.filter(p =>
                            p.mesa_id === mesa.id &&
                            p.estado !== 'cancelado' &&
                            new Date(p.created_at) >= new Date(mesa.ocupada_desde!)
                          )
                        : [];

                      const tieneLlamado = llamadosMesa.length > 0;
                      const tieneCuenta = cuentasMesa.length > 0;
                      const estadoInfo = mesaEstadoInfo(mesa.estado);

                      const ringClass = tieneCuenta
                        ? 'border-success ring-1 ring-success/40'
                        : tieneLlamado
                        ? 'border-gold ring-1 ring-gold/40'
                        : 'border-line';

                      return (
                        <div
                          key={mesa.id}
                          className={`flex flex-col justify-between rounded-lg border bg-card p-5 shadow-soft ${ringClass}`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-lg font-semibold">Mesa {mesa.numero}</span>
                              <Badge tone={estadoInfo.tone}>{estadoInfo.label}</Badge>
                            </div>

                            {tieneLlamado && (
                              <div className="animate-pulse-glow flex items-center justify-between gap-2 rounded-md border border-gold bg-gold-light px-3 py-2.5 mb-3">
                                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-gold-hover)]">
                                  <Bell size={12} className="animate-bounce" /> LLAMAN AL MOZO
                                </span>
                                <Button size="sm" variant="secondary" onClick={() => handleAtenderSolicitud(llamadosMesa[0].id)}>
                                  Atender
                                </Button>
                              </div>
                            )}

                            {tieneCuenta && (
                              <div className="animate-pulse-glow flex items-center justify-between gap-2 rounded-md border border-success bg-success-bg px-3 py-2.5 mb-3">
                                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-success">
                                  <Receipt size={12} /> PIDEN LA CUENTA
                                </span>
                                <Button size="sm" variant="success" onClick={() => handleAtenderSolicitud(cuentasMesa[0].id)}>
                                  Atender
                                </Button>
                              </div>
                            )}

                            {(pedidosMesa.length > 0 || mesa.cliente_nombre) && (
                              <div className="border-t border-line pt-3 mt-3">
                                <p className="text-[11px] text-ink-soft uppercase tracking-wide mb-2">
                                  Consumos Activos ({mesa.cliente_nombre || 'Mesa'}):
                                </p>
                                <div className="flex flex-col gap-1.5">
                                  {pedidosMesa.length === 0 ? (
                                    <p className="text-[11px] text-ink-soft italic">Sin consumos registrados todavía.</p>
                                  ) : (
                                    pedidosMesa.flatMap(p => p.detalles || []).map((det, index) => (
                                      <div key={index} className="flex justify-between text-xs gap-2">
                                        <span>{det.cantidad}x {det.producto?.nombre || 'Producto'}</span>
                                        {det.observaciones && <span className="text-gold italic shrink-0">({det.observaciones})</span>}
                                      </div>
                                    ))
                                  )}
                                  {pedidosMesa.length > 0 && (
                                    <div className="flex justify-between border-t border-dashed border-line pt-2 mt-2 text-sm font-semibold">
                                      <span>Total Consumido:</span>
                                      <span className="text-gold">
                                        ${pedidosMesa.reduce((sum, p) => sum + Number(p.total), 0).toLocaleString('es-AR')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Botones de control de mesa */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-5">
                            <Button
                              size="md"
                              variant="outline"
                              onClick={() => {
                                setMesaConsumoManual(mesa);
                                setItemsConsumoManual([]);
                                setManualProductoSeleccionadoId(productosList[0]?.id || '');
                                setManualCantidad(1);
                                setManualObservaciones('');
                                setManualEnviarACocina(true);
                                setMostrarModalConsumoManual(true);
                              }}
                            >
                              + Consumo
                            </Button>

                            {mesa.estado !== 'libre' && (
                              <>
                                <Button
                                  size="md"
                                  variant="success"
                                  icon={Receipt}
                                  disabled={pedidosMesa.length === 0}
                                  onClick={() => handleAbrirFacturacionMesa(mesa)}
                                >
                                  Cobrar
                                </Button>
                                <Button
                                  size="md"
                                  variant="secondary"
                                  icon={Printer}
                                  disabled={pedidosMesa.length === 0}
                                  onClick={() => setMesaTicketImprimir(mesa)}
                                >
                                  Pre-Cuenta
                                </Button>
                              </>
                            )}
                          </div>
                          {mesa.estado !== 'libre' && (
                            <Button
                              size="md"
                              variant="ghost"
                              icon={Trash2}
                              className="!text-danger mt-2 w-full sm:w-auto"
                              onClick={() => handleConfirmarLiberarMesa(mesa)}
                            >
                              Liberar Mesa
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. TABLA DE PEDIDOS Y DELIVERY */}
            {tabActiva === 'pedidos' && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h2 className="font-serif text-lg font-semibold">Cola de Pedidos Activos (Cocina &amp; Delivery)</h2>
                  <Badge tone="gold">{pedidosActivos.length} pedidos en cola</Badge>
                </div>

                <div className="flex flex-col gap-4">
                  {pedidosActivos.length === 0 ? (
                    <EmptyState
                      icon={ShoppingBag}
                      title="No hay pedidos pendientes en preparación"
                      className="bg-card rounded-lg border border-line border-dashed"
                    />
                  ) : (
                    pedidosActivos.map((pedido) => (
                      <div
                        key={pedido.id}
                        className="flex flex-col md:flex-row md:justify-between md:items-start gap-5 rounded-lg border border-line bg-card p-5 shadow-soft"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <Badge tone={pedido.tipo === 'delivery' ? 'info' : 'warning'}>
                              <span className="inline-flex items-center gap-1">
                                {pedido.tipo === 'delivery' ? <Truck size={12} /> : <Coffee size={12} />}
                                {pedido.tipo === 'delivery' ? 'DELIVERY' : `MESA ${pedido.mesa?.numero}`}
                              </span>
                            </Badge>
                            <span className="text-xs text-ink-soft">
                              Pedido #{pedido.id} • {new Date(pedido.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <h4 className="text-sm font-semibold flex items-center gap-2 mb-2.5">
                            <User size={13} className="text-gold" /> {pedido.nombre_cliente}
                          </h4>

                          <div className="flex flex-col gap-1.5 text-xs text-ink-soft mb-3.5">
                            <span className="flex items-center gap-1.5">
                              <Phone size={12} /> Celular: {pedido.telefono}
                            </span>
                            {pedido.tipo === 'delivery' && pedido.direccion && (
                              <span className="flex items-center gap-1.5">
                                <MapPin size={12} /> Dirección: {pedido.direccion}
                              </span>
                            )}
                          </div>

                          <div className="rounded-md border border-line bg-cream p-4">
                            <p className="text-[10px] font-semibold text-ink-soft uppercase tracking-wide mb-2">Productos:</p>
                            <div className="flex flex-col gap-2">
                              {pedido.detalles?.map((det, index) => (
                                <div key={index} className="flex justify-between text-xs gap-2">
                                  <span>
                                    <b>{det.cantidad}x</b> {det.producto?.nombre || 'Producto'}
                                    {det.observaciones && (
                                      <span className="block text-[11px] text-gold italic mt-0.5">
                                        Nota: {det.observaciones}
                                      </span>
                                    )}
                                  </span>
                                  <span className="shrink-0">${(Number(det.precio_unitario) * det.cantidad).toLocaleString('es-AR')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col md:items-end justify-between gap-4 md:min-w-[170px]">
                          <div className="md:text-right">
                            <span className="block text-[11px] text-ink-soft uppercase tracking-wide">Total del Pedido</span>
                            <span className="text-xl font-bold text-gold">${Number(pedido.total).toLocaleString('es-AR')}</span>
                          </div>

                          <div className="flex flex-wrap gap-2 w-full md:justify-end">
                            {pedido.estado === 'pendiente' && (
                              <Button size="md" variant="secondary" onClick={() => handleEstadoPedido(pedido.id, 'preparando')}>
                                Preparar
                              </Button>
                            )}
                            {pedido.estado === 'preparando' && (
                              <Button size="md" variant="success" onClick={() => handleEstadoPedido(pedido.id, 'listo')}>
                                Listo
                              </Button>
                            )}
                            {pedido.estado === 'listo' && (
                              <Button size="md" variant="success" onClick={() => handleEstadoPedido(pedido.id, 'entregado')}>
                                Entregar
                              </Button>
                            )}
                            <Button size="md" variant="outline" className="!text-danger" onClick={() => handleConfirmarCancelarPedido(pedido.id)}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* HISTORIAL DE PEDIDOS */}
                {pedidosCompletados.length > 0 && (
                  <div className="mt-6 border-t border-line pt-5">
                    <h3 className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-3">Historial Reciente (Entregados y Cancelados)</h3>
                    <div className="flex flex-col gap-2">
                      {pedidosCompletados.slice(0, 10).map((pedido) => (
                        <div
                          key={pedido.id}
                          className="flex justify-between items-center gap-2 rounded-md border border-line bg-card px-4 py-3 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Badge tone={pedido.estado === 'entregado' ? 'success' : 'danger'}>{pedido.estado}</Badge>
                            <span className="truncate">#{pedido.id} • {pedido.nombre_cliente} ({pedido.tipo})</span>
                          </div>
                          <div className="text-gold font-semibold shrink-0">
                            ${Number(pedido.total).toLocaleString('es-AR')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2.5 FACTURACIÓN Y CAJA DIARIA */}
            {tabActiva === 'facturacion' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="font-serif text-lg font-semibold">Facturación &amp; Cierre de Caja</h2>
                  <p className="text-xs text-ink-soft mt-1">Gestión de comprobantes emitidos, arqueo por medio de pago y emisión de Facturas A / B / Pre-cuenta.</p>
                </div>

                {/* METRICAS DE COBRO / ARQUEO DE CAJA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="rounded-lg border border-line bg-card p-5">
                    <span className="block text-[11px] text-ink-soft uppercase mb-2">💵 Efectivo en Caja</span>
                    <span className="block text-2xl font-bold text-success">
                      ${pedidos.filter(p => p.facturado_at && p.metodo_pago === 'efectivo').reduce((sum, p) => sum + Number(p.total_facturado || p.total), 0).toLocaleString('es-AR')}
                    </span>
                    <p className="text-[11px] text-ink-soft mt-1">
                      {pedidos.filter(p => p.facturado_at && p.metodo_pago === 'efectivo').length} tickets abonados en efectivo
                    </p>
                  </div>

                  <div className="rounded-lg border border-line bg-card p-5">
                    <span className="block text-[11px] text-ink-soft uppercase mb-2">📱 Mercado Pago / QR</span>
                    <span className="block text-2xl font-bold text-info">
                      ${pedidos.filter(p => p.facturado_at && p.metodo_pago === 'mercadopago').reduce((sum, p) => sum + Number(p.total_facturado || p.total), 0).toLocaleString('es-AR')}
                    </span>
                    <p className="text-[11px] text-ink-soft mt-1">
                      {pedidos.filter(p => p.facturado_at && p.metodo_pago === 'mercadopago').length} transferencias QR recibidas
                    </p>
                  </div>

                  <div className="rounded-lg border border-line bg-card p-5">
                    <span className="block text-[11px] text-ink-soft uppercase mb-2">💳 Tarjetas Débito / Crédito</span>
                    <span className="block text-2xl font-bold text-[#a855f7]">
                      ${pedidos.filter(p => p.facturado_at && p.metodo_pago === 'tarjeta').reduce((sum, p) => sum + Number(p.total_facturado || p.total), 0).toLocaleString('es-AR')}
                    </span>
                    <p className="text-[11px] text-ink-soft mt-1">
                      {pedidos.filter(p => p.facturado_at && p.metodo_pago === 'tarjeta').length} cupones procesados
                    </p>
                  </div>

                  <div className="rounded-lg border border-gold bg-gold-light p-5">
                    <span className="block text-[11px] text-[var(--color-gold-hover)] uppercase mb-2">💰 Total General Facturado</span>
                    <span className="block text-2xl font-bold text-[var(--color-gold-hover)]">
                      ${pedidos.filter(p => p.facturado_at || p.estado === 'entregado').reduce((sum, p) => sum + Number(p.total_facturado || p.total), 0).toLocaleString('es-AR')}
                    </span>
                    <p className="text-[11px] text-ink mt-1">
                      {pedidos.filter(p => p.facturado_at || p.estado === 'entregado').length} operaciones cerradas
                    </p>
                  </div>
                </div>

                {/* HISTORIAL DE COMPROBANTES */}
                <div className="rounded-lg border border-line bg-card p-5 sm:p-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wide mb-4">Historial de Comprobantes Emitidos</h3>

                  {(() => {
                    const comprobantes = pedidos.filter(p => p.facturado_at || p.nro_comprobante || p.estado === 'entregado');
                    if (comprobantes.length === 0) {
                      return (
                        <EmptyState
                          icon={ImageOff}
                          title="Todavía no hay comprobantes emitidos"
                          description={'Presioná "Cobrar" en cualquier mesa o pedido activo.'}
                        />
                      );
                    }
                    return (
                      <>
                        {/* Tabla (>= md) */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-left text-sm border-collapse">
                            <thead>
                              <tr className="border-b border-line text-ink-soft uppercase text-[11px]">
                                <th className="py-3 px-2">N° Comprobante</th>
                                <th className="py-3 px-2">Tipo</th>
                                <th className="py-3 px-2">Cliente / Mesa</th>
                                <th className="py-3 px-2">Medio de Pago</th>
                                <th className="py-3 px-2">Monto Neto</th>
                                <th className="py-3 px-2">IVA (21%)</th>
                                <th className="py-3 px-2">Total</th>
                                <th className="py-3 px-2">CAE (AFIP)</th>
                                <th className="py-3 px-2 text-right">Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {comprobantes.map(p => (
                                <tr key={p.id} className="border-b border-line">
                                  <td className="py-3 px-2 font-semibold text-gold">
                                    {p.nro_comprobante || `TC-0001-${String(p.id).padStart(8, '0')}`}
                                  </td>
                                  <td className="py-3 px-2">
                                    <Badge tone={p.tipo_comprobante === 'factura_a' ? 'info' : p.tipo_comprobante === 'factura_b' ? 'success' : 'neutral'}>
                                      {p.tipo_comprobante === 'factura_a' ? 'Factura A' : p.tipo_comprobante === 'factura_b' ? 'Factura B' : 'Pre-Cuenta'}
                                    </Badge>
                                  </td>
                                  <td className="py-3 px-2">
                                    {p.cliente_razon_social || p.nombre_cliente} {p.mesa_id ? `(Mesa ${p.mesa_id})` : '(Delivery)'}
                                  </td>
                                  <td className="py-3 px-2 capitalize">{p.metodo_pago || 'efectivo'}</td>
                                  <td className="py-3 px-2 text-ink-soft">
                                    ${Number(p.monto_neto || (Number(p.total) / 1.21)).toLocaleString('es-AR')}
                                  </td>
                                  <td className="py-3 px-2 text-ink-soft">
                                    ${Number(p.monto_iva || (Number(p.total) - Number(p.total) / 1.21)).toLocaleString('es-AR')}
                                  </td>
                                  <td className="py-3 px-2 font-bold">
                                    ${Number(p.total_facturado || p.total).toLocaleString('es-AR')}
                                  </td>
                                  <td className="py-3 px-2 text-xs text-ink-soft">{p.cae || '7438192019281'}</td>
                                  <td className="py-3 px-2 text-right">
                                    <Button size="sm" variant="outline" icon={Printer} onClick={() => setTicketFacturaImprimir(p)}>
                                      Reimprimir
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Tarjetas (< md) */}
                        <div className="md:hidden flex flex-col gap-3">
                          {comprobantes.map(p => (
                            <div key={p.id} className="rounded-md border border-line bg-cream p-4">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="font-semibold text-gold text-sm">
                                  {p.nro_comprobante || `TC-0001-${String(p.id).padStart(8, '0')}`}
                                </span>
                                <Badge tone={p.tipo_comprobante === 'factura_a' ? 'info' : p.tipo_comprobante === 'factura_b' ? 'success' : 'neutral'}>
                                  {p.tipo_comprobante === 'factura_a' ? 'Factura A' : p.tipo_comprobante === 'factura_b' ? 'Factura B' : 'Pre-Cuenta'}
                                </Badge>
                              </div>
                              <p className="text-sm mb-2">
                                {p.cliente_razon_social || p.nombre_cliente} {p.mesa_id ? `(Mesa ${p.mesa_id})` : '(Delivery)'}
                              </p>
                              <dl className="grid grid-cols-2 gap-y-1.5 text-xs mb-3">
                                <dt className="text-ink-soft">Medio de pago</dt>
                                <dd className="text-right capitalize">{p.metodo_pago || 'efectivo'}</dd>
                                <dt className="text-ink-soft">Monto neto</dt>
                                <dd className="text-right">${Number(p.monto_neto || (Number(p.total) / 1.21)).toLocaleString('es-AR')}</dd>
                                <dt className="text-ink-soft">IVA (21%)</dt>
                                <dd className="text-right">${Number(p.monto_iva || (Number(p.total) - Number(p.total) / 1.21)).toLocaleString('es-AR')}</dd>
                                <dt className="text-ink-soft font-semibold">Total</dt>
                                <dd className="text-right font-bold">${Number(p.total_facturado || p.total).toLocaleString('es-AR')}</dd>
                                <dt className="text-ink-soft">CAE (AFIP)</dt>
                                <dd className="text-right">{p.cae || '7438192019281'}</dd>
                              </dl>
                              <Button size="md" variant="outline" fullWidth icon={Printer} onClick={() => setTicketFacturaImprimir(p)}>
                                Reimprimir
                              </Button>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* 3. GENERADOR DE CÓDIGOS QR */}
            {tabActiva === 'qrs' && (
              <div className="flex flex-col gap-6">
                <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-lg font-semibold">Tarjetas de Códigos QR para las Mesas</h2>
                    <p className="text-xs text-ink-soft mt-1">
                      Hojas listas para imprimir. Una tarjeta por cada mesa cargada ({mesas.length} en total). Cada una contiene el código QR enlazado a la dirección <code>/mesa/[id]</code>.
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={handleAgregarMesa}>+ Agregar Mesa</Button>
                    <Button variant="secondary" icon={Printer} onClick={handlePrint}>Imprimir Tarjetas QR</Button>
                  </div>
                </div>

                {mesas.length === 0 && (
                  <EmptyState
                    icon={Database}
                    title="Todavía no hay mesas cargadas"
                    description={'Usá "+ Agregar Mesa" arriba, o inicializá 10 mesas desde la pestaña Inventario.'}
                    className="no-print bg-card rounded-lg border border-line border-dashed"
                  />
                )}

                <div className="print-area grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {mesas.map((mesa) => {
                    const numero = mesa.numero;
                    const targetUrl = `${hostUrl}/mesa/${numero}`;
                    const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(targetUrl)}&color=121212`;

                    return (
                      <div
                        key={numero}
                        className="qr-card-printable flex flex-col items-center justify-center text-center rounded-lg border-2 border-line bg-white p-7 text-ink shadow-soft"
                      >
                        <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold">{BRAND_CONFIG.name.toUpperCase()}</span>
                        <p className="text-[8px] uppercase tracking-wide text-ink-soft -mt-0.5 mb-4">{BRAND_CONFIG.subtitle}</p>

                        <div className="w-14 h-14 rounded-md bg-ink text-cream border-2 border-gold flex items-center justify-center text-xl font-bold mb-5">
                          {numero}
                        </div>

                        <div className="w-[180px] h-[180px] rounded-md border border-line bg-white p-2 flex items-center justify-center mb-5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={qrImgSrc} alt={`QR Mesa ${numero}`} className="w-full h-full object-contain" />
                        </div>

                        <h4 className="text-xs font-semibold uppercase tracking-wide mb-1">Escaneá el QR</h4>
                        <p className="text-[9px] text-ink-soft leading-snug max-w-[200px]">
                          Mirá la carta, realizá tu pedido, agregá agua o llamá al mozo desde tu celular.
                        </p>

                        <Button
                          size="sm"
                          variant="outline"
                          className="no-print !text-danger mt-4"
                          onClick={() => handleEliminarMesa(mesa)}
                        >
                          Eliminar Mesa
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. METRICAS DE VENTA (SÓLO DUEÑO) */}
            {tabActiva === 'metrics' && rolActivo === 'dueno' && (
              <div className="flex flex-col gap-7">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h2 className="font-serif text-lg font-semibold">Métricas y Analíticas del Local</h2>
                  <Badge tone="neutral">Vista Administrador</Badge>
                </div>

                {/* METRICAS DE FACTURACIÓN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { titulo: 'Facturación del Día', valor: ventasHoy, desc: 'Pedidos de hoy acumulados sin cancelar', icon: DollarSign },
                    { titulo: 'Facturación Semanal', valor: ventasSemana, desc: 'Desde el lunes de la semana en curso', icon: Calendar },
                    { titulo: 'Facturación Mensual', valor: ventasMes, desc: 'Desde el primer día del mes actual', icon: TrendingUp }
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div key={idx} className="flex flex-col justify-between rounded-lg border border-line bg-card p-6 shadow-soft">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-semibold text-ink-soft uppercase tracking-wide">{item.titulo}</span>
                            <Icon size={16} className="text-gold" />
                          </div>
                          <h3 className="font-sans text-2xl font-bold text-gold mb-2">${item.valor.toLocaleString('es-AR')}</h3>
                        </div>
                        <p className="text-[11px] text-ink-soft leading-snug">{item.desc}</p>
                      </div>
                    );
                  })}
                </div>

                {/* ROTACIÓN Y PENDIENTES */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* RANKING GENERAL */}
                  <div className="rounded-lg border border-line bg-card p-6 sm:p-7">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gold mb-5">
                      Rotación de Pastelería y Mercadería General
                    </h3>
                    {topGeneral.length === 0 ? (
                      <p className="text-xs text-ink-soft italic">No hay ventas registradas.</p>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {topGeneral.slice(0, 5).map((item, idx) => {
                          const maxQty = topGeneral[0].cantidad;
                          const percentage = maxQty > 0 ? (item.cantidad / maxQty) * 100 : 0;
                          return (
                            <div key={idx} className="flex flex-col gap-1.5">
                              <div className="flex justify-between text-sm gap-2">
                                <span className="truncate">{idx + 1}. <b>{item.nombre}</b></span>
                                <span className="text-ink-soft shrink-0">{item.cantidad} u. • <b className="text-gold">${item.total.toLocaleString('es-AR')}</b></span>
                              </div>
                              <div className="h-2 rounded-full bg-cream border border-line overflow-hidden">
                                <div className="h-full rounded-full bg-gold" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* RANKING DE INFUSIONES / CAFÉ */}
                  <div className="rounded-lg border border-line bg-card p-6 sm:p-7">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gold mb-5">
                      Consumo de Infusiones y Cafetería
                    </h3>
                    {topInfusiones.length === 0 ? (
                      <p className="text-xs text-ink-soft italic">No hay ventas de cafetería registradas.</p>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {topInfusiones.slice(0, 5).map((item, idx) => {
                          const maxQty = topInfusiones[0].cantidad;
                          const percentage = maxQty > 0 ? (item.cantidad / maxQty) * 100 : 0;
                          return (
                            <div key={idx} className="flex flex-col gap-1.5">
                              <div className="flex justify-between text-sm gap-2">
                                <span className="truncate">{idx + 1}. <b>{item.nombre}</b></span>
                                <span className="text-ink-soft shrink-0">{item.cantidad} u. • <b className="text-gold">${item.total.toLocaleString('es-AR')}</b></span>
                              </div>
                              <div className="h-2 rounded-full bg-cream border border-line overflow-hidden">
                                <div className="h-full rounded-full bg-success" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* MOMENTOS PICO */}
                <div className="rounded-lg border border-line bg-card p-6 sm:p-7">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gold mb-5">
                    Momentos Pico de Clientes (Días y Horarios)
                  </h3>
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 md:border-r md:border-line md:pr-6">
                      <span className="block text-[11px] text-ink-soft uppercase tracking-wide mb-1.5">Día con más Afluencia</span>
                      <span className="block text-2xl font-semibold mb-1">{topDay[0]}</span>
                      <span className="text-xs text-ink-soft">Total de {topDay[1]} pedidos registrados este día de la semana.</span>
                    </div>
                    <div className="flex-1">
                      <span className="block text-[11px] text-ink-soft uppercase tracking-wide mb-1.5">Horario de mayor actividad</span>
                      <span className="block text-2xl font-semibold mb-1">{topHour[0]}</span>
                      <span className="text-xs text-ink-soft">Total de {topHour[1]} pedidos registrados en este rango de horas.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. INVENTARIO Y GESTIÓN DE PRODUCTOS */}
            {tabActiva === 'inventario' && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-lg font-semibold">Inventario de Productos</h2>
                    <p className="text-xs text-ink-soft">Controlá el stock disponible y agregá nuevas delicias al menú.</p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setProductoEditando(null);
                      setFormNombre('');
                      setFormDescripcion('');
                      setFormPrecio('');
                      setFormImagenUrl('');
                      setFormCategoriaId(categoriasList[0]?.id || '');
                      setFormStock('');
                      setFormStockMinimo('2');
                      setFormEsCafe(false);
                      setFormDisponible(true);
                      setErrorSubidaImagen('');
                      setMostrarFormProducto(true);
                    }}
                  >
                    + Agregar Producto
                  </Button>
                </div>

                {/* GESTIÓN DE CATEGORÍAS */}
                <div className="rounded-lg border border-line bg-card p-5 sm:p-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gold mb-3.5">Categorías del Menú</h3>

                  {categoriasList.length === 0 ? (
                    <p className="text-xs text-ink-soft italic mb-3.5">Todavía no hay categorías cargadas.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {categoriasList.map((cat) => (
                        <div
                          key={cat.id}
                          className="flex items-center gap-2 rounded-md border border-line bg-cream py-1.5 pl-3 pr-1.5 text-xs"
                        >
                          {categoriaEditandoId === cat.id ? (
                            <>
                              <input
                                type="text"
                                autoFocus
                                value={categoriaEditandoNombre}
                                onChange={(e) => setCategoriaEditandoNombre(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleGuardarCategoriaEditada(cat.id);
                                  if (e.key === 'Escape') setCategoriaEditandoId(null);
                                }}
                                className="rounded border border-line bg-card text-ink px-2 py-1 text-xs w-36"
                              />
                              <Button size="sm" variant="secondary" onClick={() => handleGuardarCategoriaEditada(cat.id)}>Guardar</Button>
                              <Button size="sm" variant="ghost" onClick={() => setCategoriaEditandoId(null)}>Cancelar</Button>
                            </>
                          ) : (
                            <>
                              <span>{cat.nombre}</span>
                              <IconButton
                                label={`Renombrar categoría ${cat.nombre}`}
                                icon={Pencil}
                                variant="ghost"
                                size="sm"
                                className="!w-7 !h-7"
                                onClick={() => {
                                  setCategoriaEditandoId(cat.id);
                                  setCategoriaEditandoNombre(cat.nombre);
                                }}
                              />
                              <IconButton
                                label={`Eliminar categoría ${cat.nombre}`}
                                icon={Trash2}
                                variant="ghost"
                                size="sm"
                                className="!w-7 !h-7 !text-danger"
                                onClick={() => handleEliminarCategoria(cat)}
                              />
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleCrearCategoria} className="flex gap-2 flex-wrap">
                    <input
                      type="text"
                      value={nuevaCategoriaNombre}
                      onChange={(e) => setNuevaCategoriaNombre(e.target.value)}
                      placeholder="Ej: Bebidas Sin Alcohol"
                      className="flex-1 min-w-[200px] min-h-[44px] rounded-md border border-line bg-cream px-3 text-sm"
                    />
                    <Button
                      type="submit"
                      variant="secondary"
                      loading={guardandoCategoria}
                      disabled={!nuevaCategoriaNombre.trim()}
                    >
                      + Nueva Categoría
                    </Button>
                  </form>
                </div>

                {/* LISTADO DE PRODUCTOS */}
                <div className="rounded-lg border border-line bg-card overflow-hidden">
                  {productosList.length === 0 ? (
                    <EmptyState
                      icon={Database}
                      title="No hay productos registrados"
                      description="Usá el botón de arriba o inicializá la base de datos más abajo."
                    />
                  ) : (
                    <>
                      {/* Tabla (>= md) */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="border-b border-line text-ink-soft">
                              <th className="py-4 px-5">Imagen</th>
                              <th className="py-4 px-5">Nombre</th>
                              <th className="py-4 px-5">Categoría</th>
                              <th className="py-4 px-5">Precio</th>
                              <th className="py-4 px-5">Stock</th>
                              <th className="py-4 px-5">Mínimo</th>
                              <th className="py-4 px-5 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productosList.map((prod) => {
                              const esBajoStock = prod.stock !== null && prod.stock <= (prod.stock_minimo ?? 0);
                              const esAgotado = prod.stock !== null && prod.stock <= 0;
                              return (
                                <tr key={prod.id} className="border-b border-line last:border-b-0">
                                  <td className="py-3 px-5">
                                    <div className="w-10 h-10 rounded bg-cream border border-line overflow-hidden">
                                      {prod.imagen_url && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={prod.imagen_url} alt={prod.nombre} className="w-full h-full object-cover" />
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-5 max-w-[280px]">
                                    <span className="block font-semibold">{prod.nombre}</span>
                                    <span className="block text-[11px] text-ink-soft truncate">{prod.descripcion}</span>
                                  </td>
                                  <td className="py-3 px-5 text-ink-soft">{prod.categoria?.nombre || '-'}</td>
                                  <td className="py-3 px-5 font-semibold text-gold">${Number(prod.precio).toLocaleString('es-AR')}</td>
                                  <td className="py-3 px-5">
                                    {prod.stock === null ? (
                                      <span className="text-ink-soft">Ilimitado</span>
                                    ) : esAgotado ? (
                                      <Badge tone="danger">AGOTADO (0)</Badge>
                                    ) : esBajoStock ? (
                                      <Badge tone="warning">BAJO STOCK ({prod.stock})</Badge>
                                    ) : (
                                      <span className="text-success font-semibold">{prod.stock} u.</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-5 text-ink-soft">{prod.stock === null ? '-' : `${prod.stock_minimo} u.`}</td>
                                  <td className="py-3 px-5 text-right">
                                    <div className="flex gap-2 justify-end">
                                      <Button size="sm" variant="outline" onClick={() => abrirEdicionProducto(prod)}>Editar</Button>
                                      <Button size="sm" variant="outline" className="!text-danger" onClick={() => handleEliminarProducto(prod)}>Eliminar</Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Tarjetas (< md) */}
                      <div className="md:hidden flex flex-col divide-y divide-line">
                        {productosList.map((prod) => {
                          const esBajoStock = prod.stock !== null && prod.stock <= (prod.stock_minimo ?? 0);
                          const esAgotado = prod.stock !== null && prod.stock <= 0;
                          return (
                            <div key={prod.id} className="p-4">
                              <div className="flex gap-3 mb-3">
                                <div className="w-12 h-12 rounded bg-cream border border-line overflow-hidden shrink-0">
                                  {prod.imagen_url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={prod.imagen_url} alt={prod.nombre} className="w-full h-full object-cover" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold truncate">{prod.nombre}</p>
                                  <p className="text-[11px] text-ink-soft line-clamp-2">{prod.descripcion}</p>
                                </div>
                              </div>
                              <dl className="grid grid-cols-2 gap-y-1.5 text-xs mb-3">
                                <dt className="text-ink-soft">Categoría</dt>
                                <dd className="text-right">{prod.categoria?.nombre || '-'}</dd>
                                <dt className="text-ink-soft">Precio</dt>
                                <dd className="text-right font-semibold text-gold">${Number(prod.precio).toLocaleString('es-AR')}</dd>
                                <dt className="text-ink-soft">Stock</dt>
                                <dd className="text-right">
                                  {prod.stock === null ? 'Ilimitado' : esAgotado ? <Badge tone="danger">AGOTADO</Badge> : esBajoStock ? <Badge tone="warning">BAJO ({prod.stock})</Badge> : `${prod.stock} u.`}
                                </dd>
                                <dt className="text-ink-soft">Mínimo</dt>
                                <dd className="text-right">{prod.stock === null ? '-' : `${prod.stock_minimo} u.`}</dd>
                              </dl>
                              <div className="flex gap-2">
                                <Button size="md" variant="outline" fullWidth onClick={() => abrirEdicionProducto(prod)}>Editar</Button>
                                <Button size="md" variant="outline" fullWidth className="!text-danger" onClick={() => handleEliminarProducto(prod)}>Eliminar</Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* SEEDER DE EMERGENCIA */}
                <div className="mt-2 border-t border-line pt-5">
                  <div className="rounded-lg border border-line bg-card p-6">
                    <h4 className="text-xs font-semibold text-ink-soft uppercase mb-2">Inicialización del Sistema</h4>
                    <p className="text-xs text-ink-soft leading-snug mb-4">
                      Si recién instalás la base de datos, podés recargar los productos iniciales de {BRAND_CONFIG.name} ({BRAND_CONFIG.subtitle}, Viennoiserie, Cafés, Salados).
                    </p>
                    <Button variant="outline" loading={seeding} onClick={handleSeed}>
                      {seeding ? 'Cargando Mocks...' : 'Sembrar Catálogo Inicial'}
                    </Button>
                    {seedingMsg && <p className="text-xs text-gold mt-2">{seedingMsg}</p>}
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>

        {/* BARRA DE TABS (MOBILE, < 768px) */}
        <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-40 flex overflow-x-auto no-scrollbar bg-ink text-cream border-t border-white/10">
          {visibleNavItems.map(tab => {
            const Icon = tab.icon;
            const activo = tabActiva === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id)}
                className={[
                  'flex flex-col items-center justify-center gap-1 flex-1 min-w-[78px] min-h-[56px] px-2 py-2 text-[10px] font-medium whitespace-nowrap',
                  activo ? 'text-gold' : 'text-cream/60',
                ].join(' ')}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* MODAL PARA IMPRIMIR TICKET (PRE-CUENTA DE MESA) */}
      <Modal
        open={!!mesaTicketImprimir}
        onClose={() => setMesaTicketImprimir(null)}
        title={mesaTicketImprimir ? `Pre-Cuenta — Mesa ${mesaTicketImprimir.numero}` : ''}
        size="sm"
        footer={
          <div className="flex gap-2 no-print">
            <Button variant="outline" fullWidth onClick={() => setMesaTicketImprimir(null)}>Cerrar</Button>
            <Button variant="secondary" fullWidth icon={Printer} onClick={() => window.print()}>Imprimir</Button>
          </div>
        }
      >
        {mesaTicketImprimir && (
          <div className="ticket-printable-container rounded-md border border-dashed border-line bg-white p-4 font-mono text-[13px] leading-relaxed text-black">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold">{BRAND_CONFIG.ticketHeader}</h3>
              <p className="text-[10px] uppercase tracking-wide text-gray-600">{BRAND_CONFIG.subtitle}</p>
              <p className="text-[10px] text-gray-600">{BRAND_CONFIG.address}</p>
              <p className="mt-2 border-y border-dashed border-black py-1 font-bold">DETALLE DE CONSUMOS</p>
            </div>

            <div className="mb-3">
              <div><b>MESA:</b> {mesaTicketImprimir.numero}</div>
              <div><b>CLIENTE:</b> {mesaTicketImprimir.cliente_nombre || 'N/A'}</div>
              {mesaTicketImprimir.cliente_telefono && <div><b>TELÉFONO:</b> {mesaTicketImprimir.cliente_telefono}</div>}
              <div><b>FECHA:</b> {mesaTicketImprimir.ocupada_desde ? new Date(mesaTicketImprimir.ocupada_desde).toLocaleDateString('es-AR') : ''}</div>
              <div><b>HORA ENTRADA:</b> {mesaTicketImprimir.ocupada_desde ? new Date(mesaTicketImprimir.ocupada_desde).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
            </div>

            <div className="border-t border-dashed border-black pt-2 mb-2">
              <div className="flex justify-between font-bold mb-1">
                <span>DESCRIPCIÓN</span>
                <span>TOTAL</span>
              </div>
              {consumosConsolidados.map((item, idx) => (
                <div key={idx} className="mb-1">
                  <div className="flex justify-between">
                    <span>{item.cantidad}x {item.nombre}</span>
                    <span>${(item.precioUnitario * item.cantidad).toLocaleString('es-AR')}</span>
                  </div>
                  {item.observaciones && (
                    <div className="text-[11px] text-gray-600 italic pl-2.5">* {item.observaciones}</div>
                  )}
                  <div className="text-[11px] text-gray-500 pl-2.5">(${item.precioUnitario.toLocaleString('es-AR')} c/u)</div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-black pt-2 mt-3 flex justify-between text-sm font-bold">
              <span>TOTAL:</span>
              <span>${totalTicket.toLocaleString('es-AR')}</span>
            </div>

            <div className="text-center mt-5 text-[11px] text-gray-600">
              <p>{BRAND_CONFIG.ticketFooter}</p>
              <p className="mt-1">Documento no válido como factura</p>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL PARA CREAR/EDITAR PRODUCTO */}
      <Modal
        open={mostrarFormProducto}
        onClose={() => { setMostrarFormProducto(false); setProductoEditando(null); }}
        variant="drawer"
        title={productoEditando ? `Editar Producto: ${productoEditando.nombre}` : 'Agregar Nuevo Producto'}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => { setMostrarFormProducto(false); setProductoEditando(null); }}>
              Cancelar
            </Button>
            <Button type="submit" form="producto-form" variant="secondary" fullWidth>
              {productoEditando ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </div>
        }
      >
        <form id="producto-form" onSubmit={handleProductoSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-ink-soft uppercase">Nombre *</label>
            <input
              type="text"
              required
              value={formNombre}
              onChange={(e) => setFormNombre(e.target.value)}
              className="min-h-[44px] rounded-md border border-line px-3 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-ink-soft uppercase">Descripción</label>
            <textarea
              value={formDescripcion}
              onChange={(e) => setFormDescripcion(e.target.value)}
              className="rounded-md border border-line px-3 py-2 text-sm min-h-[70px] font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-ink-soft uppercase">Precio ($) *</label>
              <input
                type="number"
                required
                value={formPrecio}
                onChange={(e) => setFormPrecio(e.target.value)}
                className="min-h-[44px] rounded-md border border-line px-3 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-ink-soft uppercase">Categoría *</label>
              <select
                value={formCategoriaId}
                onChange={(e) => setFormCategoriaId(e.target.value)}
                className="min-h-[44px] rounded-md border border-line px-3 text-sm bg-card"
              >
                <option value="">Seleccionar...</option>
                {categoriasList.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] text-ink-soft uppercase">Foto del Producto</label>
            <div className="flex items-center gap-3 flex-wrap">
              {formImagenUrl && (
                <div className="w-14 h-14 rounded-md border border-line bg-cream overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={formImagenUrl} alt="Vista previa" className="w-full h-full object-cover" />
                </div>
              )}
              <label className={`min-h-[44px] inline-flex items-center rounded-md border border-line px-4 text-xs font-semibold ${subiendoImagen ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                {subiendoImagen ? 'Subiendo...' : 'Elegir foto desde el celular / PC'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSeleccionarImagen}
                  disabled={subiendoImagen}
                  className="hidden"
                />
              </label>
            </div>
            {errorSubidaImagen && <p className="text-[11px] text-danger">{errorSubidaImagen}</p>}
            <input
              type="text"
              value={formImagenUrl}
              onChange={(e) => setFormImagenUrl(e.target.value)}
              placeholder="O pegá una URL de imagen (opcional)"
              className="min-h-[44px] rounded-md border border-line px-3 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-ink-soft uppercase">Stock (Vacío = Ilimitado)</label>
              <input
                type="number"
                value={formStock}
                onChange={(e) => setFormStock(e.target.value)}
                placeholder="Ej: 20"
                className="min-h-[44px] rounded-md border border-line px-3 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-ink-soft uppercase">Stock Mínimo (Alerta)</label>
              <input
                type="number"
                value={formStockMinimo}
                onChange={(e) => setFormStockMinimo(e.target.value)}
                className="min-h-[44px] rounded-md border border-line px-3 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-5 mt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer min-h-[24px]">
              <input type="checkbox" checked={formEsCafe} onChange={(e) => setFormEsCafe(e.target.checked)} className="w-4 h-4 cursor-pointer" />
              <span>¿Es Café / Infusión?</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer min-h-[24px]">
              <input type="checkbox" checked={formDisponible} onChange={(e) => setFormDisponible(e.target.checked)} className="w-4 h-4 cursor-pointer" />
              <span>Disponible para Venta</span>
            </label>
          </div>
        </form>
      </Modal>

      {/* MODAL PARA AGREGAR CONSUMO MANUAL (DESDE CAJA) */}
      <Modal
        open={mostrarModalConsumoManual && !!mesaConsumoManual}
        onClose={() => { setMostrarModalConsumoManual(false); setMesaConsumoManual(null); setItemsConsumoManual([]); }}
        variant="drawer"
        title={mesaConsumoManual ? `Mesa ${mesaConsumoManual.numero} — Agregar Consumo Manual` : ''}
        subtitle="Registrá consumos directamente para clientes en la mesa."
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => { setMostrarModalConsumoManual(false); setMesaConsumoManual(null); setItemsConsumoManual([]); }}
            >
              Cerrar
            </Button>
            <Button
              variant="secondary"
              fullWidth
              disabled={itemsConsumoManual.length === 0}
              onClick={handleConfirmarConsumoManual}
            >
              Confirmar Consumo
            </Button>
          </div>
        }
      >
        {mesaConsumoManual && (
          <div className="flex flex-col gap-5">
            <div className="rounded-md border border-line bg-cream p-4">
              <h4 className="text-xs font-semibold text-ink-soft uppercase mb-3">Seleccionar Producto</h4>
              <div className="flex flex-col gap-3">
                <div className="flex gap-3 flex-wrap">
                  <div className="flex-[2] min-w-[180px] flex flex-col gap-1">
                    <label className="text-[10px] text-ink-soft">Producto</label>
                    <select
                      value={manualProductoSeleccionadoId}
                      onChange={(e) => setManualProductoSeleccionadoId(e.target.value)}
                      className="min-h-[44px] rounded-md border border-line bg-card px-2 text-sm"
                    >
                      <option value="">Selecciona un producto...</option>
                      {productosList.map((p) => {
                        const esAgotado = p.stock !== null && p.stock <= 0;
                        return (
                          <option key={p.id} value={p.id} disabled={esAgotado}>
                            {p.nombre} - ${Number(p.precio).toLocaleString('es-AR')} {esAgotado ? '(Sin Stock)' : p.stock !== null ? `(${p.stock} u.)` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[80px] flex flex-col gap-1">
                    <label className="text-[10px] text-ink-soft">Cantidad</label>
                    <input
                      type="number"
                      min={1}
                      value={manualCantidad}
                      onChange={(e) => setManualCantidad(Math.max(1, Number(e.target.value)))}
                      className="min-h-[44px] rounded-md border border-line bg-card px-2 text-sm text-center"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-ink-soft">Notas / Observaciones (Opcional)</label>
                  <input
                    type="text"
                    value={manualObservaciones}
                    onChange={(e) => setManualObservaciones(e.target.value)}
                    placeholder="Ej: Con edulcorante, bien caliente"
                    className="min-h-[44px] rounded-md border border-line bg-card px-2 text-sm"
                  />
                </div>

                <Button type="button" variant="outline" size="md" onClick={handleAgregarItemConsumoManual}>
                  Agregar a la Lista
                </Button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-ink-soft uppercase mb-2.5">Resumen de Consumo a Cargar</h4>
              {itemsConsumoManual.length === 0 ? (
                <p className="text-xs text-ink-soft italic text-center py-4">Aún no agregaste productos a la lista.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {itemsConsumoManual.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center gap-2 text-sm border-b border-line pb-1.5">
                      <div className="min-w-0">
                        <b>{item.cantidad}x {item.producto.nombre}</b>
                        {item.observaciones && <span className="block text-[11px] text-gold italic">({item.observaciones})</span>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span>${(item.producto.precio * item.cantidad).toLocaleString('es-AR')}</span>
                        <button
                          type="button"
                          onClick={() => setItemsConsumoManual(prev => prev.filter((_, i) => i !== idx))}
                          className="text-danger text-xs min-h-[32px] px-1"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold pt-2">
                    <span>Total Consumo:</span>
                    <span className="text-gold">
                      ${itemsConsumoManual.reduce((sum, item) => sum + (item.producto.precio * item.cantidad), 0).toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-line pt-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={manualEnviarACocina} onChange={(e) => setManualEnviarACocina(e.target.checked)} className="w-4 h-4 cursor-pointer" />
                <span>Enviar comanda a la Cocina (Estado: Pendiente)</span>
              </label>
              <span className="text-[11px] text-ink-soft -mt-1">
                * Si está desactivado, el pedido se cargará directamente a la mesa como ya entregado (estado: Servido).
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL DE COBRO Y FACTURACIÓN */}
      <Modal
        open={mostrarModalFacturacion && !!pedidoParaFacturar}
        onClose={() => setMostrarModalFacturacion(false)}
        variant="drawer"
        title={pedidoParaFacturar ? `Cobro & Facturación — Pedido #${pedidoParaFacturar.id}` : ''}
        subtitle={pedidoParaFacturar ? `${pedidoParaFacturar.mesa_id ? `Mesa N° ${pedidoParaFacturar.mesa_id}` : 'Envío a Domicilio (Delivery)'} • Cliente: ${pedidoParaFacturar.nombre_cliente}` : ''}
        footer={
          <Button type="submit" form="factura-form" variant="success" size="lg" fullWidth icon={procesandoFacturacion ? undefined : Receipt} loading={procesandoFacturacion}>
            {procesandoFacturacion ? 'Generando Comprobante...' : 'Confirmar Cobro e Imprimir Ticket'}
          </Button>
        }
      >
        {pedidoParaFacturar && (
          <form id="factura-form" onSubmit={handleConfirmarFacturacion} className="flex flex-col gap-5">
            {/* 1. SELECCIÓN DE TIPO DE COMPROBANTE */}
            <div>
              <label className="block text-xs font-semibold uppercase text-gold mb-2">1. Tipo de Comprobante</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'factura_b', label: 'Factura B', desc: 'Consumidor Final' },
                  { id: 'factura_a', label: 'Factura A', desc: 'Resp. Inscripto' },
                  { id: 'pre_cuenta', label: 'Pre-Cuenta', desc: 'Control Interno' }
                ].map(type => (
                  <button
                    type="button"
                    key={type.id}
                    onClick={() => setFacturaTipoComprobante(type.id as any)}
                    className={`min-h-[52px] rounded-md border px-2 py-2.5 text-center font-semibold ${
                      facturaTipoComprobante === type.id
                        ? 'bg-gold border-gold text-ink'
                        : 'bg-cream border-line text-ink'
                    }`}
                  >
                    <p className="text-xs">{type.label}</p>
                    <p className="text-[10px] opacity-75">{type.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* FORMULARIO FACTURA A (CUIT / RAZÓN SOCIAL) */}
            {facturaTipoComprobante === 'factura_a' && (
              <div className="rounded-md border border-line bg-cream p-4 flex flex-col gap-3">
                <p className="text-xs font-semibold text-gold">Datos Fiscales del Cliente (Factura A)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-ink-soft mb-1">CUIT / CUIL *</label>
                    <input
                      type="text"
                      required
                      value={facturaClienteCuit}
                      onChange={(e) => setFacturaClienteCuit(e.target.value)}
                      placeholder="Ej: 30-71234567-8"
                      className="w-full min-h-[44px] rounded-md border border-line bg-card px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-ink-soft mb-1">Razón Social *</label>
                    <input
                      type="text"
                      required
                      value={facturaClienteRazonSocial}
                      onChange={(e) => setFacturaClienteRazonSocial(e.target.value)}
                      placeholder="Ej: Gastronomía del Sur S.A."
                      className="w-full min-h-[44px] rounded-md border border-line bg-card px-3 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. MEDIO DE PAGO */}
            <div>
              <label className="block text-xs font-semibold uppercase text-gold mb-2">2. Medio de Pago</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'efectivo', label: '💵 Efectivo' },
                  { id: 'mercadopago', label: '📱 QR / MP' },
                  { id: 'tarjeta', label: '💳 Tarjeta' },
                  { id: 'mixto', label: '🔀 Mixto' }
                ].map(pay => (
                  <button
                    type="button"
                    key={pay.id}
                    onClick={() => setFacturaMetodoPago(pay.id as any)}
                    className={`min-h-[48px] rounded-md border px-1 text-xs font-semibold ${
                      facturaMetodoPago === pay.id ? 'bg-success border-success text-white' : 'bg-cream border-line text-ink'
                    }`}
                  >
                    {pay.label}
                  </button>
                ))}
              </div>

              {/* CÁLCULO DE VUELTO EN EFECTIVO */}
              {facturaMetodoPago === 'efectivo' && (
                <div className="mt-3 rounded-md border border-line bg-cream p-4">
                  <label className="block text-[11px] text-ink-soft mb-1.5">Monto abonado con billetes en efectivo:</label>
                  <input
                    type="number"
                    value={facturaEfectivoAbonado}
                    onChange={(e) => setFacturaEfectivoAbonado(e.target.value)}
                    placeholder={`Monto total: $${Number(pedidoParaFacturar.total).toLocaleString('es-AR')}`}
                    className="w-full min-h-[44px] rounded-md border border-line bg-card px-3 text-sm"
                  />
                  {Number(facturaEfectivoAbonado) > Number(pedidoParaFacturar.total) && (
                    <div className="mt-2 text-success font-bold text-sm">
                      Vuelto a entregar al cliente: ${(Number(facturaEfectivoAbonado) - Number(pedidoParaFacturar.total)).toLocaleString('es-AR')}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* DESCUENTO / PROPINA */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-ink-soft mb-1">Descuento ($)</label>
                <input
                  type="number"
                  value={facturaDescuento}
                  onChange={(e) => setFacturaDescuento(e.target.value)}
                  placeholder="0"
                  className="w-full min-h-[44px] rounded-md border border-line bg-cream px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-ink-soft mb-1">Propina Sugerida ($)</label>
                <input
                  type="number"
                  value={facturaPropina}
                  onChange={(e) => setFacturaPropina(e.target.value)}
                  placeholder="0"
                  className="w-full min-h-[44px] rounded-md border border-line bg-cream px-3 text-sm"
                />
              </div>
            </div>

            {/* RESUMEN DE TOTAL */}
            <div className="border-t border-line pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-ink-soft">Total a Cobrar</span>
                <span className="text-2xl font-bold text-gold">
                  ${(Number(pedidoParaFacturar.total) - Number(facturaDescuento || 0) + Number(facturaPropina || 0)).toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* TICKET TÉRMICO IMPRIMIBLE FISCAL */}
      <Modal
        open={!!ticketFacturaImprimir}
        onClose={() => setTicketFacturaImprimir(null)}
        title="Comprobante"
        size="sm"
        footer={
          <div className="flex gap-2 no-print">
            <Button variant="outline" fullWidth onClick={() => setTicketFacturaImprimir(null)}>Cerrar</Button>
            <Button variant="primary" fullWidth icon={Printer} onClick={() => window.print()}>Imprimir</Button>
          </div>
        }
      >
        {ticketFacturaImprimir && (
          <div className="ticket-printable-container rounded-md bg-white text-black font-mono text-xs leading-relaxed p-4">
            <div className="text-center mb-3">
              <h2 className="text-base font-extrabold">{BRAND_CONFIG.ticketHeader}</h2>
              <p className="text-[10px]">{BRAND_CONFIG.address}</p>
              <p className="text-[10px]">Tel: {BRAND_CONFIG.phone}</p>
              <p className="text-[10px] mt-0.5">CUIT: 30-71829304-8 • Resp. Inscripto</p>
            </div>

            <div className="border-y border-dashed border-black py-2 my-2">
              <p><b>COMPROBANTE:</b> {ticketFacturaImprimir.tipo_comprobante === 'factura_a' ? 'FACTURA A' : ticketFacturaImprimir.tipo_comprobante === 'factura_b' ? 'FACTURA B' : 'PRE-CUENTA'}</p>
              <p><b>N°:</b> {ticketFacturaImprimir.nro_comprobante || `TC-0001-${String(ticketFacturaImprimir.id).padStart(8, '0')}`}</p>
              <p><b>FECHA:</b> {new Date(ticketFacturaImprimir.facturado_at || Date.now()).toLocaleString('es-AR')}</p>
              <p><b>CLIENTE:</b> {ticketFacturaImprimir.cliente_razon_social || ticketFacturaImprimir.nombre_cliente}</p>
              {ticketFacturaImprimir.cliente_cuit && <p><b>CUIT:</b> {ticketFacturaImprimir.cliente_cuit}</p>}
              <p><b>ORIGEN:</b> {ticketFacturaImprimir.mesa_id ? `Mesa ${ticketFacturaImprimir.mesa_id}` : 'Delivery'}</p>
            </div>

            <div className="my-3">
              {ticketFacturaImprimir.detalles?.map((det, i) => (
                <div key={i} className="flex justify-between mb-1">
                  <span>{det.cantidad}x {det.producto?.nombre || 'Producto'}</span>
                  <span>${(det.cantidad * Number(det.precio_unitario)).toLocaleString('es-AR')}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-black pt-2">
              <div className="flex justify-between">
                <span>Neto Gravado:</span>
                <span>${Number(ticketFacturaImprimir.monto_neto || (Number(ticketFacturaImprimir.total) / 1.21)).toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA (21%):</span>
                <span>${Number(ticketFacturaImprimir.monto_iva || (Number(ticketFacturaImprimir.total) - Number(ticketFacturaImprimir.total) / 1.21)).toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold mt-1.5">
                <span>TOTAL:</span>
                <span>${Number(ticketFacturaImprimir.total_facturado || ticketFacturaImprimir.total).toLocaleString('es-AR')}</span>
              </div>
              <p className="mt-1.5"><b>MEDIO PAGO:</b> {ticketFacturaImprimir.metodo_pago || 'Efectivo'}</p>
            </div>

            {ticketFacturaImprimir.cae && (
              <div className="border-t border-dashed border-black pt-2 mt-2 text-center text-[10px]">
                <p><b>CAE AFIP:</b> {ticketFacturaImprimir.cae}</p>
                <p><b>VENCIMIENTO CAE:</b> {new Date(ticketFacturaImprimir.cae_vencimiento || Date.now()).toLocaleDateString('es-AR')}</p>
              </div>
            )}

            <div className="text-center mt-4 text-[10px]">
              <p>{BRAND_CONFIG.ticketFooter}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* ESTILOS DE IMPRESIÓN (sólo afectan a @media print) */}
      <style jsx global>{`
        @media print {
          .no-print, header, nav, button {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          main {
            padding: 0 !important;
          }
          .print-area {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 20px !important;
            width: 100% !important;
          }
          .qr-card-printable {
            border: 1px solid #ccc !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
          }
          .ticket-printable-container {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
