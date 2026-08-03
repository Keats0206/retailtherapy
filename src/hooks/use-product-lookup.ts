"use client";

import { useCallback, useState } from "react";

import { readResponseJson } from "@/lib/fetch-json";
import type { Product } from "@/lib/types";

export function useProductLookup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (url: string): Promise<Product | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/products/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await readResponseJson<{ product?: Product; error?: string }>(
        res,
      );
      if (!res.ok) {
        throw new Error(data.error ?? "Couldn't find that product");
      }
      if (!data.product) {
        throw new Error("Couldn't find that product");
      }
      return data.product;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { lookup, loading, error, setError, clearError };
}
