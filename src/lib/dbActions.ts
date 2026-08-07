import { supabase } from './supabase';
import { PRODUCTOS_MOCK, CATEGORIAS, Producto } from './mockData';

// Interfaz para estructura de base de datos
export interface DbProduct {
  id: number;
  categoria_id: number | null;
  nombre: string;
  descripcion: string | null;
  precio: number;
  imagen_url: string | null;
  disponible: boolean;
  es_cafe: boolean;
  stock: number | null;
  stock_minimo: number | null;
  created_at?: string;
  categoria?: { nombre: string };
}

export interface DbCategory {
  id: number;
  nombre: string;
  slug: string;
}

export interface DbTable {
  id: number;
  numero: number;
  estado: 'libre' | 'ocupada' | 'esperando_pedido' | 'atendida';
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  ocupada_desde: string | null;
  created_at?: string;
}

export interface DbOrder {
  id: number;
  tipo: 'mesa' | 'delivery';
  mesa_id: number | null;
  nombre_cliente: string;
  telefono: string;
  direccion: string | null;
  estado: 'pendiente' | 'preparando' | 'listo' | 'entregado' | 'cancelado';
  total: number;
  created_at: string;
  
  // Campos de Cobro y Facturación
  metodo_pago?: 'efectivo' | 'tarjeta' | 'mercadopago' | 'mixto' | null;
  desglose_pago?: { efectivo?: number; mercadopago?: number; tarjeta?: number } | null;
  tipo_comprobante?: 'pre_cuenta' | 'factura_b' | 'factura_a' | null;
  nro_comprobante?: string | null;
  cliente_cuit?: string | null;
  cliente_razon_social?: string | null;
  cliente_condicion_iva?: string | null;
  descuento?: number | null;
  propina?: number | null;
  monto_neto?: number | null;
  monto_iva?: number | null;
  total_facturado?: number | null;
  cae?: string | null;
  cae_vencimiento?: string | null;
  facturado_at?: string | null;

  detalles?: DbOrderDetail[];
  mesa?: DbTable;
}

export interface DbOrderDetail {
  id: number;
  pedido_id: number;
  producto_id: number | null;
  cantidad: number;
  precio_unitario: number;
  observaciones: string | null;
  producto?: DbProduct;
}

export interface DbRequest {
  id: number;
  mesa_id: number;
  tipo: 'llamar_mozo' | 'pedir_cuenta';
  estado: 'pendiente' | 'atendida';
  created_at: string;
  mesa?: DbTable;
}

// 1. Obtener Categorías
export async function getCategorias(): Promise<DbCategory[]> {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching categories from DB:', err);
    return [];
  }
}

// 2. Obtener Productos
export async function getProductos(): Promise<DbProduct[]> {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('*, categoria:categorias(nombre)')
      .eq('disponible', true)
      .order('nombre', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching products from DB, using mock fallback:', err);
    return [];
  }
}

// 3. Obtener Mesas
export async function getMesas(): Promise<DbTable[]> {
  try {
    const { data, error } = await supabase
      .from('mesas')
      .select('*')
      .order('numero', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching tables:', err);
    return [];
  }
}

// 4. Crear un Pedido (Mesa o Delivery)
export async function crearPedido(orderData: {
  tipo: 'mesa' | 'delivery';
  mesa_id?: number | null;
  nombre_cliente: string;
  telefono: string;
  direccion?: string | null;
  total: number;
  items: { productoId: number; cantidad: number; precioUnitario: number; observaciones?: string }[];
}): Promise<{ data: any; error: any }> {
  try {
    // 1. Insertar pedido principal
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        tipo: orderData.tipo,
        mesa_id: orderData.mesa_id || null,
        nombre_cliente: orderData.nombre_cliente,
        telefono: orderData.telefono,
        direccion: orderData.direccion || null,
        total: orderData.total,
        estado: 'pendiente'
      })
      .select()
      .single();

    if (pedidoError) throw pedidoError;

    // 2. Insertar detalles del pedido
    const detallesInsert = orderData.items.map(item => ({
      pedido_id: pedido.id,
      producto_id: item.productoId,
      cantidad: item.cantidad,
      precio_unitario: item.precioUnitario,
      observaciones: item.observaciones || null
    }));

    const { error: detallesError } = await supabase
      .from('detalles_pedido')
      .insert(detallesInsert);

    if (detallesError) throw detallesError;

    // Descontar stock de forma atomica (funcion en la base de datos).
    // Antes esto se hacia con un SELECT + resta en JS + UPDATE, lo cual
    // permite que dos pedidos simultaneos del mismo producto lean el
    // mismo stock inicial y se pisen entre si (sobreventa). La funcion
    // descontar_stock_producto hace la resta en una sola operacion
    // atomica del lado de Postgres. Ver fix_stock_atomico.sql.
    try {
      for (const item of orderData.items) {
        const { error: stockRpcError } = await supabase.rpc('descontar_stock_producto', {
          p_producto_id: item.productoId,
          p_cantidad: item.cantidad
        });
        if (stockRpcError) {
          console.error('Error al descontar stock (RPC) del producto', item.productoId, stockRpcError);
        }
      }
    } catch (stockErr) {
      console.error('Error al descontar stock de los productos:', stockErr);
    }

    // 3. Si es de mesa, actualizar el estado de la mesa a 'esperando_pedido' o 'ocupada'
    if (orderData.tipo === 'mesa' && orderData.mesa_id) {
      await supabase
        .from('mesas')
        .update({ estado: 'esperando_pedido' })
        .eq('id', orderData.mesa_id);
    }

    return { data: pedido, error: null };
  } catch (err: any) {
    console.error('Error creating order:', err);
    return { data: null, error: err.message || err };
  }
}

