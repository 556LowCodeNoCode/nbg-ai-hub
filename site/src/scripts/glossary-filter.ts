// glossary-filter.ts — Vanilla-JS filter for the /glossary surface.
//
// Hooks the `<input data-glossary-filter>` and iterates `[data-term]` nodes,
// toggling the `hidden` attribute when `data-term-label` does not contain the
// (lowercased) search query. Letter chips marked with `[data-letter]` are
// dimmed via `[data-empty]` when no visible term matches their letter.
//
// Respects `prefers-reduced-motion` — no animations, just an attribute toggle.
//
// Related: project-design.md §S.13.10.7, plan-004 §P4.F.
// Backs: AC11.

(() => {
  const input = document.querySelector<HTMLInputElement>('input[data-glossary-filter]');
  if (!input) return;

  const terms = Array.from(document.querySelectorAll<HTMLElement>('[data-term]'));
  if (terms.length === 0) return;

  const letterChips = Array.from(document.querySelectorAll<HTMLElement>('[data-letter]'));

  function apply(): void {
    const query = (input?.value ?? '').trim().toLowerCase();
    const lettersWithVisible = new Set<string>();

    for (const node of terms) {
      const label = (node.dataset.termLabel ?? '').toLowerCase();
      const matches = query.length === 0 || label.includes(query);
      if (matches) {
        node.removeAttribute('hidden');
        const first = label.charAt(0);
        if (first) lettersWithVisible.add(first);
      } else {
        node.setAttribute('hidden', '');
      }
    }

    for (const chip of letterChips) {
      const letter = (chip.dataset.letter ?? '').toLowerCase();
      if (lettersWithVisible.has(letter)) {
        chip.removeAttribute('data-empty');
      } else {
        chip.setAttribute('data-empty', 'true');
      }
    }
  }

  input.addEventListener('input', apply);
  // Run once at load to settle letter-chip dimming for existing content.
  apply();
})();
