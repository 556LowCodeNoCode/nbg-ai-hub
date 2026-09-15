/**
 * Wires each <section data-listing-filter-bar> to flip `data-stuck="true"`
 * once it has scrolled up against the top of the viewport. The CSS in
 * `listing-rows.css` shows a subtle drop shadow only when stuck so the bar
 * reads as floating over content.
 *
 * Implementation: a 1px probe placed just above each bar. When the probe
 * leaves the viewport top, the bar is stuck. Pure CSS can't detect this.
 *
 * Used by /skills, /tips, /use-cases. Imported via <script> tag so each
 * page wires automatically.
 */
export function wireStickyFilterBars(): void {
  const bars = document.querySelectorAll<HTMLElement>('[data-listing-filter-bar]');
  bars.forEach((bar) => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;width:1px;height:1px;left:0;top:-1px;pointer-events:none;';
    bar.style.position = bar.style.position || 'sticky';
    bar.insertAdjacentElement('beforebegin', probe);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        bar.dataset.stuck = entry.isIntersecting ? 'false' : 'true';
      },
      { threshold: [1] },
    );
    observer.observe(probe);
  });
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireStickyFilterBars);
  } else {
    wireStickyFilterBars();
  }
}
