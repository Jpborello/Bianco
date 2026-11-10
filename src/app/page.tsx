'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CATEGORIAS, PRODUCTOS_MOCK, Producto } from '../lib/mockData';
import { getProductos, getCategorias, crearPedido } from '../lib/dbActions';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  ShoppingBag,
  ArrowRight,
  Check,
  MapPin,
  Phone,
  User,
  Sparkles,
  Settings,
} from 'lucide-react';
import { BRAND_CONFIG } from '../lib/brandConfig';
import { Button, useToast } from '../components/ui';
import {
  CategoryNav,
  MenuSearchBar,
  NoResultsState,
  NotesModalShell,
  ProductCard,
  ProductGridSkeleton,
} from '../components/menu';

export default function Home() {
  const toast = useToast();

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

  // Paso Checkout & Datos Delivery
  const [pasoCheckout, setPasoCheckout] = useState<'carrito' | 'datos'>('carrito');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [enviandoPedido, setEnviandoPedido] = useState(false);

  // Cargar datos desde Supabase e iniciar suscripción Realtime
  useEffect(() => {
    async function cargarDatos() {
      try {
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
        console.error('Error cargando base de datos, usando mocks:', err);
        setProductos(PRODUCTOS_MOCK);
        setCategorias(CATEGORIAS);
      } finally {
        setCargando(false);
      }
    }

    cargarDatos();

    if (!isSupabaseConfigured) return;

    // Escuchar actualizaciones de productos (cambios de stock en tiempo real)
    const channelProds = supabase
      .channel('home-realtime-productos')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'productos'
      }, () => {
        cargarDatos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelProds);
    };
  }, []);

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

  const enviarPedidoDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !telefono.trim() || !direccion.trim()) {
      toast.show('Por favor, completá todos los datos de envío.', 'warning');
      return;
    }

    setEnviandoPedido(true);
    const orderItems = carrito.map((item) => ({
      productoId: item.producto.id,
      cantidad: item.cantidad,
      precioUnitario: item.producto.precio,
      observaciones: item.nota
    }));

    try {
      const { error } = await crearPedido({
        tipo: 'delivery',
        nombre_cliente: nombre,
        telefono: telefono,
        direccion: direccion,
        total: totalCarrito,
        items: orderItems
      });

      if (error) throw new Error(error);

      toast.show(`¡Gracias ${nombre}! Tu pedido a domicilio fue recibido. Te contactamos al ${telefono} para coordinar la entrega.`, 'success');
      setCarrito([]);
      setVerCarrito(false);
      setPasoCheckout('carrito');
      setNombre('');
      setTelefono('');
      setDireccion('');
    } catch (err) {
      toast.show('Error al enviar el pedido: ' + (err as Error).message, 'error');
    } finally {
      setEnviandoPedido(false);
    }
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

  return (
    <div className="relative flex min-h-screen flex-col bg-cream">
      {/* HEADER PRINCIPAL */}
      <header className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-line bg-cream/85 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-line sm:h-11 sm:w-11">
            <Image src={BRAND_CONFIG.logoUrl} alt={`${BRAND_CONFIG.name} Logo`} fill sizes="44px" priority style={{ objectFit: 'cover' }} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold uppercase tracking-wide text-ink sm:text-lg">{BRAND_CONFIG.name}</h1>
            <p className="hidden truncate text-[10px] uppercase tracking-[0.2em] text-ink-soft sm:block">{BRAND_CONFIG.subtitle}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Acceso directo al panel (entra sin login: es una demo). */}
          <Link
            href="/admin"
            title="Panel de Control"
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-full border border-line bg-card px-3 text-xs font-semibold text-ink-soft transition-colors hover:bg-black/[0.03] sm:px-4 sm:text-sm"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">Panel de Control</span>
          </Link>

          <Button
            variant="primary"
            size="sm"
            icon={ShoppingBag}
            className="relative shrink-0 rounded-full"
            aria-label={`Ver pedido${totalItems > 0 ? ` (${totalItems} productos)` : ''}`}
            onClick={() => {
              setPasoCheckout('carrito');
              setVerCarrito(true);
            }}
          >
            <span className="hidden sm:inline">Ver Pedido</span>
            {totalItems > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* HERO / PORTADA */}
      <section className="bg-gradient-to-b from-gold-light to-transparent px-4 pb-6 pt-8 text-center sm:px-6 sm:pt-12">
        <span className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">
          <Sparkles size={12} /> Menú &amp; Pedidos a Domicilio
        </span>
        <h2 className="gold-gradient-text mx-auto mb-3 max-w-xl text-2xl font-bold leading-tight sm:text-4xl">
          Auténtica Gastronomía Peruana, armonía y sazón tradicional.
        </h2>
        <p className="mx-auto mb-5 max-w-lg text-sm leading-relaxed text-ink-soft">
          Disfrutá del mejor Ceviche, Lomo Saltado, Causa Limeña, Ají de Gallina y Pisco Sour. Hacé tu pedido a domicilio o para retirar por el local.
        </p>

        <MenuSearchBar
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar ceviche, lomo saltado, pisco..."
          className="mx-auto max-w-lg"
        />
      </section>

      {/* CATEGORÍAS */}
      <div className="sticky top-[64px] z-40 bg-cream pb-3 pt-1 sm:top-[76px]">
        <CategoryNav categorias={categorias} activa={categoriaActiva} onChange={setCategoriaActiva} />
      </div>

      {/* MENÚ / GRILLA DE PRODUCTOS */}
      <main className="flex-1 px-4 pb-28 sm:px-6">
        {cargando ? (
          <ProductGridSkeleton />
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

      {/* FOOTER DISCRETO CON ACCESO AL PANEL */}
      <footer className="border-t border-line px-4 py-4 text-center sm:px-6">
        <p className="text-xs text-ink-soft">{BRAND_CONFIG.address} · {BRAND_CONFIG.phone}</p>
        <Link
          href="/admin"
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-ink-soft/70 transition-colors hover:text-gold"
        >
          <Settings size={12} /> Panel de administración
        </Link>
      </footer>

      {/* BARRA FLOTANTE DE CARRITO */}
      {totalItems > 0 && !verCarrito && (
        <div className="animate-slide-up fixed inset-x-0 bottom-4 z-80 flex justify-center px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <button
            onClick={() => {
              setPasoCheckout('carrito');
              setVerCarrito(true);
            }}
            className="flex w-full max-w-md items-center justify-between gap-3 rounded-full bg-ink px-5 py-3.5 text-cream shadow-float cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold text-[13px] font-bold text-white">
                {totalItems}
              </span>
              <div className="text-left">
                <p className="text-sm font-semibold leading-tight">Ver Pedido</p>
                <p className="text-[11px] text-cream/70">{carrito.length} productos seleccionados</p>
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
        <p className="mb-3 text-sm text-ink-soft">
          Especificá si querés algún cambio (ej: leche descremada, sin azúcar, extra dulce).
        </p>
        <textarea
          value={notaTemporal}
          onChange={(e) => setNotaTemporal(e.target.value)}
          placeholder="Ej: Con edulcorante, sin canela..."
          rows={3}
          className="w-full resize-none rounded-lg border border-line p-3 text-sm outline-none font-sans"
        />
      </NotesModalShell>

      {/* DRAWER DEL CARRITO */}
      <NotesModalShell
        open={verCarrito}
        onClose={() => setVerCarrito(false)}
        variant="drawer"
        title={pasoCheckout === 'carrito' ? 'Tu Pedido' : 'Datos del Envío'}
        footer={
          pasoCheckout === 'carrito' ? (
            carrito.length > 0 && (
              <div>
                <div className="mb-5 flex justify-between">
                  <span className="text-base text-ink-soft">Total</span>
                  <span className="text-xl font-bold text-ink">${totalCarrito.toLocaleString('es-AR')}</span>
                </div>
                <Button variant="primary" fullWidth size="lg" icon={ArrowRight} iconPosition="right" onClick={() => setPasoCheckout('datos')}>
                  Completar Envío
                </Button>
              </div>
            )
          ) : (
            <div>
              <div className="mb-4 flex justify-between">
                <span className="text-sm text-ink-soft">Total a Abonar</span>
                <span className="text-lg font-bold">${totalCarrito.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setPasoCheckout('carrito')}>
                  Atrás
                </Button>
                <Button
                  type="submit"
                  form="delivery-form"
                  variant="secondary"
                  className="flex-[2]"
                  loading={enviandoPedido}
                  icon={Check}
                  iconPosition="right"
                >
                  {enviandoPedido ? 'Enviando...' : 'Confirmar Pedido'}
                </Button>
              </div>
            </div>
          )
        }
      >
        {pasoCheckout === 'carrito' ? (
          <>
            <div className="flex flex-col gap-4">
              {carrito.length === 0 ? (
                <div className="py-10 text-center text-ink-soft">
                  <p>Tu carrito está vacío.</p>
                  <p className="mt-1 text-sm">Agregá alguna de nuestras delicias de autor.</p>
                </div>
              ) : (
                carrito.map((item, idx) => (
                  <div key={idx} className="flex gap-3 border-b border-line pb-4">
                    <div className="relative h-15 w-15 shrink-0 overflow-hidden rounded-lg">
                      <Image src={item.producto.imagenUrl} alt={item.producto.nombre} fill sizes="60px" style={{ objectFit: 'cover' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2">
                        <h4 className="text-sm font-semibold text-ink">{item.producto.nombre}</h4>
                        <span className="shrink-0 text-sm font-semibold">${(item.producto.precio * item.cantidad).toLocaleString('es-AR')}</span>
                      </div>
                      {item.nota && <p className="mt-0.5 text-xs italic text-gold">Nota: {item.nota}</p>}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-ink-soft">${item.producto.precio.toLocaleString('es-AR')} c/u</span>
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => eliminarDelCarrito(item.producto.id, item.nota)}
                            aria-label={`Quitar uno de ${item.producto.nombre}`}
                            className="flex h-6 w-6 items-center justify-center rounded-full border border-line text-sm cursor-pointer"
                          >
                            −
                          </button>
                          <span className="text-sm font-semibold">{item.cantidad}</span>
                          <button
                            onClick={() => agregarAlCarrito(item.producto, item.nota)}
                            aria-label={`Agregar uno más de ${item.producto.nombre}`}
                            className="flex h-6 w-6 items-center justify-center rounded-full border border-line text-sm cursor-pointer"
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
          </>
        ) : (
          <form id="delivery-form" onSubmit={enviarPedidoDelivery}>
            <div className="flex flex-col gap-4">
              <Field label="Nombre Completo" icon={User}>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Sofía Rodriguez"
                  className="w-full rounded-lg border border-line bg-card py-3.5 pl-10 pr-3 text-sm font-sans outline-none"
                />
              </Field>

              <Field label="Teléfono Celular" icon={Phone} hint={`Lo usaremos para coordinar la entrega y futuros sorteos exclusivos de ${BRAND_CONFIG.name}.`}>
                <input
                  type="tel"
                  required
                  inputMode="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: +54 9 11 1234 5678"
                  className="w-full rounded-lg border border-line bg-card py-3.5 pl-10 pr-3 text-sm font-sans outline-none"
                />
              </Field>

              <Field label="Dirección de Entrega" icon={MapPin}>
                <input
                  type="text"
                  required
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Ej: Av. Santa Fe 1234, 4° B"
                  className="w-full rounded-lg border border-line bg-card py-3.5 pl-10 pr-3 text-sm font-sans outline-none"
                />
              </Field>
            </div>
          </form>
        )}
      </NotesModalShell>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  hint,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      <div className="relative">
        <Icon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
        {children}
      </div>
      {hint && <span className="text-[11px] leading-snug text-ink-soft">{hint}</span>}
    </label>
  );
}