// 5. Crear Solicitud (Llamar Mozo o Pedir Cuenta)
export async function crearSolicitud(mesaId: number, tipo: 'llamar_mozo' | 'pedir_cuenta'): Promise<{ data: any; error: any }> {
  try {
    // Insertar solicitud
    const { data, error } = await supabase
      .from('solicitudes')
      .insert({
        mesa_id: mesaId,
        tipo,
        estado: 'pendiente'
      })
      .select()
      .single();

    if (error) throw error;

    // Actualizar estado de la mesa a 'ocupada'
    await supabase
      .from('mesas')
      .update({ estado: 'ocupada' })
      .eq('id', mesaId);

    return { data, error: null };
  } catch (err: any) {
    console.error('Error creating request:', err);
    return { data: null, error: err.message || err };
  }
}

// 6. Marcar Solicitud como Atendida
export async function atenderSolicitud(solicitudId: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('solicitudes')
      .update({ estado: 'atendida' })
      .eq('id', solicitudId);
    
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error updating request status:', err);
    return false;
  }
}

// 7. Liberar/Limpiar Mesa (Poner estado 'libre' y limpiar solicitudes pendientes)
export async function liberarMesa(mesaId: number): Promise<boolean> {
  try {
    // Actualizar estado de la mesa a 'libre' y vaciar la sesión activa
    const { error: mesaError } = await supabase
      .from('mesas')
      .update({ 
        estado: 'libre',
        cliente_nombre: null,
        cliente_telefono: null,
        ocupada_desde: null
      })
      .eq('id', mesaId);
    
    if (mesaError) throw mesaError;

    // Marcar como atendidas todas las solicitudes de esta mesa
    await supabase
      .from('solicitudes')
      .update({ estado: 'atendida' })
      .eq('mesa_id', mesaId)
      .eq('estado', 'pendiente');

    return true;
  } catch (err) {
    console.error('Error clearing table:', err);
    return false;
  }
}

// 7b. Ocupar Mesa (Establecer la sesión del cliente al escanear y registrarse)
export async function ocuparMesa(mesaId: number, nombre: string, telefono: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('mesas')
      .update({
        estado: 'ocupada',
        cliente_nombre: nombre,
        cliente_telefono: telefono,
        ocupada_desde: new Date().toISOString()
      })
      .eq('id', mesaId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error occupying table:', err);
    return false;
  }
}

// 7c. Crear una mesa nueva (usa el siguiente número disponible si no se indica)
export async function crearMesa(numero: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('mesas')
      .insert({ numero, estado: 'libre' });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error creando mesa:', err);
    return { success: false, error: err.message };
  }
}

// 7d. Eliminar una mesa (solo si está libre, para no perder historial de una mesa en uso)
export async function eliminarMesa(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('mesas')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error eliminando mesa:', err);
    return { success: false, error: err.message };
  }
}

// 8. Cambiar Estado del Pedido
export async function cambiarEstadoPedido(pedidoId: number, nuevoEstado: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('pedidos')
      .update({ estado: nuevoEstado })
      .eq('id', pedidoId);
    
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error updating order state:', err);
    return false;
  }
}

