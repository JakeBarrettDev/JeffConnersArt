// Site-wide motion: scroll reveals and the shared "active-art" element that lets a
// painting morph between the gallery, its own page, and the fullscreen viewer.

export const ACTIVE_ART = 'active-art';

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let revealObserver: IntersectionObserver | null = null;

function initReveals() {
  revealObserver?.disconnect();
  const targets = Array.from(
    document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible), [data-reveal]:not(.is-visible)')
  );

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    targets.forEach((target) => target.classList.add('is-visible'));
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      // Stagger items that enter together, e.g. a row of cards.
      let batchIndex = 0;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        const element = entry.target as HTMLElement;
        element.style.setProperty('--reveal-delay', `${Math.min(batchIndex, 6) * 80}ms`);
        element.classList.add('is-visible');
        revealObserver?.unobserve(element);
        batchIndex += 1;
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0 }
  );

  targets.forEach((target) => revealObserver?.observe(target));
}

function clearArtNames(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-art-image]:not([data-art-primary])').forEach((image) => {
    image.style.viewTransitionName = '';
  });
}

// Name the clicked painting so it morphs into the artwork page. Capture phase so this
// runs before Astro's router starts the transition.
document.addEventListener(
  'click',
  (event) => {
    const link = (event.target as Element | null)?.closest?.('a[data-art-link]');
    if (!link) {
      return;
    }
    clearArtNames(document);
    const image = link.querySelector<HTMLElement>('[data-art-image]');
    if (image) {
      image.style.viewTransitionName = ACTIVE_ART;
    }
  },
  { capture: true }
);

// Going back from an artwork page: morph the painting back into its card.
document.addEventListener('astro:before-swap', (event) => {
  const slug = document.querySelector('[data-work-slug]')?.getAttribute('data-work-slug');
  if (!slug || event.navigationType !== 'traverse') {
    return;
  }

  const card = event.newDocument.querySelector(`a[data-art-link][data-slug="${CSS.escape(slug)}"]`);
  const image = card?.querySelector<HTMLElement>('[data-art-image]');
  if (image) {
    image.style.viewTransitionName = ACTIVE_ART;
    card?.closest('[data-reveal]')?.classList.add('is-visible');
  }
});

function initHeader() {
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  header?.classList.toggle('is-scrolled', window.scrollY > 24);
}

window.addEventListener('scroll', initHeader, { passive: true });

document.addEventListener('astro:page-load', () => {
  initHeader();
  initReveals();
});
