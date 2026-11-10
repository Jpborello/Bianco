'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Producto, PRODUCTOS_MOCK, CATEGORIAS } from '../../../lib/mockData';
import { getProductos, getCategorias, getMesas, crearPedido, crearSolicitud, ocuparMesa, DbTable, DbOrder } from '../../../lib/dbActions';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import { BRAND_CONFIG } from '../../../lib/brandConfig';
import {
  ShoppingBag,
  ArrowRight,
  Bell,
  Receipt,
  User,
  Phone,
  Loader2,
  Utensils,
} from 'lucide-react';
import { Badge, Button, useConfirm, useToast } from '../../../components/ui';
import {
  CategoryNav,
  MenuSearchBar,
  NoResultsState,
  NotesModalShell,
  ProductCard,
  ProductGridSkeleton,
} from '../../../components/menu';

export default function MesaClientePage() {
  const params = useParams();
  const mesaNumero = Number(params?.id);
  const toast = useToast();
  const confirmDialog = useConfirm();

  // Datos del Cliente y Mesa
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [registroCompletado, setRegistroCompletado] = useState(false);
  const [mesaDb, setMesaDb] = useState<DbTable | null>(null);

  // Estados de carga y datos de carta
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // Estado del Carrito
  const [carrito, setCarrito] = useState<{ producto: Producto; cantidad: number; nota?: string }[]>([]);
  const [verCarrito, setVerCarrito] = useState(false);
  const [notaTemporal, setNotaTemporal] = useState('');
  const [productoConNotaId, setProductoConNotaId] = useState<number | null>(null);

  // Notificaciones locales de llamado
  const [mozoLlamado, setMozoLlamado] = useState(false);
  const [cuentaSolicitada, setCuentaSolicitada] = useState(false);
  const [procesandoSolicitud, setProcesandoSolicitud] = useState(false);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [pedidosSesion, setPedidosSesion] = useState<DbOrder[]>([]);

  // Cargar datos del localStorage y Supabase
  useEffect(() => {
    // 1. Cargar datos del cliente guardados en la sesión del navegador
    let localNombre = '';
    let localTelefono = '';
    try {
      localNombre = localStorage.getItem(`${BRAND_CONFIG.storagePrefix}_nombre`) || '';
      localTelefono = localStorage.getItem(`${BRAND_CONFIG.storagePrefix}_telefono`) || '';

      if (localNombre && localTelefono) {
        setNombreCliente(localNombre);
        setTelefonoCliente(localTelefono);
        setRegistroCompletado(true);
      }
    } catch (err) {
      console.warn('LocalStorage no disponible al cargar:', err);
    }

    async function cargarMesaYMenu() {
      try {
        // Cargar mesas y encontrar la mesa correspondiente a esta URL
        const dbTables = await getMesas();
        const foundMesa = dbTables.find(t => t.numero === mesaNumero);
        if (foundMesa) {
          setMesaDb(foundMesa);

          // Si el cliente ya está registrado en local pero la mesa en la DB figura libre, la ocupamos automáticamente
          if (localNombre && localTelefono && foundMesa.estado === 'libre') {
            await ocuparMesa(foundMesa.id, localNombre, localTelefono);
            setMesaDb({
              ...foundMesa,
              estado: 'ocupada',
              cliente_nombre: localNombre,
              cliente_telefono: localTelefono,
              ocupada_desde: new Date().toISOString()
            });
          }
        } else {
          // Fallback en caso de que no esté en la base de datos (ej: desarrollo local inicial)
          setMesaDb({ id: mesaNumero, numero: mesaNumero, estado: 'libre', cliente_nombre: null, cliente_telefono: null, ocupada_desde: null });
        }

        // Cargar categorías y productos
        const dbProducts = await getProductos();
        const dbCats = await getCategorias();

        if (dbProducts && dbProducts.length > 0) {
          const mappedProds: Producto[] = dbProducts.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            descripcion: p.descripcion || '',
            precio: Number(p.precio),
            imagenUrl: p.imagen_url || '/productos/ceviche-clasico.jpg',
            categoria: p.categoria?.nombre || 'General',
            esCafe: p.es_cafe,
            stock: p.stock,
            stockMinimo: p.stock_minimo
          }));
          setProductos(mappedProds);
        } else {
          setProductos(PRODUCTOS_MOCK);
        }

        if (dbCats && dbCats.length > 0) {
          setCategorias(dbCats.map((c) => c.nombre));
        } else {
          setCategorias(CATEGORIAS);
        }
      } catch (err) {
        console.error('Error cargando los datos de la mesa:', err);
        setProductos(PRODUCTOS_MOCK);
        setCategorias(CATEGORIAS);
        setMesaDb({ id: mesaNumero, numero: mesaNumero, estado: 'libre', cliente_nombre: null, cliente_telefono: null, ocupada_desde: null });
      } finally {
        setCargando(false);
      }
    }

    if (mesaNumero) {
      cargarMesaYMenu();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesaNumero]);

  // Cargar pedidos históricos de la sesión actual de la mesa
  const cargarPedidosSesion = async (mesaId: number, ocupadaDesde: string | null) => {
    if (!ocupadaDesde) {
      setPedidosSesion([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*, detalles:detalles_pedido(*, producto:productos(*))')
        .eq('mesa_id', mesaId)
        .neq('estado', 'cancelado')
        .gte('created_at', ocupadaDesde)
        .order('id', { ascending: false });

      if (!error && data) {
        setPedidosSesion(data as unknown as DbOrder[]);
      }
    } catch (err) {
      console.error('Error al cargar consumos de sesión:', err);
    }
  };

  // Efecto para escuchar pedidos de esta mesa por Supabase Realtime y cargarlos
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (mesaDb?.id) {
      cargarPedidosSesion(mesaDb.id, mesaDb.ocupada_desde);

      const channel = supabase
        .channel(`mesa-${mesaDb.id}-pedidos-realtime`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'pedidos',
          filter: `mesa_id=eq.${mesaDb.id}`
        }, () => {
          cargarPedidosSesion(mesaDb.id, mesaDb.ocupada_desde);
        })
        .subscribe();

      const channelDetalles = supabase
        .channel(`mesa-${mesaDb.id}-detalles-realtime`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'detalles_pedido'
        }, () => {
          cargarPedidosSesion(mesaDb.id, mesaDb.ocupada_desde);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(channelDetalles);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesaDb?.id, mesaDb?.ocupada_desde]);

  // Efecto para escuchar cambios en la mesa por Supabase Realtime (liberación de mesa)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (mesaDb?.id) {
      const channelMesa = supabase
        .channel(`mesa-${mesaDb.id}-status-realtime`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'mesas',
          filter: `id=eq.${mesaDb.id}`
        }, (payload) => {
          const updatedMesa = payload.new as DbTable;
          setMesaDb(updatedMesa);

          // Si el estado cambia a libre, se limpia la sesión del cliente
          if (updatedMesa.estado === 'libre') {
            setRegistroCompletado(false);
            setNombreCliente('');
            setTelefonoCliente('');
            setCarrito([]);
            setCuentaSolicitada(false);
            setMozoLlamado(false);
            try {
              localStorage.removeItem(`${BRAND_CONFIG.storagePrefix}_nombre`);
              localStorage.removeItem(`${BRAND_CONFIG.storagePrefix}_telefono`);
            } catch (err) {
              console.warn('Error al limpiar localStorage de mesa:', err);
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channelMesa);
      };
    }
  }, [mesaDb?.id]);

  // Efecto para escuchar cambios en los productos por Supabase Realtime (cambios de stock en vivo)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channelProds = supabase
      .channel('mesa-realtime-productos')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'productos'
      }, () => {
        // Recargar menú para reflejar los nuevos stocks
        if (mesaNumero) {
          async function recargarMenu() {
            try {
              const dbProducts = await getProductos();
              if (dbProducts && dbProducts.length > 0) {
                const mappedProds: Producto[] = dbProducts.map((p) => ({
                  id: p.id,
                  nombre: p.nombre,
                  descripcion: p.descripcion || '',
                  precio: Number(p.precio),
                  imagenUrl: p.imagen_url || '/productos/ceviche-clasico.jpg',
                  categoria: p.categoria?.nombre || 'General',
                  esCafe: p.es_cafe,
                  stock: p.stock,
                  stockMinimo: p.stock_minimo
                }));
                setProductos(mappedProds);
              }
            } catch (err) {
              console.error('Error al recargar productos por realtime:', err);
            }
          }
          recargarMenu();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelProds);
    };
  }, [mesaNumero]);

  // Completar el registro inicial del cliente
  const handleRegistroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCliente.trim() || !telefonoCliente.trim()) {
      toast.show('Por favor completá tu nombre y celular.', 'warning');
      return;
    }
    try {
      localStorage.setItem(`${BRAND_CONFIG.storagePrefix}_nombre`, nombreCliente);
      localStorage.setItem(`${BRAND_CONFIG.storagePrefix}_telefono`, telefonoCliente);
    } catch (err) {
      console.warn('LocalStorage no disponible al guardar:', err);
    }

    if (mesaDb) {
      // Ocupar mesa en Supabase SOLO si está libre actualmente en base de datos.
      if (mesaDb.estado === 'libre') {
        await ocuparMesa(mesaDb.id, nombreCliente, telefonoCliente);
        setMesaDb(prev => prev ? {
          ...prev,
          estado: 'ocupada',
          cliente_nombre: nombreCliente,
          cliente_telefono: telefonoCliente,
          ocupada_desde: new Date().toISOString()
        } : null);
      } else {
        console.log("Unido a la sesión compartida de la mesa.");
      }
    }

    setRegistroCompletado(true);
  };

  // Llamar al Mozo
  const handleLlamarMozo = async () => {
    if (!mesaDb) return;
    setProcesandoSolicitud(true);
    try {
      const { error } = await crearSolicitud(mesaDb.id, 'llamar_mozo');
      if (error) throw new Error(error);

      setMozoLlamado(true);
      // Ocultar mensaje de éxito después de unos segundos
      setTimeout(() => setMozoLlamado(false), 8000);
    } catch (err) {
      toast.show('Error al llamar al mozo: ' + (err as Error).message, 'error');
    } finally {
      setProcesandoSolicitud(false);
    }
  };

  // Pedir la Cuenta
  const handlePedirCuenta = async () => {
    if (!mesaDb) return;
    const ok = await confirmDialog({
      title: '¿Pedir la cuenta?',
      description: 'El mozo se acercará con el ticket de tu mesa.',
      confirmLabel: 'Sí, pedir cuenta',
    });
    if (!ok) return;

    setProcesandoSolicitud(true);
    try {
      const { error } = await crearSolicitud(mesaDb.id, 'pedir_cuenta');
      if (error) throw new Error(error);

      setCuentaSolicitada(true);
      setTimeout(() => setCuentaSolicitada(false), 8000);
    } catch (err) {
      toast.show('Error al pedir la cuenta: ' + (err as Error).message, 'error');
    } finally {
      setProcesandoSolicitud(false);
    }
  };

  const agregarAlCarrito = (producto: Producto, nota?: string) => {
    setCarrito((prev) => {
      const existe = prev.find((item) => item.producto.id === producto.id && item.nota === nota);
      if (existe) {
        return prev.map((item) =>
          item.producto.id === producto.id && item.nota === nota
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { producto, cantidad: 1, nota }];
    });
  };

  const eliminarDelCarrito = (productoId: number, nota?: string) => {
    setCarrito((prev) =>
      prev
        .map((item) => {
          if (item.producto.id === productoId && item.nota === nota) {
            return { ...item, cantidad: item.cantidad - 1 };
          }
          return item;
        })
        .filter((item) => item.cantidad > 0)
    );
  };

  const enviarPedidoMesa = async () => {
    if (!mesaDb) return;
    setEnviandoPedido(true);

    const orderItems = carrito.map((item) => ({
      productoId: item.producto.id,
      cantidad: item.cantidad,
      precioUnitario: item.producto.precio,
      observaciones: item.nota
    }));

    try {
      const { error } = await crearPedido({
        tipo: 'mesa',
        mesa_id: mesaDb.id,
        nombre_cliente: nombreCliente,
        telefono: telefonoCliente,
        total: totalCarrito,
        items: orderItems
      });

      if (error) throw new Error(error);

      toast.show(`¡Pedido enviado a cocina! Tus delicias llegarán a la Mesa ${mesaNumero}.`, 'success');
      setCarrito([]);
      setVerCarrito(false);
    } catch (err) {
      toast.show('Error al enviar el pedido: ' + (err as Error).message, 'error');
    } finally {
      setEnviandoPedido(false);
    }
  };

  const handleEditarDatos = async () => {
    const ok = await confirmDialog({
      title: '¿Cambiar de nombre o cerrar sesión?',
      description: 'Vas a tener que volver a completar tus datos para seguir pidiendo desde esta mesa.',
    });
    if (!ok) return;
    try {
      localStorage.removeItem(`${BRAND_CONFIG.storagePrefix}_nombre`);
      localStorage.removeItem(`${BRAND_CONFIG.storagePrefix}_telefono`);
    } catch (err) {
      console.warn('Error al limpiar localStorage de mesa:', err);
    }
    setRegistroCompletado(false);
  };

  const productosFiltrados = productos.filter((p) => {
    const coincideCategoria = categoriaActiva === 'Todos' || p.categoria === categoriaActiva;
    const coincideBusqueda = busqueda.trim() === '' ||
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(busqueda.toLowerCase());
    return coincideCategoria && coincideBusqueda;
  });

  const getItemCantidad = (productoId: number) => {
    return carrito.filter(item => item.producto.id === productoId).reduce((sum, item) => sum + item.cantidad, 0);
  };

  const totalCarrito = carrito.reduce((sum, item) => sum + item.producto.precio * item.cantidad, 0);
  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const productoEnNota = productos.find((p) => p.id === productoConNotaId);

  // Si la mesa es inválida o no hay número
  if (!mesaNumero || isNaN(mesaNumero)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h2 className="text-xl font-semibold text-danger">Mesa no válida</h2>
        <p className="mt-3 text-sm text-ink-soft">Por favor, escaneá el código QR correcto en tu mesa.</p>
      </div>
    );
  }

  // PANTALLA DE REGISTRO INICIAL (Si no se ha identificado)
  if (!registroCompletado) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gold-light to-cream/40 px-6">
        <div className="w-full max-w-sm rounded-3xl border border-line bg-card p-6 text-center shadow-medium sm:p-8">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            {BRAND_CONFIG.fullName}
          </span>
          <h2 className="mb-1.5 font-serif text-2xl font-normal">Mesa {mesaNumero}</h2>
          <p className="mb-6 text-sm text-ink-soft">
            Para ver la carta y realizar pedidos, por favor completá tus datos de mesa.
          </p>

          <form onSubmit={handleRegistroSubmit} className="flex flex-col gap-4 text-left">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-soft">Tu Nombre</span>
              <div className="relative">
                <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="text"
                  required
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  placeholder="Ej: Marcos García"
                  className="w-full rounded-lg border border-line bg-cream py-3 pl-10 pr-3 text-sm font-sans outline-none"
                />
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-soft">Tu Celular</span>
              <div className="relative">
                <Phone size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="tel"
                  required
                  inputMode="tel"
                  value={telefonoCliente}
                  onChange={(e) => setTelefonoCliente(e.target.value)}
                  placeholder="Ej: 11 1234 5678"
                  className="w-full rounded-lg border border-line bg-cream py-3 pl-10 pr-3 text-sm font-sans outline-none"
                />
              </div>
              <span className="text-[11px] leading-snug text-ink-soft">
                * Lo usamos para identificar tus pedidos en mesa y futuros sorteos exclusivos.
              </span>
            </label>

            <Button type="submit" variant="primary" size="lg" icon={Utensils} iconPosition="right" className="mt-1">
              Ver la Carta
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Consolidar todos los ítems de los pedidos de la sesión para mostrar al cliente
  const detallesPedidosSesion = pedidosSesion.flatMap(p => p.detalles || []);

  const consumosConsolidadosCliente: {
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    estado: string;
    observaciones?: string;
  }[] = [];

  detallesPedidosSesion.forEach(det => {
    const prodNombre = det.producto?.nombre || 'Producto';
    const obs = det.observaciones || '';
    const parentOrder = pedidosSesion.find(p => p.id === det.pedido_id);
    const estadoItem = parentOrder ? parentOrder.estado : 'pendiente';

    const exist = consumosConsolidadosCliente.find(i =>
      i.nombre === prodNombre &&
      (i.observaciones || '') === obs &&
      i.estado === estadoItem
    );

    if (exist) {
      exist.cantidad += det.cantidad;
    } else {
      consumosConsolidadosCliente.push({
        nombre: prodNombre,
        cantidad: det.cantidad,
        precioUnitario: Number(det.precio_unitario),
        estado: estadoItem,
        observaciones: det.observaciones || undefined
      });
    }
  });

  const totalConsumidoMesa = consumosConsolidadosCliente.reduce((sum, item) => sum + (item.precioUnitario * item.cantidad), 0);

  const estadoBadgeTone: Record<string, 'neutral' | 'warning' | 'success' | 'gold'> = {
    pendiente: 'neutral',
    preparando: 'warning',
    listo: 'success',
  };
  const estadoLabel: Record<string, string> = {
    pendiente: 'Recibido',
    preparando: 'Preparando',
    listo: 'Listo',
  };

  // PANTALLA PRINCIPAL DE CARTA DE MESA
  return (
    <div className="relative flex min-h-screen flex-col bg-cream">
      {/* HEADER DE MESA */}
      <header className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-line bg-cream/85 px-4 py-2.5 backdrop-blur-md sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-base font-bold text-white shadow-sm sm:h-10 sm:w-10">
            {mesaNumero}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold uppercase tracking-wide text-ink">Mesa {mesaNumero}</h1>
            <p className="truncate text-[11px] text-ink-soft">Cliente: {nombreCliente.split(' ')[0]}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleEditarDatos}
            title="Editar mis datos"
            aria-label="Editar mis datos o cerrar sesión de la mesa"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:bg-black/[0.03] cursor-pointer"
          >
            <User size={16} />
          </button>

          <Button
            variant="primary"
            size="sm"
            icon={ShoppingBag}
            className="rounded-full"
            aria-label={`Ver mi pedido de la mesa${totalItems > 0 ? ` (${totalItems} productos)` : ''}`}
            onClick={() => setVerCarrito(true)}
          >
            <span className="hidden sm:inline">Mesa</span>
            {totalItems > 0 && (
              <span className="ml-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-gold text-[10px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* ALERTAS DE SOLICITUDES EN CURSO */}
      {mozoLlamado && (
        <div className="flex items-center justify-center gap-2 border-b border-gold bg-gold-light px-4 py-3 text-center text-sm font-medium text-ink">
          <Bell size={14} className="animate-bounce text-gold" />
          <span>¡Llamado al mozo registrado! En breve se acercarán a tu mesa.</span>
        </div>
      )}

      {cuentaSolicitada && (
        <div className="flex items-center justify-center gap-2 border-b border-success/30 bg-success-bg px-4 py-3 text-center text-sm font-medium text-success">
          <Receipt size={14} />
          <span>¡Cuenta solicitada! Total: <b>${totalConsumidoMesa.toLocaleString('es-AR')}</b></span>
        </div>
      )}

      {/* QUICK ACTIONS BAR */}
      <section className="flex gap-3 px-4 pb-2 pt-4 sm:px-5">
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          icon={procesandoSolicitud ? Loader2 : Bell}
          loading={procesandoSolicitud}
          onClick={handleLlamarMozo}
          className="shadow-medium"
        >
          Llamar al Mozo
        </Button>
        <Button
          variant="success"
          size="lg"
          fullWidth
          icon={Receipt}
          loading={procesandoSolicitud}
          onClick={handlePedirCuenta}
        >
          Pedir Cuenta
        </Button>
      </section>

      {/* DETALLE DE CONSUMO EN MESA */}
      {consumosConsolidadosCliente.length > 0 && (
        <section className="px-4 pb-2 sm:px-5">
          <div className="rounded-xl border border-line bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink">
                <Utensils size={14} className="text-gold" />
                <span>Detalle de Consumos</span>
              </h3>
              <span className="text-[11px] text-ink-soft">En tiempo real</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {consumosConsolidadosCliente.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between gap-2 text-sm">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-ink">{item.cantidad}x {item.nombre}</span>
                      <Badge tone={estadoBadgeTone[item.estado] ?? 'success'}>
                        {estadoLabel[item.estado] ?? 'Servido'}
                      </Badge>
                    </div>
                    {item.observaciones && (
                      <span className="mt-0.5 block text-xs italic text-gold">Nota: {item.observaciones}</span>
                    )}
                  </div>
                  <span className="font-semibold text-ink-soft">
                    ${(item.precioUnitario * item.cantidad).toLocaleString('es-AR')}
                  </span>
                </div>
              ))}

              <div className="mt-1 flex justify-between border-t border-dashed border-line pt-2.5 text-sm font-semibold">
                <span>Total a pagar:</span>
                <span className="text-gold">${totalConsumidoMesa.toLocaleString('es-AR')}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* BUSCADOR */}
      <div className="px-4 pb-2 pt-2 sm:px-5">
        <MenuSearchBar value={busqueda} onChange={setBusqueda} placeholder="Buscar plato, trago o bebida..." />
      </div>

      {/* CATEGORÍAS */}
      <div className="sticky top-[57px] z-40 bg-cream pb-3">
        <CategoryNav categorias={categorias} activa={categoriaActiva} onChange={setCategoriaActiva} />
      </div>

      {/* MENÚ DE PRODUCTOS */}
      <main className="flex-1 px-4 pb-28 sm:px-5">
        {cargando ? (
          <ProductGridSkeleton count={4} />
        ) : productosFiltrados.length === 0 ? (
          <NoResultsState query={busqueda || categoriaActiva} />
        ) : (
          <div className="product-grid">
            {productosFiltrados.map((prod, index) => (
              <ProductCard
                key={prod.id}
                producto={prod}
                cantidadEnCarrito={getItemCantidad(prod.id)}
                onAdd={() => agregarAlCarrito(prod)}
                onRemove={() => eliminarDelCarrito(prod.id)}
                onOpenNota={() => {
                  setProductoConNotaId(prod.id);
                  setNotaTemporal('');
                }}
                priority={index < 2}
              />
            ))}
          </div>
        )}
      </main>

      {/* BARRA FLOTANTE DE CARRITO DE MESA */}
      {totalItems > 0 && !verCarrito && (
        <div className="animate-slide-up fixed inset-x-0 bottom-4 z-80 flex justify-center px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <button
            onClick={() => setVerCarrito(true)}
            className="flex w-full max-w-md items-center justify-between gap-3 rounded-full bg-ink px-5 py-3.5 text-cream shadow-float cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold text-[13px] font-bold text-white">
                {totalItems}
              </span>
              <div className="text-left">
                <p className="text-sm font-semibold leading-tight">Enviar Pedido a Cocina</p>
                <p className="text-[11px] text-cream/70">Mesa {mesaNumero} · {carrito.length} ítems en marcha</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-gold">${totalCarrito.toLocaleString('es-AR')}</span>
              <ArrowRight size={18} />
            </div>
          </button>
        </div>
      )}

      {/* POPUP DE NOTAS */}
      <NotesModalShell
        open={productoConNotaId !== null}
        onClose={() => setProductoConNotaId(null)}
        title="Notas de preparación"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setProductoConNotaId(null)}>
              Cancelar
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                if (productoEnNota) agregarAlCarrito(productoEnNota, notaTemporal);
                setProductoConNotaId(null);
              }}
            >
              Confirmar
            </Button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-ink-soft">Ej: Cortado tibio, sin azúcar, edulcorante, etc.</p>
        <textarea
          value={notaTemporal}
          onChange={(e) => setNotaTemporal(e.target.value)}
          placeholder="Ej: Leche descremada, sin cacao..."
          rows={3}
          className="w-full resize-none rounded-lg border border-line p-3 text-sm outline-none font-sans"
        />
      </NotesModalShell>

      {/* DRAWER DEL CARRITO / DETALLE PEDIDO DE MESA */}
      <NotesModalShell
        open={verCarrito}
        onClose={() => setVerCarrito(false)}
        variant="drawer"
        title={`Mi Pedido - Mesa ${mesaNumero}`}
        subtitle={`Cliente: ${nombreCliente}`}
        footer={
          carrito.length > 0 && (
            <div>
              <div className="mb-4 flex justify-between">
                <span className="text-sm text-ink-soft">Total del Pedido</span>
                <span className="text-xl font-bold text-ink">${totalCarrito.toLocaleString('es-AR')}</span>
              </div>
              <Button
                variant="primary"
                fullWidth
                size="lg"
                loading={enviandoPedido}
                icon={ArrowRight}
                iconPosition="right"
                onClick={enviarPedidoMesa}
              >
                {enviandoPedido ? 'Enviando a Cocina...' : 'Enviar a Cocina'}
              </Button>
            </div>
          )
        }
      >
        <div className="flex flex-col gap-3.5">
          {carrito.length === 0 ? (
            <div className="py-10 text-center text-ink-soft">
              <p>No tenés nada seleccionado.</p>
              <p className="mt-1 text-sm">Agregá cosas ricas de la carta.</p>
            </div>
          ) : (
            carrito.map((item, idx) => (
              <div key={idx} className="flex gap-2.5 border-b border-line pb-3">
                <div className="relative h-[50px] w-[50px] shrink-0 overflow-hidden rounded-md">
                  <Image src={item.producto.imagenUrl} alt={item.producto.nombre} fill sizes="50px" style={{ objectFit: 'cover' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <h4 className="text-sm font-semibold text-ink">{item.producto.nombre}</h4>
                    <span className="shrink-0 text-sm font-semibold">${(item.producto.precio * item.cantidad).toLocaleString('es-AR')}</span>
                  </div>
                  {item.nota && <p className="mt-0.5 text-xs italic text-gold">Nota: {item.nota}</p>}
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-xs text-ink-soft">${item.producto.precio.toLocaleString('es-AR')} c/u</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => eliminarDelCarrito(item.producto.id, item.nota)}
                        aria-label={`Quitar uno de ${item.producto.nombre}`}
                        className="flex h-5 w-5 items-center justify-center rounded-full border border-line text-xs cursor-pointer"
                      >
                        −
                      </button>
                      <span className="text-sm font-semibold">{item.cantidad}</span>
                      <button
                        onClick={() => agregarAlCarrito(item.producto, item.nota)}
                        aria-label={`Agregar uno más de ${item.producto.nombre}`}
                        className="flex h-5 w-5 items-center justify-center rounded-full border border-line text-xs cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </NotesModalShell>
    </div>
  );
}
