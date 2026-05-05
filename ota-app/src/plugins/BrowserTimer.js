import { registerPlugin } from '@capacitor/core';

/**
 * BrowserTimer – Capacitor plugin for Dynamic Island Live Activity
 *
 * Starts a timer in the Dynamic Island when the in-app browser opens,
 * and dismisses it when the browser closes.
 */
const BrowserTimer = registerPlugin('BrowserTimerPlugin');

export default BrowserTimer;
