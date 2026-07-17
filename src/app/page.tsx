'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { CATEGORIAS, PRODUCTOS_MOCK, Producto } from '../lib/mockData';
import { getProductos, getCategorias, crearPedido } from '../lib/dbActions';
import { ShoppingBag, Coffee, ArrowRight, Check, X, MapPin, Phone, User, Loader2, Sparkles } from 'lucide-react';

export default function Home() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
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

  // Cargar datos desde Supabase
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
            imagenUrl: p.imagen_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
            categoria: p.categoria?.nombre || 'General',
            esCafe: p.es_cafe
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
      alert('Por favor, completá todos los datos de envío.');
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
      const { data, error } = await crearPedido({
        tipo: 'delivery',
        nombre_cliente: nombre,
        telefono: telefono,
        direccion: direccion,
        total: totalCarrito,
        items: orderItems
      });

      if (error) throw new Error(error);

      alert(`¡Muchas gracias ${nombre}! Tu pedido a domicilio ha sido recibido. Nos comunicaremos a la brevedad al ${telefono} para coordinar la entrega.`);
      setCarrito([]);
      setVerCarrito(false);
      setPasoCheckout('carrito');
      setNombre('');
      setTelefono('');
      setDireccion('');
    } catch (err: any) {
      alert('Error al enviar el pedido: ' + err.message);
    } finally {
      setEnviandoPedido(false);
    }
  };

  const productosFiltrados =
    categoriaActiva === 'Todos'
      ? productos
      : productos.filter((p) => p.categoria === categoriaActiva);

  const totalCarrito = carrito.reduce((sum, item) => sum + item.producto.precio * item.cantidad, 0);
  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);

  return (
    <div className="main-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
      
      {/* HEADER PRINCIPAL */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(250, 249, 246, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-color)',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative', width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <Image 
              src="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&auto=format&fit=crop&q=80" 
              alt="Bianco Logo" 
              fill
              sizes="44px"
              priority
              style={{ objectFit: 'cover' }}
            />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Bianco</h1>
            <p style={{ fontSize: '10px', color: 'var(--text-secondary)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '-2px' }}>Pastelería de autor</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Link discreto a admin */}
          <a href="/admin" style={{ fontSize: '12px', color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 500, marginRight: '8px' }}>
            Panel de Control
          </a>
          
          <button 
            onClick={() => {
              setPasoCheckout('carrito');
              setVerCarrito(true);
            }}
            style={{
              position: 'relative',
              background: 'var(--text-primary)',
              color: 'var(--bg-color)',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '30px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '14px',
              boxShadow: 'var(--shadow-soft)'
            }}
          >
            <ShoppingBag size={16} />
            <span>Ver Pedido</span>
            {totalItems > 0 && (
              <span style={{
                background: 'var(--accent-gold)',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* HERO / PORTADA */}
      <section style={{
        padding: '50px 24px 30px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, var(--accent-light-gold) 0%, rgba(250, 249, 246, 0) 100%)'
      }}>
        <span style={{
          color: 'var(--accent-gold)',
          textTransform: 'uppercase',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '3px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          marginBottom: '12px'
        }}>
          <Sparkles size={12} /> Pedidos a Domicilio
        </span>
        <h2 style={{ fontSize: '32px', fontWeight: 400, lineHeight: 1.2, marginBottom: '16px' }} className="gold-gradient-text">
          Diseño en pastelería,<br />
          armonía en sabores.
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.5 }}>
          Explorá nuestra exclusiva selección de pastelería fina de autor. Hacé tu pedido a domicilio y disfrutalo donde quieras.
        </p>
      </section>

      {/* CATEGORÍAS */}
      <nav style={{
        display: 'flex',
        gap: '8px',
        padding: '0 24px 20px',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        scrollbarWidth: 'none'
      }}>
        <button
          onClick={() => setCategoriaActiva('Todos')}
          style={{
            padding: '10px 20px',
            borderRadius: '25px',
            border: '1px solid',
            borderColor: categoriaActiva === 'Todos' ? 'var(--text-primary)' : 'var(--border-color)',
            background: categoriaActiva === 'Todos' ? 'var(--text-primary)' : 'var(--card-bg)',
            color: categoriaActiva === 'Todos' ? 'var(--bg-color)' : 'var(--text-primary)',
            fontSize: '13px',
            cursor: 'pointer',
            fontWeight: 500,
            boxShadow: 'var(--shadow-soft)'
          }}
        >
          Todos
        </button>
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            style={{
              padding: '10px 20px',
              borderRadius: '25px',
              border: '1px solid',
              borderColor: categoriaActiva === cat ? 'var(--text-primary)' : 'var(--border-color)',
              background: categoriaActiva === cat ? 'var(--text-primary)' : 'var(--card-bg)',
              color: categoriaActiva === cat ? 'var(--bg-color)' : 'var(--text-primary)',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 500,
              boxShadow: 'var(--shadow-soft)'
            }}
          >
            {cat}
          </button>
        ))}
      </nav>

      {/* MENÚ / GRILLA DE PRODUCTOS */}
      <main style={{ padding: '0 24px 100px', flex: 1 }}>
        {cargando ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '12px' }}>
            <Loader2 className="animate-spin" style={{ color: 'var(--accent-gold)' }} size={32} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Cargando nuestra carta dulce...</p>
          </div>
        ) : (
          <div className="product-grid">
            {productosFiltrados.map((prod, index) => (
              <div 
                key={prod.id} 
                className="product-card"
                style={{
                  background: 'var(--card-bg)',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-soft)',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div className="product-card-image-container" style={{ position: 'relative', width: '100%' }}>
                  <Image 
                    src={prod.imagenUrl} 
                    alt={prod.nombre} 
                    fill 
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 100vw, 33vw"
                    priority={index < 2}
                    style={{ objectFit: 'cover' }}
                  />
                  {prod.esCafe && (
                    <span style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(255, 255, 255, 0.95)',
                      padding: '4px 8px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: 'var(--shadow-soft)',
                      color: 'var(--text-primary)'
                    }}>
                      <Coffee size={12} /> Café
                    </span>
                  )}
                </div>
                
                <div className="product-card-info" style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h3 className="product-card-title" style={{ fontSize: '17px', fontWeight: 600, fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>{prod.nombre}</h3>
                      <span className="product-card-price" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-gold)' }}>${prod.precio.toLocaleString('es-AR')}</span>
                    </div>
                    <p className="product-card-desc" style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '16px', height: '54px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {prod.descripcion}
                    </p>
                  </div>

                  <div className="product-card-actions" style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setProductoConNotaId(prod.id);
                        setNotaTemporal('');
                      }}
                      className="product-card-button-notes"
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      Notas
                    </button>
                    <button
                      onClick={() => agregarAlCarrito(prod)}
                      className="product-card-button-add"
                      style={{
                        flex: 2,
                        background: 'var(--text-primary)',
                        color: 'var(--bg-color)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* POPUP DE NOTAS */}
      {productoConNotaId !== null && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '400px',
            padding: '24px',
            boxShadow: 'var(--shadow-medium)'
          }}>
            <h4 style={{ fontSize: '18px', marginBottom: '12px' }}>Notas de preparación</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Especificá si querés algún cambio (ej: leche descremada, sin azúcar, extra dulce).
            </p>
            <textarea
              value={notaTemporal}
              onChange={(e) => setNotaTemporal(e.target.value)}
              placeholder="Ej: Con edulcorante, sin canela..."
              style={{
                width: '100%',
                height: '80px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                padding: '12px',
                fontSize: '14px',
                marginBottom: '20px',
                fontFamily: 'var(--font-sans)',
                resize: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setProductoConNotaId(null)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const prod = productos.find(p => p.id === productoConNotaId);
                  if (prod) agregarAlCarrito(prod, notaTemporal);
                  setProductoConNotaId(null);
                }}
                style={{
                  flex: 1,
                  background: 'var(--accent-gold)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM DRAWER DEL CARRITO */}
      {verCarrito && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 90,
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <div style={{
            background: 'var(--bg-color)',
            width: '100%',
            maxWidth: '450px',
            height: '100%',
            boxShadow: 'var(--shadow-medium)',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '22px' }}>{pasoCheckout === 'carrito' ? 'Tu Pedido' : 'Datos del Envío'}</h3>
              <button 
                onClick={() => setVerCarrito(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
              >
                <X size={24} />
              </button>
            </div>

            {pasoCheckout === 'carrito' ? (
              <>
                {/* LISTA ITEMS */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                  {carrito.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                      <p>Tu carrito está vacío.</p>
                      <p style={{ fontSize: '13px', marginTop: '4px' }}>Agregá alguna de nuestras delicias de autor.</p>
                    </div>
                  ) : (
                    carrito.map((item, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        gap: '12px',
                        borderBottom: '1px solid var(--border-color)',
                        paddingBottom: '16px'
                      }}>
                        <div style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden' }}>
                          <Image src={item.producto.imagenUrl} alt={item.producto.nombre} fill sizes="60px" style={{ objectFit: 'cover' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: 600 }}>{item.producto.nombre}</h4>
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>${(item.producto.precio * item.cantidad).toLocaleString('es-AR')}</span>
                          </div>
                          {item.nota && (
                            <p style={{ fontSize: '11px', color: 'var(--accent-gold)', marginTop: '2px', fontStyle: 'italic' }}>
                              Nota: {item.nota}
                            </p>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              ${item.producto.precio.toLocaleString('es-AR')} c/u
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <button
                                onClick={() => eliminarDelCarrito(item.producto.id, item.nota)}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  border: '1px solid var(--border-color)',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                -
                              </button>
                              <span style={{ fontSize: '14px', fontWeight: 600 }}>{item.cantidad}</span>
                              <button
                                onClick={() => agregarAlCarrito(item.producto, item.nota)}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  border: '1px solid var(--border-color)',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
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

                {/* TOTAL Y CONTINUAR */}
                {carrito.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>Total</span>
                      <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        ${totalCarrito.toLocaleString('es-AR')}
                      </span>
                    </div>
                    <button
                      onClick={() => setPasoCheckout('datos')}
                      style={{
                        width: '100%',
                        background: 'var(--text-primary)',
                        color: 'var(--bg-color)',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '16px',
                        fontSize: '16px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <span>Completar Envío</span>
                      <ArrowRight size={18} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* FORMULARIO DELIVERY */
              <form onSubmit={enviarPedidoDelivery} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Nombre Completo</label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-secondary)' }} />
                      <input 
                        type="text" 
                        required
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Ej: Sofía Rodriguez"
                        style={{
                          width: '100%',
                          padding: '14px 14px 14px 40px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--card-bg)',
                          fontSize: '14px',
                          fontFamily: 'var(--font-sans)'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Teléfono Celular</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-secondary)' }} />
                      <input 
                        type="tel" 
                        required
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        placeholder="Ej: +54 9 11 1234 5678"
                        style={{
                          width: '100%',
                          padding: '14px 14px 14px 40px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--card-bg)',
                          fontSize: '14px',
                          fontFamily: 'var(--font-sans)'
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Lo usaremos para coordinar la entrega y futuros sorteos exclusivos de Bianco.</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Dirección de Entrega</label>
                    <div style={{ position: 'relative' }}>
                      <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-secondary)' }} />
                      <input 
                        type="text" 
                        required
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                        placeholder="Ej: Av. Santa Fe 1234, 4° B"
                        style={{
                          width: '100%',
                          padding: '14px 14px 14px 40px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--card-bg)',
                          fontSize: '14px',
                          fontFamily: 'var(--font-sans)'
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Total a Abonar</span>
                    <span style={{ fontSize: '18px', fontWeight: 700 }}>${totalCarrito.toLocaleString('es-AR')}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setPasoCheckout('carrito')}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '14px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      Atrás
                    </button>
                    <button
                      type="submit"
                      disabled={enviandoPedido}
                      style={{
                        flex: 2,
                        background: 'var(--accent-gold)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      {enviandoPedido ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirmar Pedido</span>
                          <Check size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
