'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Producto, PRODUCTOS_MOCK, CATEGORIAS } from '../../../lib/mockData';
import { getProductos, getCategorias, getMesas, crearPedido, crearSolicitud, DbTable } from '../../../lib/dbActions';
import { 
  Coffee, 
  ShoppingBag, 
  ArrowRight, 
  Check, 
  X, 
  Bell, 
  Receipt, 
  User, 
  Phone, 
  Sparkles, 
  Loader2, 
  Utensils 
} from 'lucide-react';

export default function MesaClientePage() {
  const params = useParams();
  const mesaNumero = Number(params?.id);

  // Datos del Cliente y Mesa
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [registroCompletado, setRegistroCompletado] = useState(false);
  const [mesaDb, setMesaDb] = useState<DbTable | null>(null);

  // Estados de carga y datos de carta
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
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

  // Cargar datos del localStorage y Supabase
  useEffect(() => {
    // 1. Cargar datos del cliente guardados en la sesión del navegador
    try {
      const localNombre = localStorage.getItem('bianco_nombre');
      const localTelefono = localStorage.getItem('bianco_telefono');
      
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
        } else {
          // Fallback en caso de que no esté en la base de datos (ej: desarrollo local inicial)
          setMesaDb({ id: mesaNumero, numero: mesaNumero, estado: 'libre' });
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
        console.error('Error cargando los datos de la mesa:', err);
        setProductos(PRODUCTOS_MOCK);
        setCategorias(CATEGORIAS);
        setMesaDb({ id: mesaNumero, numero: mesaNumero, estado: 'libre' });
      } finally {
        setCargando(false);
      }
    }

    if (mesaNumero) {
      cargarMesaYMenu();
    }
  }, [mesaNumero]);

  // Completar el registro inicial del cliente
  const handleRegistroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCliente.trim() || !telefonoCliente.trim()) {
      alert('Por favor completá tu nombre y celular.');
      return;
    }
    try {
      localStorage.setItem('bianco_nombre', nombreCliente);
      localStorage.setItem('bianco_telefono', telefonoCliente);
    } catch (err) {
      console.warn('LocalStorage no disponible al guardar:', err);
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
    } catch (err: any) {
      alert('Error al llamar al mozo: ' + err.message);
    } finally {
      setProcesandoSolicitud(false);
    }
  };

  // Pedir la Cuenta
  const handlePedirCuenta = async () => {
    if (!mesaDb) return;
    const confirmar = confirm('¿Estás seguro de que querés solicitar la cuenta?');
    if (!confirmar) return;

    setProcesandoSolicitud(true);
    try {
      const { error } = await crearSolicitud(mesaDb.id, 'pedir_cuenta');
      if (error) throw new Error(error);
      
      setCuentaSolicitada(true);
      setTimeout(() => setCuentaSolicitada(false), 8000);
    } catch (err: any) {
      alert('Error al pedir la cuenta: ' + err.message);
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
      const { data, error } = await crearPedido({
        tipo: 'mesa',
        mesa_id: mesaDb.id,
        nombre_cliente: nombreCliente,
        telefono: telefonoCliente,
        total: totalCarrito,
        items: orderItems
      });

      if (error) throw new Error(error);

      alert(`¡Pedido enviado a cocina! Tus delicias se están preparando y serán llevadas a la Mesa ${mesaNumero}.`);
      setCarrito([]);
      setVerCarrito(false);
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

  // Si la mesa es inválida o no hay número
  if (!mesaNumero || isNaN(mesaNumero)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', color: 'red' }}>Mesa no válida</h2>
        <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Por favor, escaneá el código QR correcto en tu mesa.</p>
      </div>
    );
  }

  // PANTALLA DE REGISTRO INICIAL (Si no se ha identificado)
  if (!registroCompletado) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--bg-color)',
        padding: '24px',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundImage: 'linear-gradient(180deg, var(--accent-light-gold) 0%, rgba(250, 249, 246, 0.4) 100%)'
      }}>
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '400px',
          padding: '32px 24px',
          boxShadow: 'var(--shadow-medium)',
          border: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <span style={{
            fontSize: '12px',
            color: 'var(--accent-gold)',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            fontWeight: 600,
            display: 'block',
            marginBottom: '8px'
          }}>Bianco Pastelería</span>
          
          <h2 style={{ fontSize: '28px', fontWeight: 400, marginBottom: '6px' }}>Mesa {mesaNumero}</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Para ver la carta y realizar pedidos, por favor completá tus datos de mesa.
          </p>

          <form onSubmit={handleRegistroSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Tu Nombre</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  required
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  placeholder="Ej: Marcos García"
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 38px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-color)',
                    fontSize: '14px',
                    fontFamily: 'var(--font-sans)'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Tu Celular</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-secondary)' }} />
                <input 
                  type="tel" 
                  required
                  value={telefonoCliente}
                  onChange={(e) => setTelefonoCliente(e.target.value)}
                  placeholder="Ej: 11 1234 5678"
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 38px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-color)',
                    fontSize: '14px',
                    fontFamily: 'var(--font-sans)'
                  }}
                />
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                * Lo usamos para identificar tus pedidos en mesa y futuros sorteos exclusivos de la pastelería.
              </span>
            </div>

            <button 
              type="submit"
              style={{
                background: 'var(--text-primary)',
                color: 'var(--bg-color)',
                border: 'none',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>Ver la Carta</span>
              <Utensils size={16} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // PANTALLA PRINCIPAL DE CARTA DE MESA
  return (
    <div className="main-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
      
      {/* HEADER DE MESA */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(250, 249, 246, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-color)',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'var(--accent-gold)',
            color: 'white',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: 'var(--shadow-soft)'
          }}>
            {mesaNumero}
          </div>
          <div>
            <h1 style={{ fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mesa {mesaNumero}</h1>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Cliente: {nombreCliente.split(' ')[0]}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => {
              if (confirm('¿Querés cambiar de nombre o cerrar sesión de la mesa?')) {
                localStorage.removeItem('bianco_nombre');
                localStorage.removeItem('bianco_telefono');
                setRegistroCompletado(false);
              }
            }}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
            title="Editar mis datos"
          >
            <User size={16} />
          </button>

          <button 
            onClick={() => setVerCarrito(true)}
            style={{
              background: 'var(--text-primary)',
              color: 'var(--bg-color)',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '30px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '13px'
            }}
          >
            <ShoppingBag size={14} />
            <span>Mesa</span>
            {totalItems > 0 && (
              <span style={{
                background: 'var(--accent-gold)',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold'
              }}>
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ALERTAS DE SOLICITUDES EN CURSO */}
      {mozoLlamado && (
        <div style={{
          background: 'var(--accent-light-gold)',
          color: 'var(--text-primary)',
          borderBottom: '1px solid var(--accent-gold)',
          padding: '12px 24px',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <Bell size={14} style={{ color: 'var(--accent-gold)' }} className="animate-bounce" />
          <span>¡Llamado al mozo registrado! En breve se acercarán a tu mesa.</span>
        </div>
      )}

      {cuentaSolicitada && (
        <div style={{
          background: '#eefcf4',
          color: '#1a5c37',
          borderBottom: '1px solid #c2ebd3',
          padding: '12px 24px',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <Receipt size={14} style={{ color: '#2b9348' }} />
          <span>¡Cuenta solicitada! El mozo traerá la cuenta a la mesa de inmediato.</span>
        </div>
      )}

      {/* QUICK ACTIONS BAR (BOTONES FLOTANTES DE LLAMADOS) */}
      <section style={{
        padding: '16px 20px 8px',
        display: 'flex',
        gap: '12px'
      }}>
        <button 
          onClick={handleLlamarMozo}
          disabled={procesandoSolicitud}
          style={{
            flex: 1,
            background: 'var(--card-bg)',
            border: '1px solid var(--accent-gold)',
            color: 'var(--text-primary)',
            padding: '14px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: 'var(--shadow-soft)'
          }}
        >
          {procesandoSolicitud ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Bell size={16} style={{ color: 'var(--accent-gold)' }} />
          )}
          <span>Llamar al Mozo</span>
        </button>

        <button 
          onClick={handlePedirCuenta}
          disabled={procesandoSolicitud}
          style={{
            flex: 1,
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '14px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: 'var(--shadow-soft)'
          }}
        >
          {procesandoSolicitud ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Receipt size={16} style={{ color: '#2b9348' }} />
          )}
          <span>Pedir Cuenta</span>
        </button>
      </section>

      {/* CATEGORÍAS */}
      <nav style={{
        display: 'flex',
        gap: '8px',
        padding: '12px 20px',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        scrollbarWidth: 'none'
      }}>
        <button
          onClick={() => setCategoriaActiva('Todos')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: '1px solid',
            borderColor: categoriaActiva === 'Todos' ? 'var(--text-primary)' : 'var(--border-color)',
            background: categoriaActiva === 'Todos' ? 'var(--text-primary)' : 'var(--card-bg)',
            color: categoriaActiva === 'Todos' ? 'var(--bg-color)' : 'var(--text-primary)',
            fontSize: '13px',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Todos
        </button>
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: categoriaActiva === cat ? 'var(--text-primary)' : 'var(--border-color)',
              background: categoriaActiva === cat ? 'var(--text-primary)' : 'var(--card-bg)',
              color: categoriaActiva === cat ? 'var(--bg-color)' : 'var(--text-primary)',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            {cat}
          </button>
        ))}
      </nav>

      {/* MENÚ DE PRODUCTOS */}
      <main style={{ padding: '0 20px 100px', flex: 1 }}>
        {cargando ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '160px', gap: '12px' }}>
            <Loader2 className="animate-spin" style={{ color: 'var(--accent-gold)' }} size={28} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Cargando carta dulce...</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '18px'
          }}>
            {productosFiltrados.map((prod) => (
              <div 
                key={prod.id} 
                style={{
                  background: 'var(--card-bg)',
                  borderRadius: '14px',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-soft)',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ position: 'relative', height: '150px', width: '100%' }}>
                  <Image 
                    src={prod.imagenUrl} 
                    alt={prod.nombre} 
                    fill 
                    sizes="(max-width: 768px) 100vw, 33vw"
                    style={{ objectFit: 'cover' }}
                  />
                  {prod.esCafe && (
                    <span style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      background: 'rgba(255, 255, 255, 0.95)',
                      padding: '3px 6px',
                      borderRadius: '15px',
                      fontSize: '10px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      color: 'var(--text-primary)'
                    }}>
                      <Coffee size={10} /> Café
                    </span>
                  )}
                </div>
                
                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{prod.nombre}</h3>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-gold)' }}>${prod.precio.toLocaleString('es-AR')}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.3, marginBottom: '14px', height: '48px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {prod.descripcion}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => {
                        setProductoConNotaId(prod.id);
                        setNotaTemporal('');
                      }}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '6px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      Notas
                    </button>
                    <button
                      onClick={() => agregarAlCarrito(prod)}
                      style={{
                        flex: 2,
                        background: 'var(--text-primary)',
                        color: 'var(--bg-color)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px',
                        fontSize: '11px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
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
            maxWidth: '380px',
            padding: '20px',
            boxShadow: 'var(--shadow-medium)'
          }}>
            <h4 style={{ fontSize: '17px', marginBottom: '8px' }}>Notas de preparación</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Ej: Cortado tibio, sin azúcar, edulcorante, etc.
            </p>
            <textarea
              value={notaTemporal}
              onChange={(e) => setNotaTemporal(e.target.value)}
              placeholder="Ej: Leche descremada, sin cacao..."
              style={{
                width: '100%',
                height: '70px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                padding: '10px',
                fontSize: '13px',
                marginBottom: '16px',
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
                  padding: '10px',
                  cursor: 'pointer',
                  fontSize: '13px'
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
                  padding: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER DEL CARRITO / DETALLE PEDIDO DE MESA */}
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
            maxWidth: '420px',
            height: '100%',
            boxShadow: 'var(--shadow-medium)',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Mi Pedido - Mesa {mesaNumero}</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cliente: {nombreCliente}</p>
              </div>
              <button 
                onClick={() => setVerCarrito(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* LISTA ITEMS */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              {carrito.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                  <p>No tenés nada seleccionado.</p>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>Agregá cosas ricas de la carta.</p>
                </div>
              ) : (
                carrito.map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    gap: '10px',
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '12px'
                  }}>
                    <div style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '6px', overflow: 'hidden' }}>
                      <Image src={item.producto.imagenUrl} alt={item.producto.nombre} fill style={{ objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 600 }}>{item.producto.nombre}</h4>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>${(item.producto.precio * item.cantidad).toLocaleString('es-AR')}</span>
                      </div>
                      {item.nota && (
                        <p style={{ fontSize: '11px', color: 'var(--accent-gold)', marginTop: '2px', fontStyle: 'italic' }}>
                          Nota: {item.nota}
                        </p>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          ${item.producto.precio.toLocaleString('es-AR')} c/u
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => eliminarDelCarrito(item.producto.id, item.nota)}
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              border: '1px solid var(--border-color)',
                              background: 'transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px'
                            }}
                          >
                            -
                          </button>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{item.cantidad}</span>
                          <button
                            onClick={() => agregarAlCarrito(item.producto, item.nota)}
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              border: '1px solid var(--border-color)',
                              background: 'transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px'
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

            {/* TOTAL Y CONFIRMACIÓN DE PEDIDO EN MESA */}
            {carrito.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Total del Pedido</span>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    ${totalCarrito.toLocaleString('es-AR')}
                  </span>
                </div>
                
                <button
                  onClick={enviarPedidoMesa}
                  disabled={enviandoPedido}
                  style={{
                    width: '100%',
                    background: 'var(--text-primary)',
                    color: 'var(--bg-color)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '14px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {enviandoPedido ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Enviando a Cocina...</span>
                    </>
                  ) : (
                    <>
                      <span>Enviar a Cocina</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
