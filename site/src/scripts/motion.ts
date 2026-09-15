/**
 * site/src/scripts/motion.ts
 *
 * Shared IntersectionObserver utility for `[data-reveal="true"]` elements
 * emitted by `MotionReveal.astro` (§S.13.5.15). On first intersection the
 * observer toggles the `.is-revealed` class and stops observing the target.
 *
 * Reduced-motion: if `prefers-reduced-motion: reduce` matches, the observer
 * is not installed. The MotionReveal primitive's own scoped CSS already
 * renders the final state under that media query (defense in depth — see
 * §S.13.7.1 + §S.13.7.2).
 *
 * Loaded once per cross-document navigation via a `<script>` import in
 * `MarketingShell.astro`. Browsers reset module state on each navigation,
 * so re-init happens automatically for native @view-transition routes.
 */

const REVEAL_SELECTOR = '[data-reveal="true"]';
const REVEALED_CLASS = 'is-revealed';
const ROOT_MARGIN = '0px 0px -20% 0px';
const THRESHOLD = 0.5;

export function initMotionReveal(): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const targets = document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR);
  if (targets.length === 0) return;

  // Per UAT 2026-05-19 — MotionReveal's CSS now keeps content visible
  // unconditionally (see MotionReveal.astro). This observer is preserved
  // so any future opt-in CSS animation hooked on `.is-revealed` will still
  // wire up, but it no longer gates content visibility.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const target = entry.target as HTMLElement;
        const delay = target.dataset.revealDelay;
        if (delay) target.style.setProperty('--reveal-delay-val', delay);
        target.classList.add(REVEALED_CLASS);
        observer.unobserve(target);
      }
    },
    { rootMargin: ROOT_MARGIN, threshold: THRESHOLD },
  );

  for (const target of targets) observer.observe(target);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMotionReveal);
} else {
  initMotionReveal();
}
