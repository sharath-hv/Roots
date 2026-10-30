import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { STORAGE_KEYS } from '../config';
import { productById } from '../data/products';
import { readStorage, writeStorage } from '../lib/storage';

export interface CartLine {
  id: string;
  qty: number;
}

interface State {
  lines: CartLine[];
  open: boolean;
}

type Action =
  | { type: 'add'; id: string; qty: number }
  | { type: 'set'; id: string; qty: number }
  | { type: 'remove'; id: string }
  | { type: 'clear' }
  | { type: 'open' }
  | { type: 'close' };

const clampQty = (id: string, qty: number) => Math.max(0, Math.min(qty, productById[id]?.stock ?? 0));

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add': {
      const existing = state.lines.find((l) => l.id === action.id);
      const qty = clampQty(action.id, (existing?.qty ?? 0) + action.qty);
      if (!qty) return state;
      const lines = existing
        ? state.lines.map((l) => (l.id === action.id ? { ...l, qty } : l))
        : [...state.lines, { id: action.id, qty }];
      return { ...state, lines };
    }
    case 'set': {
      const qty = clampQty(action.id, action.qty);
      return {
        ...state,
        lines: qty ? state.lines.map((l) => (l.id === action.id ? { ...l, qty } : l)) : state.lines.filter((l) => l.id !== action.id),
      };
    }
    case 'remove':
      return { ...state, lines: state.lines.filter((l) => l.id !== action.id) };
    case 'clear':
      return { ...state, lines: [] };
    case 'open':
      return { ...state, open: true };
    case 'close':
      return { ...state, open: false };
  }
}

function initial(): State {
  const saved = readStorage<CartLine[]>(STORAGE_KEYS.cart, []);
  const lines = Array.isArray(saved)
    ? saved.filter((l) => productById[l?.id] && l.qty > 0).map((l) => ({ id: l.id, qty: clampQty(l.id, l.qty) })).filter((l) => l.qty > 0)
    : [];
  return { lines, open: false };
}

interface CartApi {
  lines: CartLine[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  add(id: string, qty: number): void;
  setQty(id: string, qty: number): void;
  remove(id: string): void;
  open(returnFocusTo?: HTMLElement | null): void;
  close(): void;
  /** Element focus goes back to when the drawer closes. */
  returnFocus: React.MutableRefObject<HTMLElement | null>;
}

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initial);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => writeStorage(STORAGE_KEYS.cart, state.lines), [state.lines]);

  const open = useCallback((from?: HTMLElement | null) => {
    returnFocus.current = from ?? (document.activeElement as HTMLElement | null);
    dispatch({ type: 'open' });
  }, []);

  const api = useMemo<CartApi>(
    () => ({
      lines: state.lines,
      count: state.lines.reduce((n, l) => n + l.qty, 0),
      subtotal: state.lines.reduce((sum, l) => sum + l.qty * (productById[l.id]?.price ?? 0), 0),
      isOpen: state.open,
      add: (id, qty) => dispatch({ type: 'add', id, qty }),
      setQty: (id, qty) => dispatch({ type: 'set', id, qty }),
      remove: (id) => dispatch({ type: 'remove', id }),
      open,
      close: () => dispatch({ type: 'close' }),
      returnFocus,
    }),
    [state, open],
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
