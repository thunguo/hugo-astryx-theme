/** Keep scrolling motion attached to reader actions, rather than scroll restore. */
export function enhanceReading(config = {}) {
  const article = document.querySelector('.article-content');
  if (!article) return;
  const en = config.uiLocale?.startsWith('en');
  const timers = new WeakMap();
  const hashTarget = hash => {
    try {return document.getElementById(decodeURIComponent(hash.slice(1)));} catch {return null;}
  };
  const focus = target => {
    const focusTarget = target.matches('sup') ? target.querySelector('a.footnote-ref') || target : target;
    const temporaryFocus = !focusTarget.hasAttribute('tabindex') && !focusTarget.matches('a[href], button, input, select, textarea');
    if (temporaryFocus) {
      focusTarget.tabIndex = -1;
      focusTarget.addEventListener('blur', () => focusTarget.removeAttribute('tabindex'), {once: true});
    }
    focusTarget.focus({preventScroll: true});
  };
  article.querySelectorAll('a.footnote-backref').forEach(link => {
    const arrow = document.createElement('span');
    arrow.textContent = link.textContent;
    arrow.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = en ? 'Back to text' : '返回正文';
    link.replaceChildren(arrow, label);
    link.setAttribute('aria-label', label.textContent);
    link.lang = en ? 'en' : 'zh-CN';
  });
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('.article-toc a[href], .article-content a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
    const target = hashTarget(url.hash);
    if (!target) return;
    event.preventDefault();
    if (location.hash !== url.hash) history.pushState(history.state, '', url);
    // Native fragment navigation moves the sequential keyboard starting point.
    // Preserve that behavior when opting this click into smooth scrolling.
    focus(target);
    target.scrollIntoView({block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    if (link.matches('.footnote-ref, .footnote-backref')) {
      clearTimeout(timers.get(target));
      target.classList.add('reading-target');
      timers.set(target, setTimeout(() => target.classList.remove('reading-target'), 1600));
    }
  });
  // Scroll restoration belongs to the browser. Only restore its keyboard
  // starting point, which otherwise remains at the footnote just left behind.
  const restoreFocus = () => {
    const target = hashTarget(location.hash);
    if (target && document.querySelector('.blog-article')?.contains(target)) focus(target);
  };
  window.addEventListener('popstate', restoreFocus);
  window.addEventListener('hashchange', restoreFocus);
}

/** Make actual overflow discoverable without adding controls to every block. */
export function enhanceOverflowRegions(config = {}) {
  const en = config.uiLocale?.startsWith('en');
  const regions = [...document.querySelectorAll('.prose pre, .prose table')];
  const original = new Map(regions.map(node => [node, {
    tabindex: node.getAttribute('tabindex'), label: node.getAttribute('aria-label'),
  }]));
  const edges = new Map();
  regions.forEach(node => {
    let frame = node.closest('.code-block');
    if (node.tagName === 'TABLE') {
      frame = document.createElement('div');
      frame.className = 'table-scroll-frame';
      node.before(frame);
      frame.append(node);
    }
    const updateEdges = () => {
      if (!frame) return;
      const max = node.scrollWidth - node.clientWidth;
      const position = Math.abs(node.scrollLeft);
      const rtl = getComputedStyle(node).direction === 'rtl';
      frame.toggleAttribute('data-overflow-left', max > 1 && (rtl ? position < max - 1 : position > 1));
      frame.toggleAttribute('data-overflow-right', max > 1 && (rtl ? position > 1 : position < max - 1));
    };
    node.addEventListener('scroll', updateEdges, {passive: true});
    edges.set(node, updateEdges);
  });
  const update = () => regions.forEach(node => {
    const saved = original.get(node);
    const overflow = node.scrollWidth > node.clientWidth + 1;
    if (saved.tabindex === null) {
      if (overflow) node.tabIndex = 0;
      else node.removeAttribute('tabindex');
    }
    if (!saved.label) {
      if (overflow) node.setAttribute('aria-label', node.tagName === 'PRE'
        ? (en ? 'Scrollable code' : '可横向滚动的代码') : (en ? 'Scrollable table' : '可横向滚动的表格'));
      else node.removeAttribute('aria-label');
    }
    const frame = node.closest('.code-block');
    if (frame) frame.style.setProperty('--code-scroll-top', `${node.offsetTop}px`);
    edges.get(node)();
  });
  update();
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(update);
    regions.forEach(node => {
      observer.observe(node);
      // Copy buttons mount after this enhancement and can increase the toolbar
      // height. The pre's own size stays constant, so observe its frame too.
      const frame = node.closest('.code-block');
      if (frame) observer.observe(frame);
    });
  }
  document.fonts?.ready.then(update);
}
