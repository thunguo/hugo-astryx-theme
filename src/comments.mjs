const GISCUS_ORIGIN = 'https://giscus.app';
const GISCUS_SCRIPT = `${GISCUS_ORIGIN}/client.js`;

// giscus owns authentication, posting and the iframe. This adapter owns the
// surrounding Astryx UI and uses its public setConfig message to change themes.
export function enhanceComments(root = document) {
  const section = root.querySelector('[data-comments]');
  if (!section || section.dataset.commentsEnhanced) return;
  const configNode = section.querySelector('[data-comments-config]');
  const host = section.querySelector('[data-comments-host]');
  const action = section.querySelector('[data-comments-load]');
  const status = section.querySelector('[data-comments-status]');
  if (!configNode || !host || !action || !status) return;
  let config;
  try { config = JSON.parse(configNode.textContent); } catch { return; }
  if (!config.repo || !config.repoId || !config.categoryId) return;
  section.dataset.commentsEnhanced = 'true';

  let script;
  let frame;
  let timeout;
  let observer;
  let attempt = 0;
  let requestedManually = false;
  const theme = () => document.documentElement.dataset.theme === 'dark'
    ? config.themeDark : config.themeLight;
  const label = text => {
    action.setAttribute('aria-label', text);
    const textHost = action.querySelector('[data-comments-action-label]');
    if (textHost) textHost.textContent = text;
    else action.textContent = text;
  };
  const state = value => {
    section.dataset.state = value;
    host.setAttribute('aria-busy', String(value === 'loading'));
    // Keep the initiating control visible and focused through loading/errors.
    // The state guard below prevents duplicate requests without native disabled.
    action.setAttribute('aria-disabled', String(value === 'loading'));
    status.textContent = config.labels[value === 'error' ? 'error' : value === 'loading' ? 'loading' : 'idle'];
    label(config.labels[value === 'error' ? 'retry' : 'load']);
    if (value !== 'loading') clearTimeout(timeout);
  };
  const updateTheme = () => {
    script?.setAttribute('data-theme', theme());
    frame?.contentWindow?.postMessage({giscus: {setConfig: {theme: theme()}}}, GISCUS_ORIGIN);
  };
  const ready = () => {
    if (section.dataset.state === 'loading' || section.dataset.state === 'error') {
      const moveFocus = requestedManually && document.activeElement === action;
      state('ready');
      if (moveFocus) frame?.focus({preventScroll: true});
    }
    updateTheme();
  };
  const watchFrame = () => {
    const next = host.querySelector('iframe.giscus-frame');
    if (!next || next === frame) return;
    frame = next;
    const currentAttempt = attempt;
    frame.title = config.labels.title;
    frame.addEventListener('load', () => {
      if (frame === next && currentAttempt === attempt) ready();
    }, {once: true});
    updateTheme();
  };
  const frameObserver = new MutationObserver(watchFrame);
  frameObserver.observe(host, {childList: true, subtree: true});
  const themeObserver = new MutationObserver(updateTheme);
  themeObserver.observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});

  const load = (manual = false) => {
    if (section.dataset.state === 'loading' || section.dataset.state === 'ready') return;
    requestedManually = manual;
    observer?.disconnect();
    const currentAttempt = ++attempt;
    clearTimeout(timeout);
    host.replaceChildren();
    frame = undefined;
    script?.remove();
    state('loading');
    script = document.createElement('script');
    script.src = GISCUS_SCRIPT;
    script.async = true;
    script.crossOrigin = 'anonymous';
    const attributes = {
      repo: config.repo, 'repo-id': config.repoId,
      category: config.category, 'category-id': config.categoryId,
      mapping: config.mapping, term: config.term,
      strict: config.strict ? '1' : '0',
      'reactions-enabled': config.reactionsEnabled ? '1' : '0',
      'emit-metadata': config.emitMetadata ? '1' : '0',
      'input-position': config.inputPosition,
      theme: theme(), lang: config.lang,
      // IntersectionObserver already defers the script until this section is
      // close. An eager iframe avoids a second deferral and enables ready UI.
      loading: 'eager',
    };
    for (const [key, value] of Object.entries(attributes)) {
      if (value !== undefined && value !== '') script.setAttribute(`data-${key}`, String(value));
    }
    script.onerror = () => { if (currentAttempt === attempt) state('error'); };
    timeout = setTimeout(() => {
      if (currentAttempt === attempt && section.dataset.state === 'loading') state('error');
    }, 20000);
    host.append(script);
  };
  action.addEventListener('click', () => load(true));
  window.addEventListener('message', event => {
    if (event.origin !== GISCUS_ORIGIN || event.source !== frame?.contentWindow || !event.data?.giscus) return;
    // resizeHeight is sent when giscus has rendered its view, including a new
    // discussion with no comments. Metadata is optional and is not a counter
    // we synthesize for an empty or unavailable discussion.
    if (typeof event.data.giscus.resizeHeight === 'number') ready();
  });

  if (config.loading === 'eager') load();
  else if (config.loading !== 'manual' && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) load();
    }, {rootMargin: '240px 0px'});
    observer.observe(section);
  } else if (config.loading !== 'manual') load();
}