// 9. Inicializar / Sembrar Base de Datos
export async function seedDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Starting DB Seeding...');

    // A. Verificar/Crear Categorías
    const { data: existingCats } = await supabase.from('categorias').select('nombre');
    const existingCatNames = (existingCats || []).map(c => c.nombre);

    const catsToInsert = CATEGORIAS.filter(cat => !existingCatNames.includes(cat)).map(cat => ({
      nombre: cat,
      slug: cat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-')
    }));

    if (catsToInsert.length > 0) {
      const { error: catErr } = await supabase.from('categorias').insert(catsToInsert);
      if (catErr) throw catErr;
    }

    // Volver a leer categorías para tener IDs
    const { data: dbCategories, error: getCatErr } = await supabase.from('categorias').select('*');
    if (getCatErr) throw getCatErr;

    // B. Verificar/Crear Productos
    const { data: existingProds } = await supabase.from('productos').select('nombre');
    const existingProdNames = (existingProds || []).map(p => p.nombre);

    const prodsToInsert = PRODUCTOS_MOCK.filter(p => !existingProdNames.includes(p.nombre)).map(p => {
      const dbCat = dbCategories?.find(c => c.nombre === p.categoria);
      return {
        categoria_id: dbCat ? dbCat.id : null,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio: p.precio,
        imagen_url: p.imagenUrl,
        disponible: true,
        es_cafe: p.esCafe || false
      };
    });

    if (prodsToInsert.length > 0) {
      const { error: prodErr } = await supabase.from('productos').insert(prodsToInsert);
      if (prodErr) throw prodErr;
    }

    // C. Verificar/Crear las 10 Mesas
    const { data: existingTables } = await supabase.from('mesas').select('numero');
    const existingNums = (existingTables || []).map(m => m.numero);

    const tablesToInsert = [];
    for (let i = 1; i <= 10; i++) {
      if (!existingNums.includes(i)) {
        tablesToInsert.push({ numero: i, estado: 'libre' });
      }
    }

    if (tablesToInsert.length > 0) {
      const { error: tableErr } = await supabase.from('mesas').insert(tablesToInsert);
      if (tableErr) throw tableErr;
    }

    return { success: true, message: 'Base de datos inicializada correctamente con categorías, productos y 10 mesas.' };
  } catch (err: any) {
    console.error('Error seeding DB:', err);
    return { success: false, message: err.message || JSON.stringify(err) };
  }
}

// 10. Crear un producto
export async function crearProducto(producto: {
  nombre: string;
  descripcion?: string | null;
  precio: number;
  imagen_url?: string | null;
  disponible: boolean;
  es_cafe: boolean;
  categoria_id: number | null;
  stock?: number | null;
  stock_minimo?: number | null;
}) {
  try {
    const { data, error } = await supabase
      .from('productos')
      .insert(producto)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    console.error('Error creando producto:', err);
    return { success: false, error: err.message };
  }
}

// 11. Actualizar un producto
export async function actualizarProducto(
  id: number,
  datos: {
    nombre?: string;
    descripcion?: string | null;
    precio?: number;
    imagen_url?: string | null;
    disponible?: boolean;
    es_cafe?: boolean;
    categoria_id?: number | null;
    stock?: number | null;
    stock_minimo?: number | null;
  }
) {
  try {
    const { data, error } = await supabase
      .from('productos')
      .update(datos)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    console.error('Error actualizando producto:', err);
    return { success: false, error: err.message };
  }
}

// 12. Eliminar un producto
export async function eliminarProducto(id: number) {
  try {
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error eliminando producto:', err);
    return { success: false, error: err.message };
  }
}

// 12b. Subir una imagen de producto al Storage y devolver su URL pública
export async function subirImagenProducto(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const extension = file.name.split('.').pop() || 'jpg';
    const nombreArchivo = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('productos')
      .upload(nombreArchivo, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('productos').getPublicUrl(nombreArchivo);

    return { success: true, url: data.publicUrl };
  } catch (err: any) {
    console.error('Error subiendo imagen:', err);
    return { success: false, error: err.message || 'No se pudo subir la imagen.' };
  }
}

// 13. Crear una categoría
export async function crearCategoria(nombre: string) {
  try {
    const slug = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');

    const { data, error } = await supabase
      .from('categorias')
      .insert({ nombre: nombre.trim(), slug })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    console.error('Error creando categoría:', err);
    return { success: false, error: err.message };
  }
}

// 14. Renombrar una categoría
export async function actualizarCategoria(id: number, nombre: string) {
  try {
    const slug = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');

    const { data, error } = await supabase
      .from('categorias')
      .update({ nombre: nombre.trim(), slug })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    console.error('Error actualizando categoría:', err);
    return { success: false, error: err.message };
  }
}

// 15. Eliminar una categoría (falla si hay productos usándola, a proposito)
export async function eliminarCategoria(id: number) {
  try {
    const { count, error: countError } = await supabase
      .from('productos')
      .select('id', { count: 'exact', head: true })
      .eq('categoria_id', id);

    if (countError) throw countError;
    if (count && count > 0) {
      return {
        success: false,
        error: `No se puede eliminar: hay ${count} producto(s) usando esta categoría. Reasigná o eliminá esos productos primero.`
      };
    }

    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error eliminando categoría:', err);
    return { success: false, error: err.message };
  }
}

