'use client';

/**
 * Piezas de UI compartidas entre la carta de delivery (src/app/page.tsx) y
 * la carta de mesa vía QR (src/app/mesa/[id]/page.tsx). Antes vivían
 * duplicadas casi al carácter en los dos archivos; consolidarlas acá
 * asegura que un arreglo de responsividad se aplique en los dos lugares
 * donde el cliente realmente los usa.
 */

import React from 'react';
import Image from 'next/image';
import { Coffee, Search, X, Plus, Minus, Loader2, SearchX } from 'lucide-react';
import type { Producto } from '../lib/mockData';
import { Badge, EmptyState, IconButton, Skeleton } from './ui';

/* ------------------------------------------------------------------ */
/* Buscador de carta                                                    */
/* ------------------------------------------------------------------ */

export function MenuSearchBar({
  value,
  onChange,
  placeholder = 'Buscar en la carta...',
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Buscar en la carta"
        className="w-full rounded-full border border-line bg-card py-3 pl-11 pr-11 text-sm text-ink shadow-sm outline-none placeholder:text-ink-soft/70"
      />
      {value && (
        <IconButton
          label="Limpiar búsqueda"
          icon={X}
          variant="ghost"
          size="sm"
          className="absolute right-1.5 top-1/2 -translate-y-1/2"
          onClick={() => onChange('')}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Navegación de categorías                                            */
/* ------------------------------------------------------------------ */

export function CategoryNav({
  categorias,
  activa,
  onChange,
  className = '',
}: {
  categorias: string[];
  activa: string;
  onChange: (cat: string) => void;
  className?: string;
}) {
  const all = ['Todos', ...categorias];
  return (
    <nav
      aria-label="Categorías de la carta"
      className={`no-scrollbar flex gap-2 overflow-x-auto px-4 sm:px-6 py-1 ${className}`}
    >
      {all.map((cat) => {
        const isActive = activa === cat;
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            aria-pressed={isActive}
            className={[
              'shrink-0 rounded-full border px-4 py-2.5 text-sm font-medium shadow-sm transition-colors cursor-pointer',
              isActive
                ? 'border-ink bg-ink text-cream'
                : 'border-line bg-card text-ink hover:bg-black/[0.03]',
            ].join(' ')}
          >
            {cat}
          </button>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Grilla + skeletons                                                   */
/* ------------------------------------------------------------------ */

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="product-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
          <Skeleton className="product-card-image-container w-full rounded-none" />
          <div className="p-3 sm:p-4 flex flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-8 w-full mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MenuLoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 min-h-[160px] py-10">
      <Loader2 className="animate-spin text-gold" size={30} />
      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  );
}

export function NoResultsState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={SearchX}
      title="No encontramos nada"
      description={`No hay platos que coincidan con "${query}". Probá con otra palabra o cambiá de categoría.`}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Tarjeta de producto                                                  */
/* ------------------------------------------------------------------ */

export interface ProductCardProps {
  producto: Producto;
  cantidadEnCarrito: number;
  onAdd: () => void;
  onRemove: () => void;
  onOpenNota: () => void;
  priority?: boolean;
}

export function ProductCard({ producto, cantidadEnCarrito, onAdd, onRemove, onOpenNota, priority }: ProductCardProps) {
  const sinStock = producto.stock !== undefined && producto.stock !== null && producto.stock <= 0;
  const stockBajo =
    !sinStock && producto.stock !== undefined && producto.stock !== null && producto.stock <= (producto.stockMinimo ?? 0);
  const alCupo =
    producto.stock !== undefined && producto.stock !== null && cantidadEnCarrito >= producto.stock;

  return (
    <div className="product-card flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
      <div className="product-card-image-container relative w-full">
        <Image
          src={producto.imagenUrl}
          alt={producto.nombre}
          fill
          sizes="(max-width: 480px) 45vw, (max-width: 768px) 30vw, 240px"
          priority={priority}
          style={{ objectFit: 'cover' }}
        />
        {producto.esCafe && (
          <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-medium text-ink shadow-sm">
            <Coffee size={12} /> Café
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-3 sm:p-4">
        <div>
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <h3 className="text-sm sm:text-base font-semibold leading-snug text-ink font-sans">{producto.nombre}</h3>
            <span className="shrink-0 text-sm font-bold text-gold">
              ${producto.precio.toLocaleString('es-AR')}
            </span>
          </div>
          <p className="line-clamp-2 mb-2 text-xs text-ink-soft leading-snug">{producto.descripcion}</p>

          {(sinStock || stockBajo) && (
            <div className="mb-2">
              <Badge tone={sinStock ? 'danger' : 'warning'}>
                {sinStock ? 'Sin stock' : `¡Últimos ${producto.stock}!`}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onOpenNota}
            disabled={sinStock}
            title="Agregar una nota / personalización"
            aria-label={`Agregar nota para ${producto.nombre}`}
            className="shrink-0 rounded-lg border border-line px-2.5 py-2 text-[11px] font-medium text-ink-soft transition-colors hover:bg-black/[0.03] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Nota
          </button>

          {cantidadEnCarrito > 0 ? (
            <div className="flex flex-1 items-center justify-between rounded-lg border border-gold bg-gold-light px-1 py-1">
              <IconButton label={`Quitar uno de ${producto.nombre}`} icon={Minus} size="sm" onClick={onRemove} className="bg-white" />
              <span className="text-sm font-bold text-ink">{cantidadEnCarrito}</span>
              <IconButton
                label={`Agregar uno más de ${producto.nombre}`}
                icon={Plus}
                size="sm"
                variant="secondary"
                onClick={onAdd}
                disabled={alCupo}
              />
            </div>
          ) : (
            <button
              onClick={onAdd}
              disabled={sinStock}
              className={[
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-semibold cursor-pointer transition-colors min-h-[40px]',
                sinStock ? 'bg-line text-ink-soft cursor-not-allowed' : 'bg-ink text-cream hover:opacity-90',
              ].join(' ')}
            >
              <Plus size={14} />
              <span>{sinStock ? 'Agotado' : 'Agregar'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal de notas de preparación                                       */
/* ------------------------------------------------------------------ */

export { Modal as NotesModalShell } from './ui';
