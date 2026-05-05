import { useEffect, useRef } from 'react';
import { Browser } from '@capacitor/browser';
import BrowserTimer from '../plugins/BrowserTimer';

/**
 * useBrowserTimer – Hook that automatically starts/stops the Dynamic Island
 * Live Activity when the in-app browser opens/closes.
 *
 * Detects open by wrapping the component that calls Browser.open (Home.jsx).
 * Detects close via Capacitor's browserFinished event.
 */
export default function useBrowserTimer() {
  const isActiveRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    let finishedHandle = null;

    async function startDynamicIsland(url) {
      try {
        const status = await BrowserTimer.isAvailable();
        if (!status.available || !status.enabled) {
          console.log('[BrowserTimer] Live Activities not available, skipping');
          return;
        }
        isActiveRef.current = true;
        await BrowserTimer.startTimer({
          url: url || 'https://example.com',
          label: 'Searching on Google...',
        });
        console.log('[BrowserTimer] Dynamic Island timer started');
      } catch (e) {
        console.warn('[BrowserTimer] Failed to start timer:', e);
      }
    }

    async function stopDynamicIsland() {
      if (!isActiveRef.current) return;
      try {
        await BrowserTimer.stopTimer();
        isActiveRef.current = false;
        console.log('[BrowserTimer] Dynamic Island timer stopped');
      } catch (e) {
        console.warn('[BrowserTimer] Failed to stop timer:', e);
      }
    }

    // Listen for browser CLOSE via Capacitor's event system
    Browser.addListener('browserFinished', () => {
      console.log('[BrowserTimer] Browser finished');
      if (mounted) {
        stopDynamicIsland();
      }
    }).then(handle => {
      finishedHandle = handle;
    }).catch(e => {
      console.warn('[BrowserTimer] Could not add browserFinished listener:', e);
    });

    // Expose startDynamicIsland globally so components can call it
    // when they call Browser.open()
    window.__browserTimerStart = (url) => {
      console.log('[BrowserTimer] Browser opened, starting timer');
      if (mounted) {
        startDynamicIsland(url);
      }
    };

    window.__browserTimerStop = () => {
      if (mounted) {
        stopDynamicIsland();
      }
    };

    return () => {
      mounted = false;
      delete window.__browserTimerStart;
      delete window.__browserTimerStop;
      if (finishedHandle) finishedHandle.remove();
      stopDynamicIsland();
    };
  }, []);
}

/**
 * Call this after Browser.open() in any component to trigger the Dynamic Island timer.
 * Usage:
 *   import { triggerBrowserTimer } from '../hooks/useBrowserTimer';
 *   await Browser.open({ url: '...' });
 *   triggerBrowserTimer(url);
 */
export function triggerBrowserTimer(url) {
  if (typeof window.__browserTimerStart === 'function') {
    window.__browserTimerStart(url);
  }
}
