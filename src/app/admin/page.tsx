'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { supabase } from '../../lib/supabase';
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
  getProductos
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
  Loader2
} from 'lucide-react';

export default function AdminDashboard() {
  const [tabActiva, setTabActiva] = useState<'monitoreo' | 'pedidos' | 'qrs' | 'database'>('monitoreo');
  
  // Datos del Servidor
  const [mesas, setMesas] = useState<DbTable[]>([]);
  const [pedidos, setPedidos] = useState<DbOrder[]>([]);
  const [solicitudes, setSolicitudes] = useState<DbRequest[]>([]);
  
  // Estados de interfaz
  const [cargando, setCargando] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedingMsg, setSeedingMsg] = useState('');
  
  // Hostname para códigos QR
  const [hostUrl, setHostUrl] = useState('');

  // Guardar última longitud de solicitudes para reproducir sonido
  const prevSolicitudesCount = useRef(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHostUrl(window.location.origin);
      
      // Aplicar color de fondo oscuro al body para que combine con el panel administrativo
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
        // Si hay nuevas solicitudes, sonar la campana
        if (countNuevas > prevSolicitudesCount.current) {
          playChime();
        }
        prevSolicitudesCount.current = countNuevas;
        setSolicitudes(dbSolicitudes as unknown as DbRequest[]);
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
      
      // Ping 1 (Tono alto)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1); // E6
      gain1.gain.setValueAtTime(0.12, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.4);

      // Ping 2 (Con leve retraso)
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.50, ctx.currentTime); // C6
        osc2.frequency.exponentialRampToValueAtTime(1567.98, ctx.currentTime + 0.15); // G6
        gain2.gain.setValueAtTime(0.12, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.5);
      }, 150);

    } catch (err) {
      console.warn('AudioContext bloqueado por el navegador hasta interacción del usuario.', err);
    }
  };

  useEffect(() => {
    cargarDatosCompletos();

    // Configurar suscripción Realtime en Supabase para actualizaciones instantáneas
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

    // Actualización de respaldo cada 15 segundos
    const interval = setInterval(cargarDatosCompletos, 15000);

    return () => {
      supabase.removeChannel(channelPedidos);
      supabase.removeChannel(channelMesas);
      supabase.removeChannel(channelSolicitudes);
      clearInterval(interval);
    };
  }, []);

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

  // Imprimir los códigos QR de las mesas
  const handlePrint = () => {
    window.print();
  };

  // Filtrar pedidos activos vs históricos
  const pedidosActivos = pedidos.filter(p => ['pendiente', 'preparando', 'listo'].includes(p.estado));
  const pedidosCompletados = pedidos.filter(p => ['entregado', 'cancelado'].includes(p.estado));

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: '#0d0d0d', // Fondo oscuro premium para el panel de administración
      color: '#f5f5f5',
      fontFamily: 'var(--font-sans)',
      paddingBottom: '40px'
    }} className="admin-dashboard-page">
      
      {/* HEADER DE ADMINISTRACIÓN */}
      <header style={{
        background: '#161616',
        borderBottom: '1px solid #262626',
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }} className="no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'var(--accent-gold)',
            color: '#121212',
            padding: '10px 14px',
            borderRadius: '10px',
            fontWeight: 'bold',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Sparkles size={18} />
            <span>BIANCO</span>
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '0.5px' }}>Panel de Control y Monitoreo</h1>
            <p style={{ fontSize: '11px', color: '#a0a0a0' }}>Actualizaciones en tiempo real activas</p>
          </div>
        </div>

        {/* CONTADORES RÁPIDOS */}
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#222', padding: '6px 14px', borderRadius: '8px' }}>
            <Bell size={16} style={{ color: 'var(--accent-gold)' }} />
            <span style={{ fontSize: '13px' }}>Llamados: <b>{solicitudes.filter(s => s.tipo === 'llamar_mozo').length}</b></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#222', padding: '6px 14px', borderRadius: '8px' }}>
            <Receipt size={16} style={{ color: '#2b9348' }} />
            <span style={{ fontSize: '13px' }}>Cuentas: <b>{solicitudes.filter(s => s.tipo === 'pedir_cuenta').length}</b></span>
          </div>
          <button 
            onClick={cargarDatosCompletos} 
            style={{
              background: '#262626',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              color: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      {/* SUB-HEADER / MENÚ DE TABS */}
      <nav style={{
        background: '#121212',
        borderBottom: '1px solid #222',
        padding: '0 32px',
        display: 'flex',
        gap: '24px'
      }} className="no-print">
        {[
          { id: 'monitoreo', label: 'Monitoreo de Mesas', icon: Coffee },
          { id: 'pedidos', label: 'Pedidos y Delivery', icon: ShoppingBag },
          { id: 'qrs', label: 'Generador de Códigos QR', icon: QrCode },
          { id: 'database', label: 'Base de Datos', icon: Database }
        ].map(tab => {
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
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: 0
              }}
            >
              <Icon size={16} />
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
            borderRadius: '12px',
            marginBottom: '24px',
            fontWeight: 500,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 20px rgba(197, 168, 128, 0.2)'
          }}>
            {seeding ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
            <span>{seedingMsg}</span>
          </div>
        )}

        {/* 1. MONITOREO DE MESAS */}
        {tabActiva === 'monitoreo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 500 }}>Mesas Activas (1 a 10)</h2>
              <p style={{ fontSize: '13px', color: '#a0a0a0' }}>Haz clic en Liberar para desocupar la mesa y cerrar sus llamados.</p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px'
            }}>
              {mesas.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', border: '1px dashed #333', borderRadius: '16px', color: '#a0a0a0' }}>
                  <Database size={32} style={{ marginBottom: '12px', color: '#555' }} />
                  <p>No se encontraron mesas cargadas en la base de datos.</p>
                  <p style={{ fontSize: '13px', marginTop: '6px' }}>Ve a la pestaña "Base de Datos" para inicializarlas.</p>
                </div>
              ) : (
                mesas.map((mesa) => {
                  // Buscar si hay solicitudes pendientes para esta mesa
                  const llamadosMesa = solicitudes.filter(s => s.mesa_id === mesa.id && s.tipo === 'llamar_mozo');
                  const cuentasMesa = solicitudes.filter(s => s.mesa_id === mesa.id && s.tipo === 'pedir_cuenta');
                  
                  // Pedidos pendientes vinculados a esta mesa
                  const pedidosMesa = pedidosActivos.filter(p => p.mesa_id === mesa.id);

                  const tieneLlamado = llamadosMesa.length > 0;
                  const tieneCuenta = cuentasMesa.length > 0;

                  // Definir borde y estilo según llamados
                  let borderStyle = '1px solid #262626';
                  let bgGlow = 'transparent';
                  if (tieneCuenta) {
                    borderStyle = '2px solid #2b9348'; // Verde para cuenta
                    bgGlow = 'rgba(43, 147, 72, 0.05)';
                  } else if (tieneLlamado) {
                    borderStyle = '2px solid var(--accent-gold)'; // Dorado para mozo
                    bgGlow = 'rgba(197, 168, 128, 0.05)';
                  }

                  return (
                    <div 
                      key={mesa.id}
                      style={{
                        background: '#161616',
                        borderRadius: '16px',
                        border: borderStyle,
                        backgroundColor: bgGlow || '#161616',
                        padding: '20px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div>
                        {/* Header de tarjeta */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                          <span style={{ fontSize: '18px', fontWeight: 600 }}>Mesa {mesa.numero}</span>
                          
                          {/* Estado de la mesa */}
                          <span style={{
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            fontWeight: 'bold',
                            padding: '4px 8px',
                            borderRadius: '12px',
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

                        {/* Indicadores de llamadas */}
                        {tieneLlamado && (
                          <div style={{
                            background: 'rgba(197, 168, 128, 0.2)',
                            color: 'var(--accent-gold)',
                            borderRadius: '8px',
                            padding: '10px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px',
                            animation: 'pulse 2s infinite'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
                              <Bell size={14} className="animate-bounce" /> LLAMAN AL MOZO
                            </span>
                            <button 
                              onClick={() => handleAtenderSolicitud(llamadosMesa[0].id)}
                              style={{
                                background: 'var(--accent-gold)',
                                border: 'none',
                                color: '#121212',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                              }}
                            >
                              Atender
                            </button>
                          </div>
                        )}

                        {tieneCuenta && (
                          <div style={{
                            background: 'rgba(43, 147, 72, 0.2)',
                            color: '#2b9348',
                            borderRadius: '8px',
                            padding: '10px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px',
                            animation: 'pulse 2s infinite'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
                              <Receipt size={14} /> PIDEN LA CUENTA
                            </span>
                            <button 
                              onClick={() => handleAtenderSolicitud(cuentasMesa[0].id)}
                              style={{
                                background: '#2b9348',
                                border: 'none',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                              }}
                            >
                              Atender
                            </button>
                          </div>
                        )}

                        {/* Pedidos activos de la mesa */}
                        {pedidosMesa.length > 0 && (
                          <div style={{ borderTop: '1px solid #262626', paddingTop: '10px', marginTop: '10px' }}>
                            <p style={{ fontSize: '11px', color: '#a0a0a0', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Consumos Activos ({pedidosMesa[0].nombre_cliente}):
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {pedidosMesa.flatMap(p => p.detalles || []).map((det, index) => (
                                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                  <span>{det.cantidad}x {det.producto?.nombre || 'Producto'}</span>
                                  {det.observaciones && <span style={{ color: 'var(--accent-gold)', fontSize: '10px', fontStyle: 'italic' }}>({det.observaciones})</span>}
                                </div>
                              ))}
                              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #333', paddingTop: '6px', marginTop: '6px', fontSize: '13px', fontWeight: 600 }}>
                                <span>Total Consumido:</span>
                                <span style={{ color: 'var(--accent-gold)' }}>
                                  ${pedidosMesa.reduce((sum, p) => sum + Number(p.total), 0).toLocaleString('es-AR')}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Botón de control de mesa */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        {mesa.estado !== 'libre' && (
                          <button
                            onClick={() => handleLiberarMesa(mesa.id)}
                            style={{
                              flex: 1,
                              background: '#222',
                              border: '1px solid #333',
                              color: '#ff4d4d',
                              borderRadius: '8px',
                              padding: '8px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <Trash2 size={12} />
                            <span>Liberar Mesa</span>
                          </button>
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
              <h2 style={{ fontSize: '20px', fontWeight: 500 }}>Cola de Pedidos Activos (Cocina & Delivery)</h2>
              <span style={{ background: 'var(--accent-gold)', color: '#121212', fontSize: '12px', fontWeight: 600, padding: '4px 8px', borderRadius: '12px' }}>
                {pedidosActivos.length} pedidos en cola
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pedidosActivos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', border: '1px dashed #333', borderRadius: '16px', color: '#a0a0a0' }}>
                  <ShoppingBag size={32} style={{ marginBottom: '12px', color: '#555' }} />
                  <p>No hay pedidos pendientes en preparación.</p>
                </div>
              ) : (
                pedidosActivos.map((pedido) => (
                  <div 
                    key={pedido.id}
                    style={{
                      background: '#161616',
                      borderRadius: '12px',
                      border: '1px solid #262626',
                      padding: '20px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '20px'
                    }}
                  >
                    {/* Información del pedido */}
                    <div style={{ flex: 1, minWidth: '250px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: pedido.tipo === 'delivery' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: pedido.tipo === 'delivery' ? '#3b82f6' : '#f59e0b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {pedido.tipo === 'delivery' ? <Truck size={12} /> : <Coffee size={12} />}
                          {pedido.tipo === 'delivery' ? 'DELIVERY' : `MESA ${pedido.mesa?.numero}`}
                        </span>

                        <span style={{ fontSize: '13px', color: '#a0a0a0' }}>
                          Pedido #{pedido.id} • {new Date(pedido.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <User size={14} style={{ color: 'var(--accent-gold)' }} /> {pedido.nombre_cliente}
                      </h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#a0a0a0', marginBottom: '12px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={12} /> Celular: {pedido.telefono}
                        </span>
                        {pedido.tipo === 'delivery' && pedido.direccion && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={12} /> Dirección: {pedido.direccion}
                          </span>
                        )}
                      </div>

                      {/* Detalles del pedido */}
                      <div style={{ background: '#1c1c1c', borderRadius: '8px', padding: '12px' }}>
                        <p style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Productos:</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {pedido.detalles?.map((det, index) => (
                            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
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

                    {/* Costo total y estado */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', height: '100%', minWidth: '150px', alignSelf: 'stretch' }}>
                      <div style={{ textAlign: 'right', marginBottom: '16px' }}>
                        <span style={{ fontSize: '12px', color: '#a0a0a0', display: 'block' }}>Total del Pedido</span>
                        <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-gold)' }}>${Number(pedido.total).toLocaleString('es-AR')}</span>
                      </div>

                      {/* Botones de control de estado del pedido */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '2px', textAlign: 'right' }}>Cambiar Estado:</div>
                        
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {pedido.estado === 'pendiente' && (
                            <button 
                              onClick={() => handleEstadoPedido(pedido.id, 'preparando')}
                              style={{
                                flex: 1,
                                background: '#b58826',
                                color: 'white',
                                border: 'none',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer'
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
                                padding: '8px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer'
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
                                padding: '8px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer'
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
                              padding: '8px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              cursor: 'pointer'
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

            {/* HISTÓRICO DE PEDIDOS */}
            {pedidosCompletados.length > 0 && (
              <div style={{ marginTop: '40px', borderTop: '1px solid #222', paddingTop: '24px' }}>
                <h3 style={{ fontSize: '16px', color: '#888', marginBottom: '16px' }}>Historial Reciente (Entregados y Cancelados)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pedidosCompletados.slice(0, 10).map((pedido) => (
                    <div 
                      key={pedido.id}
                      style={{
                        background: '#121212',
                        border: '1px solid #1a1a1a',
                        borderRadius: '8px',
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
                          borderRadius: '4px',
                          background: pedido.estado === 'entregado' ? 'rgba(43, 147, 72, 0.1)' : 'rgba(255, 77, 77, 0.1)',
                          color: pedido.estado === 'entregado' ? '#2b9348' : '#ff4d4d'
                        }}>
                          {pedido.estado.toUpperCase()}
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
                <h2 style={{ fontSize: '20px', fontWeight: 500 }}>Cartelera de Códigos QR para las Mesas</h2>
                <p style={{ fontSize: '13px', color: '#a0a0a0', marginTop: '4px' }}>
                  Hojas listas para imprimir. Cada una contiene el código QR enlazado a la dirección `/mesa/[id]`.
                </p>
              </div>
              <button
                onClick={handlePrint}
                style={{
                  background: 'var(--accent-gold)',
                  color: '#121212',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Printer size={16} />
                <span>Imprimir Tarjetas QR</span>
              </button>
            </div>

            {/* VISTA IMPRIMIBLE DE QRS */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px',
              marginTop: '12px'
            }} className="print-area">
              {[...Array(10)].map((_, i) => {
                const numero = i + 1;
                // Generar URL hacia la mesa correspondiente
                const targetUrl = `${hostUrl}/mesa/${numero}`;
                
                // Usamos la API pública de qrserver para renderizar los QRs sin necesidad de paquetes pesados en frontend
                const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(targetUrl)}&color=121212`;

                return (
                  <div 
                    key={numero}
                    className="qr-card-printable"
                    style={{
                      background: 'white',
                      color: '#121212',
                      borderRadius: '16px',
                      border: '2px solid #eae6df',
                      padding: '24px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                      pageBreakInside: 'avoid'
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: '#c5a880', margin: 0 }}>BIANCO</span>
                    <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: '#656565', marginTop: '-2px', marginBottom: '12px' }}>Pastelería de Autor</p>
                    
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: '#121212',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      marginBottom: '16px',
                      border: '3px solid #c5a880'
                    }}>
                      {numero}
                    </div>

                    {/* QR Code Container */}
                    <div style={{
                      width: '180px',
                      height: '180px',
                      position: 'relative',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #eae6df',
                      padding: '10px',
                      borderRadius: '8px',
                      background: '#fff'
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={qrImgSrc} 
                        alt={`QR Mesa ${numero}`} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>

                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#121212', marginBottom: '4px' }}>Escaneá el QR</h4>
                    <p style={{ fontSize: '10px', color: '#656565', lineHeight: 1.3, maxWidth: '200px', margin: '0 auto' }}>
                      Mirá la carta, hacé tu pedido, agregá agua/café o llamá al mozo desde tu celular.
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. BASE DE DATOS E INICIALIZACIÓN */}
        {tabActiva === 'database' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 500 }}>Configuración y Estado de la Base de Datos</h2>
            
            <div style={{ background: '#161616', border: '1px solid #262626', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={16} style={{ color: 'var(--accent-gold)' }} />
                <span>Inicialización Automática</span>
              </h3>
              
              <p style={{ fontSize: '13px', color: '#a0a0a0', lineHeight: 1.6, marginBottom: '20px' }}>
                Si acabas de clonar el proyecto o configurar las credenciales de Supabase en tu archivo <code style={{ color: 'var(--accent-gold)' }}>.env.local</code> y la base de datos está vacía, puedes presionar el botón de abajo para sembrar la base de datos.
                Esto creará automáticamente las categorías, insertará los productos de autor de la pastelería y creará los registros de las 10 mesas iniciales de forma segura.
              </p>

              <button
                onClick={handleSeed}
                disabled={seeding}
                style={{
                  background: 'var(--accent-gold)',
                  color: '#121212',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {seeding ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Sembrando datos...</span>
                  </>
                ) : (
                  <>
                    <Database size={16} />
                    <span>Inicializar / Sembrar Base de Datos</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </main>

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
        
        @media print {
          .no-print, header, nav, button {
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
          }
        }
      `}</style>
    </div>
  );
}
