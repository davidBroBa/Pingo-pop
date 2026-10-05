"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  parseStoredCart,
  serializeCart,
  STORAGE_KEY,
  type QuoteCartItem,
} from "@/lib/quote-cart-storage";

// El tipo vive en el modulo de almacenamiento porque sale de su esquema. Se
// re-exporta para no romper a quien lo importaba desde aqui.
export type { QuoteCartItem };

type QuoteCartContextType = {
  items: QuoteCartItem[];
  addItem: (item: Omit<QuoteCartItem, "quantity">) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
};

const QuoteCartContext = createContext<QuoteCartContextType | undefined>(
  undefined,
);

export function QuoteCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<QuoteCartItem[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      return parseStoredCart(localStorage.getItem(STORAGE_KEY));
    } catch {
      // Almacenamiento no disponible (politica del navegador, modo sin
      // almacen). El carrito sigue funcionando en memoria.
      return [];
    }
  });

  // Persiste cada cambio. Es idempotente y se auto-repara: si lo guardado era
  // invalido, la hidratacion devuelve [] y este efecto termina borrando la
  // entrada en vez de dejarla corrupta. El `catch` cubre el caso de cuota
  // llena o modo privado, donde `setItem` lanza.
  useEffect(() => {
    try {
      if (items.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      localStorage.setItem(STORAGE_KEY, serializeCart(items));
    } catch {
      // Sin persistencia, pero sin romper la pagina.
    }
  }, [items]);

  function addItem(item: Omit<QuoteCartItem, "quantity">) {
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (currentItem) => currentItem.id === item.id,
      );

      if (existingItem) {
        return currentItems.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                quantity: currentItem.quantity + 1,
              }
            : currentItem,
        );
      }

      return [...currentItems, { ...item, quantity: 1 }];
    });
  }

  function removeItem(id: number) {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
  }

  function updateQuantity(id: number, quantity: number) {
    if (quantity < 1) return;

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, quantity } : item,
      ),
    );
  }

  function clearCart() {
    setItems([]);
  }

  const itemCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  return (
    <QuoteCartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
      }}
    >
      {children}
    </QuoteCartContext.Provider>
  );
}

export function useQuoteCart() {
  const context = useContext(QuoteCartContext);

  if (!context) {
    throw new Error("useQuoteCart debe utilizarse dentro de QuoteCartProvider");
  }

  return context;
}
