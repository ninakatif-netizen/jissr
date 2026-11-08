// Makes Jissr installable and usable offline (service worker), and offers the install button.
export function registerSW() {
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
let deferred = null;
export function onInstallReady(cb) {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; cb(); });
  window.addEventListener('appinstalled', () => { deferred = null; cb(); });
}
export const canPrompt = () => !!deferred;
export async function promptInstall() { if (!deferred) return false; deferred.prompt(); const r = await deferred.userChoice; deferred = null; return r.outcome === 'accepted'; }
