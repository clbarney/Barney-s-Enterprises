'use client';

import { useEffect } from 'react';
import { GameSettingsOptions } from '@/types/monopoly';

export function useBatterySaver(
  setSettings: React.Dispatch<React.SetStateAction<GameSettingsOptions>>
) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let isDisposed = false;

    // 1. matchMedia prefers-reduced-motion check
    const mql = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (mql?.matches) {
      queueMicrotask(() => {
        if (!isDisposed) {
          setSettings((prev) => ({
            ...prev,
            isBatterySaver: true,
            batterySaverMode: true,
            graphicQuality: 'BATTERY_SAVER',
            graphicPreset: 'BATTERY_SAVER',
          }));
        }
      });
    }

    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches && !isDisposed) {
        setSettings((prev) => ({
          ...prev,
          isBatterySaver: true,
          batterySaverMode: true,
          graphicQuality: 'BATTERY_SAVER',
          graphicPreset: 'BATTERY_SAVER',
        }));
      }
    };
    mql?.addEventListener?.('change', handleMediaChange);

    // 2. navigator.getBattery() check
    if ('getBattery' in navigator) {
      (navigator as any)
        .getBattery?.()
        .then((battery: any) => {
          if (isDisposed) return;
          const evaluateBattery = () => {
            if (isDisposed) return;
            if (!battery.charging && battery.level <= 0.2) {
              setSettings((prev) => ({
                ...prev,
                isBatterySaver: true,
                batterySaverMode: true,
                graphicQuality: 'BATTERY_SAVER',
                graphicPreset: 'BATTERY_SAVER',
              }));
            }
          };
          evaluateBattery();
          battery.addEventListener?.('levelchange', evaluateBattery);
          battery.addEventListener?.('chargingchange', evaluateBattery);
        })
        .catch(() => {});
    }

    return () => {
      isDisposed = true;
      mql?.removeEventListener?.('change', handleMediaChange);
    };
  }, [setSettings]);
}
