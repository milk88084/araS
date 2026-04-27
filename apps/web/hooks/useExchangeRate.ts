"use client";

import { useState, useEffect } from "react";

const CACHE_KEY = "usd_twd_rate";
const CACHE_TTL_MS = 86400000; // 24 hours
const DEFAULT_RATE = 32.5;

interface CachedRate {
  rate: number;
  timestamp: number;
}

export function useExchangeRate(): {
  rate: number;
  isManual: boolean;
  isLoading: boolean;
  convertToTWD: (usdAmount: number) => number;
  setManualRate: (rate: number) => void;
} {
  const [rate, setRate] = useState<number>(DEFAULT_RATE);
  const [isManual, setIsManual] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadRate() {
      // Check localStorage cache first
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed: CachedRate = JSON.parse(cached);
          const age = Date.now() - parsed.timestamp;
          if (age < CACHE_TTL_MS && parsed.rate > 0) {
            setRate(parsed.rate);
            setIsManual(false);
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Ignore parse errors — fall through to fetch
      }

      // Fetch fresh rate via server-side proxy (avoids CSP restrictions)
      try {
        const res = await fetch("/api/exchange-rate");
        if (!res.ok) throw new Error("Non-OK response");
        const data: { TWD: number } = await res.json();
        const fetched = data.TWD;
        if (!fetched || fetched <= 0) throw new Error("Invalid rate");

        const cached: CachedRate = { rate: fetched, timestamp: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
        setRate(fetched);
        setIsManual(false);
      } catch {
        // Fall back to manual / default
        setIsManual(true);
        setRate(DEFAULT_RATE);
      } finally {
        setIsLoading(false);
      }
    }

    loadRate();
  }, []);

  function setManualRate(newRate: number) {
    setRate(newRate);
    setIsManual(true);
    try {
      const cached: CachedRate = { rate: newRate, timestamp: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    } catch {
      // Ignore storage errors
    }
  }

  function convertToTWD(usdAmount: number): number {
    return usdAmount * rate;
  }

  return { rate, isManual, isLoading, convertToTWD, setManualRate };
}
