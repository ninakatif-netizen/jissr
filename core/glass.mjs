// The light on the glass follows the pointer, only over things you can press.
// It sets two CSS variables (--mx, --my) on the element under the pointer; the styles do the rest.
const PRESSABLE = '.qa,.scanbig,.who4,.ig .row,a.prow,button.prow';
if (matchMedia('(hover:hover)').matches) {
  let raf = 0, ev = null;
  addEventListener('pointermove', (e) => {
    ev = e; if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const el = ev.target && ev.target.closest && ev.target.closest(PRESSABLE); if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${Math.round(ev.clientX - r.left)}px`); el.style.setProperty('--my', `${Math.round(ev.clientY - r.top)}px`);
    });
  }, { passive: true });
}
