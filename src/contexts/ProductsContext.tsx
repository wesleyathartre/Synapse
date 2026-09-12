'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { PRODUCTS as DEFAULT_PRODUCTS, PRODUCT_CATEGORIES } from '@/lib/constants';

export interface ProductItem {
  code: string;
  label: string;
  color: string;
  emoji: string;
  category: string;
  active: boolean;
  custom: boolean;
  sort: number;
}

export interface ProductGroup {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface ProductsCtx {
  products: ProductItem[]; // catálogo completo (ativos + inativos)
  map: Record<string, ProductItem>; // por código, para exibição
  groups: ProductGroup[]; // apenas ativos, agrupados por categoria (para selects)
  categories: { key: string; label: string }[];
  loading: boolean;
  refresh: () => Promise<void>;
}

// Catálogo padrão (fallback antes do fetch ou sem sessão)
const fallbackProducts: ProductItem[] = Object.entries(DEFAULT_PRODUCTS).map(
  ([code, p], i) => ({ code, ...p, active: true, custom: false, sort: i }),
);

function buildMap(list: ProductItem[]) {
  return Object.fromEntries(list.map((p) => [p.code, p])) as Record<string, ProductItem>;
}

function buildGroups(list: ProductItem[]): ProductGroup[] {
  return PRODUCT_CATEGORIES.map((cat) => ({
    key: cat.key,
    label: cat.label,
    options: list
      .filter((p) => p.active && p.category === cat.key)
      .map((p) => ({ value: p.code, label: `${p.emoji} ${p.label}` })),
  })).filter((g) => g.options.length > 0);
}

const Ctx = createContext<ProductsCtx>({} as ProductsCtx);

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<ProductItem[]>(fallbackProducts);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const { data } = await res.json();
        if (Array.isArray(data) && data.length) setProducts(data);
      }
    } catch {
      // mantém o fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<ProductsCtx>(
    () => ({
      products,
      map: buildMap(products),
      groups: buildGroups(products),
      categories: PRODUCT_CATEGORIES,
      loading,
      refresh,
    }),
    [products, loading, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useProducts = () => useContext(Ctx);
