'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { supabase } from '../../lib/supabase';
import { BRAND_CONFIG } from '../../lib/brandConfig';
import { 
  getMesas, 
  crearPedido, 
  crearSolicitud, 
  atenderSolicitud, 
  liberarMesa, 
  cambiarEstadoPedido, 
  seedDatabase,
  DbTable,
  DbOrder,
  DbRequest,
  getProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  getCategorias,
  ocuparMesa,
  DbProduct,
  DbCategory
} from '../../lib/dbActions';
import { 
  Bell, 
  Receipt, 
  Check, 
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
  Clock,
  ChevronRight,
  TrendingUp,
  Loader2,
  Lock,
  DollarSign,
  Calendar,
  BarChart3
} from 'lucide-react';

export default function AdminDashboard() {
  // Autenticación de Roles (null | 'caja' | 'dueno')
  const [rolActivo, setRolActivo] = useState<'caja' | 'dueno' | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [solicitaPin, setSolicitaPin] = useState(false);

  // Navegación
  const [tabActiva, setTabActiva] = useState<'monitoreo' | 'pedidos' | 'qrs' | 'metrics' | 'inventario'>('monitoreo');
  
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

  // Estados para el Consumo Manual desde Caja
  const [mostrarModalConsumoManual, setMostrarModalConsumoManual] = useState(false);
  const [mesaConsumoManual, setMesaConsumoManual] = useState<DbTable | null>(null);
  const [itemsConsumoManual, setItemsConsumoManual] = useState<{ producto: DbProduct; cantidad: number; observaciones?: string }[]>([]);
  const [manualProductoSeleccionadoId, setManualProductoSeleccionadoId] = useState<string | number>('');
  const [manualCantidad, setManualCantidad] = useState(1);
  const [manualObservaciones, setManualObservaciones] = useState('');
  const [manualEnviarACocina, setManualEnviarACocina] = useState(true);
  
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
      const savedRole = sessionStorage.getItem(`${BRAND_CONFIG.storagePrefix}_admin_rol`);
      if (savedRole === 'caja' || savedRole === 'dueno') {
        setRolActivo(savedRole as any);
      }
    }
  }, []);

  // Ajustar temporalmente el color de fondo del body para el panel
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalBg = document.body.style.backgroundColor;
      const originalColor = document.body.style.color;
      document.body.style.backgroundColor = '#0d0d0d';
      document.body.style.color = '#f5f5f5';

      return () => {
        document.body.style.backgroundColor = originalBg;
        document.body.style.color = originalColor;
      };
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

  // Manejo de ingreso PIN de Dueño
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '1234') {
      setRolActivo('dueno');
      sessionStorage.setItem(`${BRAND_CONFIG.storagePrefix}_admin_rol`, 'dueno');
      setLoginError('');
      setPinInput('');
    } else {
      setLoginError('PIN Incorrecto de Administrador.');
      setPinInput('');
    }
  };

  // Salir de sesión del rol
  const handleLogout = () => {
    sessionStorage.removeItem(`${BRAND_CONFIG.storagePrefix}_admin_rol`);
    setRolActivo(null);
    setSolicitaPin(false);
  };

  // Guardar o actualizar producto en la base de datos (CRUD)
  const handleProductoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim() || !formPrecio.trim() || !formCategoriaId) {
      alert('Por favor completa los campos requeridos.');
      return;
    }

    const price = Number(formPrecio);
    if (isNaN(price) || price < 0) {
      alert('El precio debe ser un número válido mayor o igual a 0.');
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
        alert('Producto guardado exitosamente.');
      } else {
        alert('Error al guardar producto: ' + res.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
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
      setMostrarModalConsumoManual(false);
      setMesaConsumoManual(null);
      setItemsConsumoManual([]);
      setManualProductoSeleccionadoId('');
      setManualCantidad(1);
      setManualObservaciones('');
      cargarDatosCompletos();
      alert('Consumo agregado exitosamente a la mesa ' + mesaConsumoManual.numero);
    } catch (err: any) {
      console.error('Error al confirmar consumo manual:', err);
      alert('Error: ' + err.message);
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

  // Actualizar estado de pedido
  const handleEstadoPedido = async (pedidoId: number, estado: string) => {
    const ok = await cambiarEstadoPedido(pedidoId, estado);
    if (ok) {
      cargarDatosCompletos();
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

  // ================= PANTALLA LOGIN DE ACCESO =================
  if (!rolActivo) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: '#0d0d0d',
        color: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px',
        fontFamily: 'var(--font-sans)'
      }}>
        <div style={{
          background: '#161616',
          border: '1px solid #222',
          borderRadius: '0px', // Bordes completamente rectos
          width: '100%',
          maxWidth: '420px',
          padding: '36px', // Padding generoso premium
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
          textAlign: 'center'
        }}>
          <span style={{
            fontSize: '11px',
            color: 'var(--accent-gold)',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            fontWeight: 600,
            display: 'block',
            marginBottom: '8px'
          }}>{BRAND_CONFIG.fullName.toUpperCase()}</span>
          
          <h2 style={{ fontSize: '24px', fontWeight: 400, letterSpacing: '0.5px', marginBottom: '28px', textTransform: 'uppercase' }}>
            Control de Acceso
          </h2>

          {!solicitaPin ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button
                onClick={() => {
                  setRolActivo('caja');
                  sessionStorage.setItem(`${BRAND_CONFIG.storagePrefix}_admin_rol`, 'caja');
                }}
                style={{
                  background: '#222',
                  border: '1px solid #333',
                  color: 'white',
                  padding: '16px',
                  borderRadius: '0px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <ShoppingBag size={16} />
                <span>Ingresar como Caja / Personal</span>
              </button>

              <button
                onClick={() => setSolicitaPin(true)}
                style={{
                  background: 'var(--accent-gold)',
                  border: 'none',
                  color: '#121212',
                  padding: '16px',
                  borderRadius: '0px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Lock size={16} />
                <span>Acceso Dueño / Admin</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handlePinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#a0a0a0' }}>
                  Código PIN de Administrador
                </label>
                <input 
                  type="password"
                  required
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="••••"
                  maxLength={4}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '0px',
                    border: '1px solid #333',
                    background: '#0d0d0d',
                    color: 'white',
                    fontSize: '18px',
                    textAlign: 'center',
                    letterSpacing: '8px'
                  }}
                  autoFocus
                />
              </div>

              {loginError && (
                <p style={{ color: '#ff4d4d', fontSize: '12px', textAlign: 'center', margin: '4px 0 0' }}>{loginError}</p>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setSolicitaPin(false);
                    setLoginError('');
                  }}
                  style={{
                    flex: 1,
                    background: '#222',
                    border: '1px solid #333',
                    color: 'white',
                    padding: '14px',
                    borderRadius: '0px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  Volver
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2,
                    background: 'var(--accent-gold)',
                    border: 'none',
                    color: '#121212',
                    padding: '14px',
                    borderRadius: '0px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  Confirmar PIN
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ================= PANTALLA PRINCIPAL ADMIN =================
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: '#0d0d0d',
      color: '#f5f5f5',
      fontFamily: 'var(--font-sans)',
      paddingBottom: '40px'
    }} className={`admin-dashboard-page ${mesaTicketImprimir ? 'no-print' : ''}`}>
      
      {/* HEADER DE ADMINISTRACIÓN */}
      <header style={{
        background: '#161616',
        borderBottom: '1px solid #222',
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }} className="no-print admin-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'var(--accent-gold)',
            color: '#121212',
            padding: '10px 14px',
            borderRadius: '0px', // Bordes rectos
            fontWeight: 'bold',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            letterSpacing: '1px'
          }}>
            <Sparkles size={16} />
            <span>{BRAND_CONFIG.name.toUpperCase()}</span>
          </div>
          <div>
            <h1 style={{ fontSize: '17px', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Control y Monitoreo {rolActivo === 'dueno' ? '(Dueño)' : '(Caja)'}
            </h1>
            <p style={{ fontSize: '11px', color: '#a0a0a0' }}>Actualizaciones en tiempo real activas</p>
          </div>
        </div>

        {/* CONTADORES RÁPIDOS Y LOGOUT */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }} className="admin-header-controls">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#222', padding: '6px 14px', borderRadius: '0px', border: '1px solid #333' }}>
            <Bell size={14} style={{ color: 'var(--accent-gold)' }} />
            <span style={{ fontSize: '12px' }}>Llamados: <b>{solicitudes.filter(s => s.tipo === 'llamar_mozo').length}</b></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#222', padding: '6px 14px', borderRadius: '0px', border: '1px solid #333' }}>
            <Receipt size={14} style={{ color: '#2b9348' }} />
            <span style={{ fontSize: '12px' }}>Cuentas: <b>{solicitudes.filter(s => s.tipo === 'pedir_cuenta').length}</b></span>
          </div>
          <button 
            onClick={cargarDatosCompletos} 
            style={{
              background: '#262626',
              border: '1px solid #333',
              borderRadius: '0px',
              padding: '8px 12px',
              cursor: 'pointer',
              color: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <RefreshCw size={14} />
          </button>
          
          <button 
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid #ff4d4d',
              color: '#ff4d4d',
              borderRadius: '0px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* SUB-HEADER / MENÚ DE TABS */}
      <nav style={{
        background: '#121212',
        borderBottom: '1px solid #222',
        padding: '0 24px',
        display: 'flex',
        gap: '24px',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        scrollbarWidth: 'none'
      }} className="no-print admin-nav-scroll">
        {[
          { id: 'monitoreo', label: 'Monitoreo de Mesas', icon: Coffee, visible: true },
          { id: 'pedidos', label: 'Pedidos y Delivery', icon: ShoppingBag, visible: true },
          { id: 'qrs', label: 'Códigos QR', icon: QrCode, visible: true },
          { id: 'metrics', label: 'Métricas de Venta', icon: BarChart3, visible: rolActivo === 'dueno' },
          { id: 'inventario', label: 'Inventario y Productos', icon: Database, visible: true }
        ].filter(t => t.visible).map(tab => {
          const Icon = tab.icon;
          const activo = tabActiva === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id as any)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activo ? '3px solid var(--accent-gold)' : '3px solid transparent',
                padding: '16px 8px',
                color: activo ? 'var(--accent-gold)' : '#a0a0a0',
                fontWeight: activo ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <main style={{ padding: '32px' }}>
        
        {/* SECCIÓN SEEDING */}
        {seedingMsg && (
          <div style={{
            background: 'var(--accent-light-gold)',
            color: '#121212',
            padding: '16px 24px',
            borderRadius: '0px', // Sin redondeados
            border: '1px solid var(--accent-gold)',
            marginBottom: '24px',
            fontWeight: 500,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            {seeding ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
            <span>{seedingMsg}</span>
          </div>
        )}

        {/* 1. MONITOREO DE MESAS */}
        {tabActiva === 'monitoreo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mesas Activas (1 a 10)</h2>
              <p style={{ fontSize: '12px', color: '#a0a0a0' }}>Haz clic en Liberar para desocupar la mesa y cerrar su sesión.</p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px'
            }}>
              {mesas.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', border: '1px dashed #333', borderRadius: '0px', color: '#a0a0a0' }}>
                  <Database size={32} style={{ marginBottom: '12px', color: '#555' }} />
                  <p>No se encontraron mesas cargadas en la base de datos.</p>
                  <p style={{ fontSize: '13px', marginTop: '6px' }}>Ve a la pestaña "Base de Datos" para inicializarlas.</p>
                </div>
              ) : (
                mesas.map((mesa) => {
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

                  let borderStyle = '1px solid #222';
                  let bgGlow = 'transparent';
                  if (tieneCuenta) {
                    borderStyle = '2px solid #2b9348';
                    bgGlow = 'rgba(43, 147, 72, 0.04)';
                  } else if (tieneLlamado) {
                    borderStyle = '2px solid var(--accent-gold)';
                    bgGlow = 'rgba(197, 168, 128, 0.04)';
                  }

                  return (
                    <div 
                      key={mesa.id}
                      style={{
                        background: '#161616',
                        borderRadius: '0px', // Sin esquinas redondeadas
                        border: borderStyle,
                        backgroundColor: bgGlow || '#161616',
                        padding: '24px', // Padding amplio
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <span style={{ fontSize: '18px', fontWeight: 600 }}>Mesa {mesa.numero}</span>
                          
                          <span style={{
                            fontSize: '10px',
                            textTransform: 'uppercase',
                            fontWeight: 'bold',
                            padding: '4px 8px',
                            borderRadius: '0px',
                            border: '1px solid transparent',
                            background: 
                              mesa.estado === 'libre' ? '#222' :
                              mesa.estado === 'esperando_pedido' ? '#b58826' :
                              mesa.estado === 'atendida' ? '#1c4721' : '#444',
                            color: 
                              mesa.estado === 'libre' ? '#a0a0a0' :
                              mesa.estado === 'esperando_pedido' ? '#ffe6a3' : '#a3f3b2'
                          }}>
                            {mesa.estado === 'libre' ? 'Libre' : 
                             mesa.estado === 'esperando_pedido' ? 'Cocina' : 
                             mesa.estado === 'atendida' ? 'Atendida' : 'Ocupada'}
                          </span>
                        </div>

                        {tieneLlamado && (
                          <div style={{
                            background: 'rgba(197, 168, 128, 0.15)',
                            border: '1px solid var(--accent-gold)',
                            color: 'var(--accent-gold)',
                            borderRadius: '0px',
                            padding: '10px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '14px',
                            animation: 'pulse 2s infinite'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>
                              <Bell size={12} className="animate-bounce" /> LLAMAN AL MOZO
                            </span>
                            <button 
                              onClick={() => handleAtenderSolicitud(llamadosMesa[0].id)}
                              style={{
                                background: 'var(--accent-gold)',
                                border: 'none',
                                color: '#121212',
                                padding: '4px 8px',
                                borderRadius: '0px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                textTransform: 'uppercase'
                              }}
                            >
                              Atender
                            </button>
                          </div>
                        )}

                        {tieneCuenta && (
                          <div style={{
                            background: 'rgba(43, 147, 72, 0.15)',
                            border: '1px solid #2b9348',
                            color: '#2b9348',
                            borderRadius: '0px',
                            padding: '10px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '14px',
                            animation: 'pulse 2s infinite'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>
                              <Receipt size={12} /> PIDEN LA CUENTA
                            </span>
                            <button 
                              onClick={() => handleAtenderSolicitud(cuentasMesa[0].id)}
                              style={{
                                background: '#2b9348',
                                border: 'none',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '0px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                textTransform: 'uppercase'
                              }}
                            >
                              Atender
                            </button>
                          </div>
                        )}

                        {/* Pedidos activos de la mesa */}
                        {(pedidosMesa.length > 0 || mesa.cliente_nombre) && (
                          <div style={{ borderTop: '1px solid #222', paddingTop: '12px', marginTop: '12px' }}>
                            <p style={{ fontSize: '11px', color: '#a0a0a0', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Consumos Activos ({mesa.cliente_nombre || 'Mesa'}):
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {pedidosMesa.length === 0 ? (
                                <p style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>Sin consumos registrados todavía.</p>
                              ) : (
                                pedidosMesa.flatMap(p => p.detalles || []).map((det, index) => (
                                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span>{det.cantidad}x {det.producto?.nombre || 'Producto'}</span>
                                    {det.observaciones && <span style={{ color: 'var(--accent-gold)', fontSize: '10px', fontStyle: 'italic' }}>({det.observaciones})</span>}
                                  </div>
                                ))
                              )}
                              {pedidosMesa.length > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #333', paddingTop: '8px', marginTop: '8px', fontSize: '13px', fontWeight: 600 }}>
                                  <span>Total Consumido:</span>
                                  <span style={{ color: 'var(--accent-gold)' }}>
                                    ${pedidosMesa.reduce((sum, p) => sum + Number(p.total), 0).toLocaleString('es-AR')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Botones de control de mesa */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => {
                            setMesaConsumoManual(mesa);
                            setItemsConsumoManual([]);
                            setManualProductoSeleccionadoId(productosList[0]?.id || '');
                            setManualCantidad(1);
                            setManualObservaciones('');
                            setManualEnviarACocina(true);
                            setMostrarModalConsumoManual(true);
                          }}
                          style={{
                            flex: 1,
                            minWidth: '80px',
                            background: '#222',
                            border: '1px solid #444',
                            color: '#ccc',
                            borderRadius: '0px',
                            padding: '8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            textTransform: 'uppercase'
                          }}
                        >
                          <span>+ Consumo</span>
                        </button>

                        {mesa.estado !== 'libre' && (
                          <>
                            <button
                              onClick={() => setMesaTicketImprimir(mesa)}
                              disabled={pedidosMesa.length === 0}
                              style={{
                                flex: 1,
                                minWidth: '80px',
                                background: 'var(--accent-gold)',
                                border: 'none',
                                color: '#121212',
                                borderRadius: '0px',
                                padding: '8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                opacity: pedidosMesa.length === 0 ? 0.5 : 1,
                                textTransform: 'uppercase'
                              }}
                            >
                              <Printer size={12} />
                              <span>Ticket</span>
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`¿Estás seguro de liberar la Mesa ${mesa.numero}? Esto borrará los consumos de la sesión actual.`)) {
                                  handleLiberarMesa(mesa.id);
                                }
                              }}
                              style={{
                                flex: 1,
                                minWidth: '80px',
                                background: '#222',
                                border: '1px solid #333',
                                color: '#ff4d4d',
                                borderRadius: '0px',
                                padding: '8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                textTransform: 'uppercase'
                              }}
                            >
                              <Trash2 size={12} />
                              <span>Liberar</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 2. TABLA DE PEDIDOS Y DELIVERY */}
        {tabActiva === 'pedidos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cola de Pedidos Activos (Cocina & Delivery)</h2>
              <span style={{ background: 'var(--accent-gold)', color: '#121212', fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '0px', textTransform: 'uppercase' }}>
                {pedidosActivos.length} pedidos en cola
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pedidosActivos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', border: '1px dashed #333', borderRadius: '0px', color: '#a0a0a0' }}>
                  <ShoppingBag size={32} style={{ marginBottom: '12px', color: '#555' }} />
                  <p>No hay pedidos pendientes en preparación.</p>
                </div>
              ) : (
                pedidosActivos.map((pedido) => (
                  <div 
                    key={pedido.id}
                    style={{
                      background: '#161616',
                      borderRadius: '0px',
                      border: '1px solid #222',
                      padding: '24px', // Espaciado amplio
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '20px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '250px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 'bold',
                          padding: '4px 8px',
                          borderRadius: '0px',
                          background: pedido.tipo === 'delivery' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: pedido.tipo === 'delivery' ? '#3b82f6' : '#f59e0b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          letterSpacing: '0.5px'
                        }}>
                          {pedido.tipo === 'delivery' ? <Truck size={12} /> : <Coffee size={12} />}
                          {pedido.tipo === 'delivery' ? 'DELIVERY' : `MESA ${pedido.mesa?.numero}`}
                        </span>

                        <span style={{ fontSize: '12px', color: '#a0a0a0' }}>
                          Pedido #{pedido.id} • {new Date(pedido.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <User size={13} style={{ color: 'var(--accent-gold)' }} /> {pedido.nombre_cliente}
                      </h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#a0a0a0', marginBottom: '14px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={12} /> Celular: {pedido.telefono}
                        </span>
                        {pedido.tipo === 'delivery' && pedido.direccion && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={12} /> Dirección: {pedido.direccion}
                          </span>
                        )}
                      </div>

                      <div style={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: '0px', padding: '16px' }}>
                        <p style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', fontWeight: 600 }}>Productos:</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {pedido.detalles?.map((det, index) => (
                            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                              <span>
                                <b>{det.cantidad}x</b> {det.producto?.nombre || 'Producto'}
                                {det.observaciones && (
                                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--accent-gold)', fontStyle: 'italic', marginTop: '2px' }}>
                                    Nota: {det.observaciones}
                                  </span>
                                )}
                              </span>
                              <span>${(Number(det.precio_unitario) * det.cantidad).toLocaleString('es-AR')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', height: '100%', minWidth: '160px', alignSelf: 'stretch' }}>
                      <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                        <span style={{ fontSize: '11px', color: '#a0a0a0', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total del Pedido</span>
                        <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-gold)' }}>${Number(pedido.total).toLocaleString('es-AR')}</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {pedido.estado === 'pendiente' && (
                            <button 
                              onClick={() => handleEstadoPedido(pedido.id, 'preparando')}
                              style={{
                                flex: 1,
                                background: '#b58826',
                                color: 'white',
                                border: 'none',
                                padding: '10px 14px',
                                borderRadius: '0px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textTransform: 'uppercase'
                              }}
                            >
                              Preparar
                            </button>
                          )}
                          {pedido.estado === 'preparando' && (
                            <button 
                              onClick={() => handleEstadoPedido(pedido.id, 'listo')}
                              style={{
                                flex: 1,
                                background: '#1c4721',
                                color: 'white',
                                border: 'none',
                                padding: '10px 14px',
                                borderRadius: '0px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textTransform: 'uppercase'
                              }}
                            >
                              Listo
                            </button>
                          )}
                          {pedido.estado === 'listo' && (
                            <button 
                              onClick={() => handleEstadoPedido(pedido.id, 'entregado')}
                              style={{
                                flex: 1,
                                background: '#2b9348',
                                color: 'white',
                                border: 'none',
                                padding: '10px 14px',
                                borderRadius: '0px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textTransform: 'uppercase'
                              }}
                            >
                              Entregar
                            </button>
                          )}
                          
                          <button 
                            onClick={() => {
                              if (confirm('¿Desea cancelar este pedido?')) {
                                handleEstadoPedido(pedido.id, 'cancelado');
                              }
                            }}
                            style={{
                              background: '#222',
                              border: '1px solid #333',
                              color: '#ff4d4d',
                              padding: '10px',
                              borderRadius: '0px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              textTransform: 'uppercase'
                            }}
                            title="Cancelar Pedido"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* HISTORIAL DE PEDIDOS */}
            {pedidosCompletados.length > 0 && (
              <div style={{ marginTop: '40px', borderTop: '1px solid #222', paddingTop: '24px' }}>
                <h3 style={{ fontSize: '14px', color: '#888', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Historial Reciente (Entregados y Cancelados)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pedidosCompletados.slice(0, 10).map((pedido) => (
                    <div 
                      key={pedido.id}
                      style={{
                        background: '#121212',
                        border: '1px solid #1a1a1a',
                        borderRadius: '0px',
                        padding: '12px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '13px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 'bold',
                          padding: '2px 6px',
                          borderRadius: '0px',
                          background: pedido.estado === 'entregado' ? 'rgba(43, 147, 72, 0.1)' : 'rgba(255, 77, 77, 0.1)',
                          color: pedido.estado === 'entregado' ? '#2b9348' : '#ff4d4d',
                          textTransform: 'uppercase'
                        }}>
                          {pedido.estado}
                        </span>
                        <span>#{pedido.id} • {pedido.nombre_cliente} ({pedido.tipo})</span>
                      </div>
                      <div style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
                        ${Number(pedido.total).toLocaleString('es-AR')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. GENERADOR DE CÓDIGOS QR */}
        {tabActiva === 'qrs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tarjetas de Códigos QR para las Mesas</h2>
                <p style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '4px' }}>
                  Hojas listas para imprimir. Cada una contiene el código QR enlazado a la dirección `/mesa/[id]`.
                </p>
              </div>
              <button
                onClick={handlePrint}
                style={{
                  background: 'var(--accent-gold)',
                  color: '#121212',
                  border: 'none',
                  borderRadius: '0px',
                  padding: '12px 24px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                <Printer size={14} />
                <span>Imprimir Tarjetas QR</span>
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px',
              marginTop: '12px'
            }} className="print-area">
              {[...Array(10)].map((_, i) => {
                const numero = i + 1;
                const targetUrl = `${hostUrl}/mesa/${numero}`;
                const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(targetUrl)}&color=121212`;

                return (
                  <div 
                    key={numero}
                    className="qr-card-printable"
                    style={{
                      background: 'white',
                      color: '#121212',
                      borderRadius: '0px', // Sin redondeados
                      border: '2px solid #eae6df',
                      padding: '32px 24px', // Espaciado amplio
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
                      pageBreakInside: 'avoid'
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: '#c5a880', margin: 0 }}>{BRAND_CONFIG.name.toUpperCase()}</span>
                    <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '1px', color: '#656565', marginTop: '-2px', marginBottom: '16px' }}>{BRAND_CONFIG.subtitle}</p>
                    
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '0px', // Bordes rectos para un look industrial
                      background: '#121212',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      fontWeight: 'bold',
                      marginBottom: '20px',
                      border: '2px solid #c5a880'
                    }}>
                      {numero}
                    </div>

                    <div style={{
                      width: '180px',
                      height: '180px',
                      position: 'relative',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #eae6df',
                      padding: '8px',
                      borderRadius: '0px',
                      background: '#fff'
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={qrImgSrc} 
                        alt={`QR Mesa ${numero}`} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>

                    <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#121212', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Escaneá el QR</h4>
                    <p style={{ fontSize: '9px', color: '#656565', lineHeight: 1.3, maxWidth: '200px', margin: '0 auto' }}>
                      Mirá la carta, realizá tu pedido, agregá agua o llamá al mozo desde tu celular.
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. METRICAS DE VENTA (SÓLO DUEÑO) */}
        {tabActiva === 'metrics' && rolActivo === 'dueno' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Métricas y Analíticas del Local</h2>
              <span style={{ fontSize: '11px', color: '#a0a0a0', border: '1px solid #222', padding: '4px 10px', borderRadius: '0px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Vista Administrador
              </span>
            </div>

            {/* METRICAS DE FACTURACIÓN */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px'
            }}>
              {[
                { titulo: 'Facturación del Día', valor: ventasHoy, desc: 'Pedidos de hoy acumulados sin cancelar', icon: DollarSign },
                { titulo: 'Facturación Semanal', valor: ventasSemana, desc: 'Desde el lunes de la semana en curso', icon: Calendar },
                { titulo: 'Facturación Mensual', valor: ventasMes, desc: 'Desde el primer día del mes actual', icon: TrendingUp }
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} style={{
                    background: '#161616',
                    border: '1px solid #222',
                    borderRadius: '0px',
                    padding: '28px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-soft)'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#a0a0a0', textTransform: 'uppercase', letterSpacing: '1px' }}>{item.titulo}</span>
                        <Icon size={16} style={{ color: 'var(--accent-gold)' }} />
                      </div>
                      <h3 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '8px', fontFamily: 'var(--font-sans)' }}>
                        ${item.valor.toLocaleString('es-AR')}
                      </h3>
                    </div>
                    <p style={{ fontSize: '11px', color: '#666', lineHeight: 1.3 }}>{item.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* ROTACIÓN Y PENDIENTES */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: '24px'
            }}>
              
              {/* RANKING GENERAL */}
              <div style={{
                background: '#161616',
                border: '1px solid #222',
                borderRadius: '0px',
                padding: '32px'
              }}>
                <h3 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px', color: 'var(--accent-gold)' }}>
                  Rotación de Pastelería y Mercadería General
                </h3>
                
                {topGeneral.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>No hay ventas registradas.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {topGeneral.slice(0, 5).map((item, idx) => {
                      const maxQty = topGeneral[0].cantidad;
                      const percentage = maxQty > 0 ? (item.cantidad / maxQty) * 100 : 0;
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span>{idx + 1}. <b>{item.nombre}</b></span>
                            <span style={{ color: '#a0a0a0' }}>{item.cantidad} unidades • <b style={{ color: 'var(--accent-gold)' }}>${item.total.toLocaleString('es-AR')}</b></span>
                          </div>
                          {/* Barra de progreso afilada */}
                          <div style={{ height: '8px', background: '#0d0d0d', border: '1px solid #222', borderRadius: '0px', overflow: 'hidden' }}>
                            <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--accent-gold)', borderRadius: '0px' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* RANKING DE INFUSIONES / CAFÉ */}
              <div style={{
                background: '#161616',
                border: '1px solid #222',
                borderRadius: '0px',
                padding: '32px'
              }}>
                <h3 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px', color: 'var(--accent-gold)' }}>
                  Consumo de Infusiones y Cafetería
                </h3>
                
                {topInfusiones.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>No hay ventas de cafetería registradas.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {topInfusiones.slice(0, 5).map((item, idx) => {
                      const maxQty = topInfusiones[0].cantidad;
                      const percentage = maxQty > 0 ? (item.cantidad / maxQty) * 100 : 0;
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span>{idx + 1}. <b>{item.nombre}</b></span>
                            <span style={{ color: '#a0a0a0' }}>{item.cantidad} unidades • <b style={{ color: 'var(--accent-gold)' }}>${item.total.toLocaleString('es-AR')}</b></span>
                          </div>
                          {/* Barra de progreso afilada */}
                          <div style={{ height: '8px', background: '#0d0d0d', border: '1px solid #222', borderRadius: '0px', overflow: 'hidden' }}>
                            <div style={{ width: `${percentage}%`, height: '100%', background: '#2b9348', borderRadius: '0px' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* MOMENTOS PICO */}
            <div style={{
              background: '#161616',
              border: '1px solid #222',
              borderRadius: '0px',
              padding: '32px'
            }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px', color: 'var(--accent-gold)' }}>
                Momentos Pico de Clientes (Días y Horarios)
              </h3>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px' }}>
                <div style={{ flex: 1, minWidth: '220px', borderRight: '1px solid #222', paddingRight: '20px' }}>
                  <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>
                    Día con más Afluencia
                  </span>
                  <span style={{ fontSize: '24px', fontWeight: 600, color: 'white', display: 'block', marginBottom: '4px' }}>
                    {topDay[0]}
                  </span>
                  <span style={{ fontSize: '12px', color: '#a0a0a0' }}>
                    Total de {topDay[1]} pedidos registrados este día de la semana.
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: '220px' }}>
                  <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>
                    Horario de mayor actividad
                  </span>
                  <span style={{ fontSize: '24px', fontWeight: 600, color: 'white', display: 'block', marginBottom: '4px' }}>
                    {topHour[0]}
                  </span>
                  <span style={{ fontSize: '12px', color: '#a0a0a0' }}>
                    Total de {topHour[1]} pedidos registrados en este rango de horas.
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 5. INVENTARIO Y GESTIÓN DE PRODUCTOS */}
        {tabActiva === 'inventario' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inventario de Productos</h2>
                <p style={{ fontSize: '12px', color: '#a0a0a0' }}>Controlá el stock disponible y agregá nuevas delicias al menú.</p>
              </div>
              <button
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
                  setMostrarFormProducto(true);
                }}
                style={{
                  background: 'var(--accent-gold)',
                  color: '#121212',
                  border: 'none',
                  borderRadius: '0px',
                  padding: '10px 18px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  textTransform: 'uppercase'
                }}
              >
                <span>+ Agregar Producto</span>
              </button>
            </div>

            {/* LISTADO DE PRODUCTOS */}
            <div style={{ background: '#161616', border: '1px solid #222', borderRadius: '0px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #222', color: '#888' }}>
                    <th style={{ padding: '16px 20px' }}>Imagen</th>
                    <th style={{ padding: '16px 20px' }}>Nombre</th>
                    <th style={{ padding: '16px 20px' }}>Categoría</th>
                    <th style={{ padding: '16px 20px' }}>Precio</th>
                    <th style={{ padding: '16px 20px' }}>Stock</th>
                    <th style={{ padding: '16px 20px' }}>Mínimo</th>
                    <th style={{ padding: '16px 20px', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#666' }}>
                        No hay productos registrados. Usá el botón de arriba o inicializá la base de datos más abajo.
                      </td>
                    </tr>
                  ) : (
                    productosList.map((prod) => {
                      const esBajoStock = prod.stock !== null && prod.stock <= (prod.stock_minimo ?? 0);
                      const esAgotado = prod.stock !== null && prod.stock <= 0;
                      
                      return (
                        <tr key={prod.id} style={{ borderBottom: '1px solid #222', transition: 'background 0.2s' }}>
                          <td style={{ padding: '12px 20px' }}>
                            <div style={{ position: 'relative', width: '40px', height: '40px', background: '#222', border: '1px solid #333' }}>
                              {prod.imagen_url && (
                                <img src={prod.imagen_url} alt={prod.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '12px 20px' }}>
                            <span style={{ fontWeight: 600, display: 'block', color: 'white' }}>{prod.nombre}</span>
                            <span style={{ fontSize: '11px', color: '#888', display: 'block', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {prod.descripcion}
                            </span>
                          </td>
                          <td style={{ padding: '12px 20px', color: '#a0a0a0' }}>{prod.categoria?.nombre || '-'}</td>
                          <td style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--accent-gold)' }}>
                            ${Number(prod.precio).toLocaleString('es-AR')}
                          </td>
                          <td style={{ padding: '12px 20px' }}>
                            {prod.stock === null ? (
                              <span style={{ color: '#888' }}>Ilimitado</span>
                            ) : esAgotado ? (
                              <span style={{ background: 'rgba(220, 38, 38, 0.15)', color: '#ff4d4d', padding: '3px 8px', fontWeight: 'bold', fontSize: '11px' }}>
                                AGOTADO (0)
                              </span>
                            ) : esBajoStock ? (
                              <span style={{ background: 'rgba(217, 119, 6, 0.15)', color: '#f59e0b', padding: '3px 8px', fontWeight: 'bold', fontSize: '11px' }}>
                                BAJO STOCK ({prod.stock})
                              </span>
                            ) : (
                              <span style={{ color: '#2b9348', fontWeight: 600 }}>{prod.stock} u.</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 20px', color: '#666' }}>{prod.stock === null ? '-' : `${prod.stock_minimo} u.`}</td>
                          <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => {
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
                                  setMostrarFormProducto(true);
                                }}
                                style={{
                                  background: 'transparent',
                                  border: '1px solid #444',
                                  color: '#ccc',
                                  padding: '5px 10px',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  textTransform: 'uppercase'
                                }}
                              >
                                Editar
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm(`¿Seguro que querés eliminar el producto "${prod.nombre}"?`)) {
                                    const res = await eliminarProducto(prod.id);
                                    if (res.success) {
                                      cargarDatosCompletos();
                                    } else {
                                      alert('Error al eliminar: ' + res.error);
                                    }
                                  }
                                }}
                                style={{
                                  background: 'transparent',
                                  border: '1px solid #ff4d4d',
                                  color: '#ff4d4d',
                                  padding: '5px 10px',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  textTransform: 'uppercase'
                                }}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* SEEDER DE EMERGENCIA */}
            <div style={{ marginTop: '24px', borderTop: '1px solid #222', paddingTop: '24px' }}>
              <div style={{ background: '#161616', border: '1px solid #222', borderRadius: '0px', padding: '24px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Inicialización del Sistema
                </h4>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px', lineHeight: '1.4' }}>
                  Si recién instalás la base de datos, podés recargar los productos iniciales de {BRAND_CONFIG.name} ({BRAND_CONFIG.subtitle}, Viennoiserie, Cafés, Salados).
                </p>
                <button
                  onClick={handleSeed}
                  disabled={seeding}
                  style={{
                    background: '#222',
                    border: '1px solid #333',
                    color: 'white',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  {seeding ? 'Cargando Mocks...' : 'Sembrar Catálogo Inicial'}
                </button>
                {seedingMsg && <p style={{ fontSize: '12px', color: 'var(--accent-gold)', marginTop: '8px' }}>{seedingMsg}</p>}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MODAL PARA IMPRIMIR TICKET */}
      {mesaTicketImprimir && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }} className="no-print-overlay">
          <div style={{
            background: 'white',
            color: 'black',
            borderRadius: '0px', // Bordes rectos
            padding: '24px',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column'
          }} className="ticket-printable-container">
            
            {/* TICKET MESA */}
            <div style={{
              border: '1px dashed #333',
              padding: '16px',
              fontFamily: 'monospace',
              fontSize: '13px',
              lineHeight: '1.4',
              color: '#000'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>{BRAND_CONFIG.ticketHeader}</h3>
                <p style={{ fontSize: '10px', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '1px', color: '#555' }}>{BRAND_CONFIG.subtitle}</p>
                <p style={{ fontSize: '10px', margin: '1px 0 0', color: '#555' }}>{BRAND_CONFIG.address}</p>
                <p style={{ margin: '8px 0 0', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '4px 0', fontWeight: 'bold' }}>
                  DETALLE DE CONSUMOS
                </p>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div><b>MESA:</b> {mesaTicketImprimir.numero}</div>
                <div><b>CLIENTE:</b> {mesaTicketImprimir.cliente_nombre || 'N/A'}</div>
                {mesaTicketImprimir.cliente_telefono && <div><b>TELÉFONO:</b> {mesaTicketImprimir.cliente_telefono}</div>}
                <div><b>FECHA:</b> {mesaTicketImprimir.ocupada_desde ? new Date(mesaTicketImprimir.ocupada_desde).toLocaleDateString('es-AR') : ''}</div>
                <div><b>HORA ENTRADA:</b> {mesaTicketImprimir.ocupada_desde ? new Date(mesaTicketImprimir.ocupada_desde).toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'}) : ''}</div>
              </div>

              <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '4px' }}>
                  <span>DESCRIPCIÓN</span>
                  <span>TOTAL</span>
                </div>
                {consumosConsolidados.map((item, idx) => (
                  <div key={idx} style={{ marginBottom: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{item.cantidad}x {item.nombre}</span>
                      <span>${(item.precioUnitario * item.cantidad).toLocaleString('es-AR')}</span>
                    </div>
                    {item.observaciones && (
                      <div style={{ fontSize: '11px', color: '#555', fontStyle: 'italic', paddingLeft: '10px' }}>
                        * {item.observaciones}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#666', paddingLeft: '10px' }}>
                      (${item.precioUnitario.toLocaleString('es-AR')} c/u)
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
                <span>TOTAL:</span>
                <span>${totalTicket.toLocaleString('es-AR')}</span>
              </div>

              <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '11px', color: '#555' }}>
                <p>{BRAND_CONFIG.ticketFooter}</p>
                <p style={{ marginTop: '4px' }}>Documento no válido como factura</p>
              </div>
            </div>

            {/* BOTONES ACCION */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }} className="no-print">
              <button
                onClick={() => setMesaTicketImprimir(null)}
                style={{
                  flex: 1,
                  background: '#eae6df',
                  border: 'none',
                  borderRadius: '0px',
                  padding: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#121212',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                style={{
                  flex: 2,
                  background: 'var(--accent-gold)',
                  border: 'none',
                  borderRadius: '0px',
                  padding: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#121212',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                <Printer size={16} />
                <span>Imprimir</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL PARA CREAR/EDITAR PRODUCTO */}
      {mostrarFormProducto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#161616',
            border: '1px solid #333',
            color: 'white',
            borderRadius: '0px',
            padding: '32px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '24px', letterSpacing: '0.5px', color: 'var(--accent-gold)' }}>
              {productoEditando ? `Editar Producto: ${productoEditando.nombre}` : 'Agregar Nuevo Producto'}
            </h3>

            <form onSubmit={handleProductoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Nombre *</label>
                <input
                  type="text"
                  required
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  style={{ background: '#0d0d0d', border: '1px solid #333', color: 'white', padding: '10px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Descripción</label>
                <textarea
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  style={{ background: '#0d0d0d', border: '1px solid #333', color: 'white', padding: '10px', fontSize: '13px', minHeight: '60px', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Precio ($) *</label>
                  <input
                    type="number"
                    required
                    value={formPrecio}
                    onChange={(e) => setFormPrecio(e.target.value)}
                    style={{ background: '#0d0d0d', border: '1px solid #333', color: 'white', padding: '10px', fontSize: '13px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Categoría *</label>
                  <select
                    value={formCategoriaId}
                    onChange={(e) => setFormCategoriaId(e.target.value)}
                    style={{ background: '#0d0d0d', border: '1px solid #333', color: 'white', padding: '10px', fontSize: '13px' }}
                  >
                    <option value="">Seleccionar...</option>
                    {categoriasList.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Imagen URL (Unsplash o Link)</label>
                <input
                  type="text"
                  value={formImagenUrl}
                  onChange={(e) => setFormImagenUrl(e.target.value)}
                  placeholder="Dejar vacío para usar predeterminada"
                  style={{ background: '#0d0d0d', border: '1px solid #333', color: 'white', padding: '10px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Stock (Vacío = Ilimitado)</label>
                  <input
                    type="number"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    placeholder="Ej: 20"
                    style={{ background: '#0d0d0d', border: '1px solid #333', color: 'white', padding: '10px', fontSize: '13px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Stock Mínimo (Alerta)</label>
                  <input
                    type="number"
                    value={formStockMinimo}
                    onChange={(e) => setFormStockMinimo(e.target.value)}
                    style={{ background: '#0d0d0d', border: '1px solid #333', color: 'white', padding: '10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formEsCafe}
                    onChange={(e) => setFormEsCafe(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>¿Es Café / Infusión?</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formDisponible}
                    onChange={(e) => setFormDisponible(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Disponible para Venta</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarFormProducto(false);
                    setProductoEditando(null);
                  }}
                  style={{
                    flex: 1,
                    background: '#222',
                    border: '1px solid #333',
                    color: 'white',
                    padding: '12px',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2,
                    background: 'var(--accent-gold)',
                    color: '#121212',
                    border: 'none',
                    padding: '12px',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  {productoEditando ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA AGREGAR CONSUMO MANUAL (DESDE CAJA) */}
      {mostrarModalConsumoManual && mesaConsumoManual && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#161616',
            border: '1px solid #333',
            color: 'white',
            borderRadius: '0px',
            padding: '32px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px', color: 'var(--accent-gold)' }}>
              Mesa {mesaConsumoManual.numero} - Agregar Consumo Manual
            </h3>
            <p style={{ fontSize: '12px', color: '#a0a0a0', marginBottom: '24px' }}>
              Registrá consumos directamente para clientes en la mesa.
            </p>

            {/* FORMULARIO AGREGAR ÍTEM TEMPORAL */}
            <div style={{ background: '#0d0d0d', border: '1px solid #222', padding: '16px', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 600, color: '#888', marginBottom: '12px' }}>
                Seleccionar Producto
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 2, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', color: '#666' }}>Producto</label>
                    <select
                      value={manualProductoSeleccionadoId}
                      onChange={(e) => setManualProductoSeleccionadoId(e.target.value)}
                      style={{ background: '#161616', border: '1px solid #333', color: 'white', padding: '8px', fontSize: '13px' }}
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
                  
                  <div style={{ flex: 1, minWidth: '80px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', color: '#666' }}>Cantidad</label>
                    <input
                      type="number"
                      min={1}
                      value={manualCantidad}
                      onChange={(e) => setManualCantidad(Math.max(1, Number(e.target.value)))}
                      style={{ background: '#161616', border: '1px solid #333', color: 'white', padding: '8px', fontSize: '13px', textAlign: 'center' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', color: '#666' }}>Notas / Observaciones (Opcional)</label>
                  <input
                    type="text"
                    value={manualObservaciones}
                    onChange={(e) => setManualObservaciones(e.target.value)}
                    placeholder="Ej: Con edulcorante, bien caliente"
                    style={{ background: '#161616', border: '1px solid #333', color: 'white', padding: '8px', fontSize: '13px' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!manualProductoSeleccionadoId) {
                      alert('Seleccioná un producto.');
                      return;
                    }
                    const prod = productosList.find(p => p.id === Number(manualProductoSeleccionadoId));
                    if (!prod) return;

                    // Validar stock local antes de agregar a la lista temporal
                    if (prod.stock !== null && prod.stock < manualCantidad) {
                      alert(`No hay stock suficiente para ${prod.nombre}. Disponible: ${prod.stock} unidades.`);
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
                  }}
                  style={{
                    background: '#222',
                    border: '1px solid #333',
                    color: 'white',
                    padding: '8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    marginTop: '4px'
                  }}
                >
                  Agregar a la Lista
                </button>
              </div>
            </div>

            {/* LISTA TEMPORAL DE CONSUMOS A AGREGAR */}
            <div>
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 600, color: '#888', marginBottom: '10px' }}>
                Resumen de Consumo a Cargar
              </h4>
              
              {itemsConsumoManual.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#555', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>
                  Aún no agregaste productos a la lista.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                  {itemsConsumoManual.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderBottom: '1px solid #222', paddingBottom: '6px' }}>
                      <div>
                        <b>{item.cantidad}x {item.producto.nombre}</b>
                        {item.observaciones && <span style={{ display: 'block', fontSize: '11px', color: 'var(--accent-gold)', fontStyle: 'italic' }}>({item.observaciones})</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span>${(item.producto.precio * item.cantidad).toLocaleString('es-AR')}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setItemsConsumoManual(prev => prev.filter((_, i) => i !== idx));
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '11px' }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600, paddingTop: '10px', color: 'white' }}>
                    <span>Total Consumo:</span>
                    <span style={{ color: 'var(--accent-gold)' }}>
                      ${itemsConsumoManual.reduce((sum, item) => sum + (item.producto.precio * item.cantidad), 0).toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* CONTROL DE ENTREGA / ENVÍO A COCINA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #222', paddingTop: '16px', marginTop: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={manualEnviarACocina}
                  onChange={(e) => setManualEnviarACocina(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span>Enviar comanda a la Cocina (Estado: Pendiente)</span>
              </label>
              <span style={{ fontSize: '11px', color: '#666', marginTop: '-6px' }}>
                * Si está desactivado, el pedido se cargará directamente a la mesa como ya entregado (estado: Servido).
              </span>
            </div>

            {/* BOTONES DE CONFIRMACIÓN */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => {
                  setMostrarModalConsumoManual(false);
                  setMesaConsumoManual(null);
                  setItemsConsumoManual([]);
                }}
                style={{
                  flex: 1,
                  background: '#222',
                  border: '1px solid #333',
                  color: 'white',
                  padding: '12px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={itemsConsumoManual.length === 0}
                onClick={handleConfirmarConsumoManual}
                style={{
                  flex: 2,
                  background: 'var(--accent-gold)',
                  color: '#121212',
                  border: 'none',
                  padding: '12px',
                  cursor: itemsConsumoManual.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: itemsConsumoManual.length === 0 ? 0.5 : 1,
                  textTransform: 'uppercase',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                Confirmar Consumo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ESTILOS IMPRIMIBLES Y EXTRAS */}
      <style jsx global>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(197, 168, 128, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(197, 168, 128, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(197, 168, 128, 0);
          }
        }

        /* Responsive Admin Adjustments */
        .admin-nav-scroll::-webkit-scrollbar {
          display: none !important;
        }

        @media (max-width: 1024px) {
          .admin-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
            padding: 16px 20px !important;
          }
          .admin-header-controls {
            width: 100% !important;
            justify-content: flex-start !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          .admin-dashboard-page main {
            padding: 16px !important;
          }
        }

        @media (max-width: 640px) {
          .admin-header-controls {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
            width: 100% !important;
          }
          .admin-header-controls button {
            width: 100% !important;
            box-sizing: border-box !important;
          }
          /* Asegurar que el botón de cerrar sesión ocupe ancho completo */
          .admin-header-controls button:last-child {
            grid-column: span 2 !important;
          }
          .admin-header-controls > div {
            padding: 8px !important;
            justify-content: center !important;
          }
        }
        
        @media print {
          .no-print, header, nav, button, .no-print-overlay button {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .admin-dashboard-page {
            background: white !important;
            padding: 0 !important;
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
            border-radius: 0px !important;
          }
          .no-print-overlay {
            position: absolute !important;
            background: none !important;
            padding: 0 !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            display: block !important;
          }
          .ticket-printable-container {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            border-radius: 0px !important;
          }
        }
      `}</style>
    </div>
  );
}