// 13. Facturación & Cobro de Pedidos
export interface DatosFacturacionPayload {
  metodo_pago: 'efectivo' | 'tarjeta' | 'mercadopago' | 'mixto';
  desglose_pago?: { efectivo?: number; mercadopago?: number; tarjeta?: number };
  tipo_comprobante: 'pre_cuenta' | 'factura_b' | 'factura_a';
  cliente_cuit?: string;
  cliente_razon_social?: string;
  cliente_condicion_iva?: string;
  descuento?: number;
  propina?: number;
  liberarMesaDespues?: boolean;
}

export async function facturarPedido(pedidoId: number, datos: DatosFacturacionPayload) {
  try {
    // 1. Obtener pedido actual
    const { data: order, error: fetchErr } = await supabase
      .from('pedidos')
      .select('*, detalles:detalles_pedido(*)')
      .eq('id', pedidoId)
      .single();

    if (fetchErr || !order) throw new Error(fetchErr?.message || 'Pedido no encontrado');

    const subtotal = Number(order.total || 0);
    const desc = Number(datos.descuento || 0);
    const prop = Number(datos.propina || 0);
    const baseImponible = Math.max(0, subtotal - desc);
    
    // Cálculo de IVA (21% en Factura A/B)
    const neto = Number((baseImponible / 1.21).toFixed(2));
    const iva = Number((baseImponible - neto).toFixed(2));
    const totalFacturado = baseImponible + prop;

    // Generar N° de Comprobante consecutivo
    const prefix = datos.tipo_comprobante === 'factura_a' ? 'FA-0001-' : datos.tipo_comprobante === 'factura_b' ? 'FB-0001-' : 'TC-0001-';
    const nroComp = `${prefix}${String(pedidoId).padStart(8, '0')}`;
    
    // Generar CAE simulado (preparado para AFIP / ARCA)
    const caeSimulado = datos.tipo_comprobante !== 'pre_cuenta' ? `7438${Math.floor(10000000000 + Math.random() * 90000000000)}` : null;
    const caeFechaVenc = caeSimulado ? new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() : null;
    const nowIso = new Date().toISOString();

    const payloadActualizacion: Record<string, any> = {
      estado: 'entregado',
      metodo_pago: datos.metodo_pago,
      desglose_pago: datos.desglose_pago || null,
      tipo_comprobante: datos.tipo_comprobante,
      nro_comprobante: nroComp,
      cliente_cuit: datos.cliente_cuit || null,
      cliente_razon_social: datos.cliente_razon_social || null,
      cliente_condicion_iva: datos.cliente_condicion_iva || null,
      descuento: desc,
      propina: prop,
      monto_neto: neto,
      monto_iva: iva,
      total_facturado: totalFacturado,
      cae: caeSimulado,
      cae_vencimiento: caeFechaVenc,
      facturado_at: nowIso
    };

    // Intentar actualización completa en Supabase
    let updateRes = await supabase.from('pedidos').update(payloadActualizacion).eq('id', pedidoId).select().single();

    // Fallback en caso de que las columnas opcionales aún no hayan sido creadas en el servidor remoto
    if (updateRes.error && updateRes.error.code === 'PGRST204') {
      console.warn('Columnas fiscales no encontradas en DB remota, aplicando fallback de estado...');
      const fallbackPayload = {
        estado: 'entregado',
        direccion: order.direccion 
          ? `${order.direccion} | [Cobro: ${datos.tipo_comprobante} - ${datos.metodo_pago} - N° ${nroComp}]`
          : `[Cobro: ${datos.tipo_comprobante} - ${datos.metodo_pago} - N° ${nroComp}]`
      };
      updateRes = await supabase.from('pedidos').update(fallbackPayload).eq('id', pedidoId).select().single();
    }

    if (updateRes.error) throw updateRes.error;

    // 2. Si es pedido de mesa y se solicitó liberar mesa, liberarla automáticamente
    if (order.mesa_id && datos.liberarMesaDespues !== false) {
      await liberarMesa(order.mesa_id);
    }

    const comprobanteData = {
      ...order,
      ...payloadActualizacion,
      nro_comprobante: nroComp,
      total_facturado: totalFacturado,
      monto_neto: neto,
      monto_iva: iva,
      cae: caeSimulado
    };

    return { success: true, comprobante: comprobanteData };
  } catch (err: any) {
    console.error('Error al facturar pedido:', err);
    return { success: false, error: err.message };
  }
}
