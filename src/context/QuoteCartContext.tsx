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
  // El estado arranca SIEMPRE vacio, tambien en el servidor. Leer localStorage en
  // el inicializador de useState hace que el servidor y el cliente pinten ramas
  // distintas y React tire la hydration con `Error: Hydration failed`, repintando
  // el arbol entero. La carga va en un efecto, que solo corre en el navegador, y
  // asi la primera hidratacion coincide con el HTML ya enviado.
  const [items, setItems] = useState<QuoteCartItem[]>([]);
  const [cargado, setCargado] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- esta regla busca estado
     DERIVADO de props u otro estado, que se resuelve en el render. Aqui se lee un
     almacen externo mutable (localStorage) que solo existe en el navegador: no hay
     forma de derivarlo durante el render sin que el servidor y el cliente pinten
     ramas distintas. La alternativa correcta seria useSyncExternalStore, que exige
     convertir el carrito en un store externo y reescribir los cuatro mutadores;
     queda anotado como deuda, no como error. */
  useEffect(() => {
    try {
      setItems(parseStoredCart(localStorage.getItem(STORAGE_KEY)));
    } catch {
      // Almacenamiento no disponible (politica del navegador, modo sin
      // almacen). El carrito sigue funcionando en memoria.
      setItems([]);
    }

    setCargado(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persiste cada cambio, pero solo cuando ya se ha intentado leer. Sin este
  // guard, el efecto de escritura veria el carrito vacio del primer render y
  // borraria la clave antes de que la lectura la alcanzase.
  //
  // Es idempotente y se auto-repara: si lo guardado era invalido, la carga
  // devuelve [] y este efecto termina borrando la entrada en vez de dejarla
  // corrupta. El `catch` cubre cuota llena o modo privado, donde `setItem` lanza.
  useEffect(() => {
    if (!cargado) {
      return;
    }

    try {
      if (items.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      localStorage.setItem(STORAGE_KEY, serializeCart(items));
    } catch {
      // Sin persistencia, pero sin romper la pagina.
    }
  }, [items, cargado]);

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
