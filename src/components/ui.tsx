'use client';

/**
 * Componentes de UI compartidos de Mixtura de Sabores.
 *
 * Centraliza los patrones que antes se repetían (y se veían distinto) en
 * page.tsx, mesa/[id]/page.tsx y admin/page.tsx: botones, badges, estados
 * vacíos, skeletons de carga, modal/drawer responsive, toasts y diálogos
 * de confirmación (en reemplazo de alert()/confirm() nativos).
 *
 * Todo vive en un solo archivo a propósito: son piezas chicas y muy
 * relacionadas entre sí (Toast/Confirm comparten el mismo patrón de
 * contexto), y mantenerlas juntas evita ida y vuelta de imports.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  Inbox,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-cream hover:opacity-90 shadow-sm disabled:opacity-50',
  secondary: 'bg-gold text-white hover:bg-[var(--color-gold-hover)] shadow-sm disabled:opacity-50',
  outline: 'bg-transparent text-ink border border-line hover:bg-black/[0.03] disabled:opacity-50',
  ghost: 'bg-transparent text-ink-soft hover:bg-black/[0.04] disabled:opacity-50',
  danger: 'bg-danger text-white hover:opacity-90 shadow-sm disabled:opacity-50',
  success: 'bg-success text-white hover:opacity-90 shadow-sm disabled:opacity-50',
};

const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-2 gap-1.5 min-h-[36px]',
  md: 'text-sm px-4 py-2.5 gap-2 min-h-[44px]',
  lg: 'text-base px-5 py-3.5 gap-2 min-h-[48px]',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ComponentType<{ size?: number | string; className?: string }>;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center rounded-lg font-semibold cursor-pointer',
        'transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100',
        buttonVariantClasses[variant],
        buttonSizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />
      ) : (
        Icon && iconPosition === 'left' && <Icon size={size === 'sm' ? 14 : 16} />
      )}
      {children && <span>{children}</span>}
      {!loading && Icon && iconPosition === 'right' && <Icon size={size === 'sm' ? 14 : 16} />}
    </button>
  );
}

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: React.ComponentType<{ size?: number | string }>;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function IconButton({
  label,
  icon: Icon,
  variant = 'outline',
  size = 'md',
  className = '',
  ...props
}: IconButtonProps) {
  const dims = size === 'sm' ? 'w-9 h-9' : size === 'lg' ? 'w-12 h-12' : 'w-11 h-11';
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;
  return (
    <button
      aria-label={label}
      title={label}
      className={[
        'inline-flex items-center justify-center rounded-full cursor-pointer shrink-0',
        'transition-transform active:scale-[0.94] disabled:opacity-40 disabled:cursor-not-allowed',
        dims,
        buttonVariantClasses[variant],
        className,
      ].join(' ')}
      {...props}
    >
      <Icon size={iconSize} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Badge                                                                */
/* ------------------------------------------------------------------ */

type BadgeTone = 'neutral' | 'gold' | 'success' | 'warning' | 'danger' | 'info';

const badgeToneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-black/5 text-ink-soft',
  gold: 'bg-[color-mix(in_srgb,var(--color-gold)_15%,transparent)] text-[var(--color-gold-hover)]',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  info: 'bg-info-bg text-info',
};

export function Badge({
  tone = 'neutral',
  className = '',
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap',
        badgeToneClasses[tone],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state & Skeleton                                              */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 px-6 text-center ${className}`}>
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gold-light text-gold">
        <Icon size={26} />
      </div>
      <div>
        <p className="text-base font-semibold text-ink">{title}</p>
        {description && <p className="text-sm text-ink-soft mt-1 max-w-xs">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} aria-hidden="true" />;
}

/* ------------------------------------------------------------------ */
/* Modal / Drawer                                                       */
/* ------------------------------------------------------------------ */

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** 'dialog' = centrado (se usa para confirmaciones/formularios cortos).
   *  'drawer' = panel lateral en desktop que se convierte en hoja inferior en mobile. */
  variant?: 'dialog' | 'drawer';
  size?: 'sm' | 'md' | 'lg';
  closeOnBackdrop?: boolean;
}

const modalSizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  variant = 'dialog',
  size = 'md',
  closeOnBackdrop = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && focusable && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const isDrawer = variant === 'drawer';

  return (
    <div
      className="fixed inset-0 z-100 flex bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      style={{ justifyContent: isDrawer ? 'flex-end' : 'center', alignItems: isDrawer ? 'stretch' : 'center' }}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={[
          'bg-cream text-ink shadow-2xl flex flex-col outline-none',
          isDrawer
            ? 'drawer-panel w-full sm:max-w-md h-full sm:h-full rounded-none sm:rounded-l-2xl p-5 sm:p-6'
            : `animate-fade-scale w-full ${modalSizeClasses[size]} rounded-2xl p-6 max-h-[90vh]`,
        ].join(' ')}
      >
        {(title || true) && (
          <div className="flex items-start justify-between gap-4 mb-4 shrink-0">
            <div>
              {title && (
                <h3 id={titleId} className="text-lg sm:text-xl font-semibold leading-tight">
                  {title}
                </h3>
              )}
              {subtitle && <p className="text-xs text-ink-soft mt-1">{subtitle}</p>}
            </div>
            <IconButton label="Cerrar" icon={X} variant="ghost" size="sm" onClick={onClose} />
          </div>
        )}
        <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
        {footer && <div className="pt-4 mt-4 border-t border-line shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toast                                                                */
/* ------------------------------------------------------------------ */

type ToastTone = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toastIcons: Record<ToastTone, React.ComponentType<{ size?: number }>> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const toastToneClasses: Record<ToastTone, string> = {
  success: 'bg-ink text-cream',
  error: 'bg-danger text-white',
  info: 'bg-ink text-cream',
  warning: 'bg-warning text-white',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed top-4 inset-x-0 z-200 flex flex-col items-center gap-2 px-4 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const Icon = toastIcons[t.tone];
          return (
            <div
              key={t.id}
              className={[
                'animate-toast-in pointer-events-auto flex items-center gap-2 rounded-full px-4 py-3 shadow-lg text-sm font-medium max-w-[90vw] sm:max-w-sm',
                toastToneClasses[t.tone],
              ].join(' ')}
            >
              <Icon size={16} />
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Confirm dialog (reemplazo de window.confirm)                        */
/* ------------------------------------------------------------------ */

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

type ConfirmContextValue = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ options: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);

  const confirmFn = useCallback<ConfirmContextValue>((options) => {
    return new Promise<boolean>((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  const handleClose = (result: boolean) => {
    state?.resolve(result);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirmFn}>
      {children}
      <Modal
        open={!!state}
        onClose={() => handleClose(false)}
        title={state?.options.title}
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => handleClose(false)}>
              {state?.options.cancelLabel || 'Cancelar'}
            </Button>
            <Button
              variant={state?.options.tone === 'danger' ? 'danger' : 'primary'}
              fullWidth
              onClick={() => handleClose(true)}
            >
              {state?.options.confirmLabel || 'Confirmar'}
            </Button>
          </div>
        }
      >
        {state?.options.description && <p className="text-sm text-ink-soft">{state.options.description}</p>}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx;
}

/* ------------------------------------------------------------------ */
/* App-wide providers: envuelve Toast + Confirm en un solo componente   */
/* ------------------------------------------------------------------ */

export function UiProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  );
}
