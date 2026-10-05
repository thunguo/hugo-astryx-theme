import { searchEntries } from "./search.mjs";

export function enhanceSearchPage(config) {
  const form = document.getElementById('search-form');
  const input = form?.querySelector('input[data-search-input]');
  const container = document.getElementById('search-results');
  if (!form || !input || !container) return;
  const english = config.uiLocale?.startsWith('en');
  const originalCards = [...container.querySelectorAll('[data-search-url]')];
  const cards = new Map(originalCards.map(card => [card.dataset.searchUrl, card]));
  const status = document.getElementById('search-status') || document.createElement('p');
  if (!status.parentElement) {
    status.className = 'search-status';
    status.setAttribute('role', 'status');
    container.before(status);
  }
  let index;
  let generation = 0;
  let timer;
  let composing = false;
  let settledStatus = status.textContent;
  const setStatus = (message, busy = false) => {
    status.textContent = message;
    container.setAttribute('aria-busy', String(busy));
    if (!busy) settledStatus = message;
  };
  const invalidate = () => {
    clearTimeout(timer);
    generation++;
    setStatus(settledStatus);
  };
  const restore = () => {
    originalCards.forEach(card => {card.hidden = false; container.append(card);});
  };
  const updateURL = query => {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url);
  };
  const loadIndex = () => {
    if (!index) {
      const request = fetch(config.searchIndexURL, {credentials: 'same-origin'}).then(response => {
        if (!response.ok) throw new Error('Index unavailable');
        return response.json();
      }).then(entries => {
        if (!Array.isArray(entries)) throw new Error('Invalid search index');
        return entries;
      });
      index = request;
      request.catch(() => {if (index === request) index = undefined;});
    }
    return index;
  };
  const search = async (syncURL = true) => {
    invalidate();
    const current = generation;
    const query = input.value.trim();
    if (syncURL) updateURL(query);
    if (!query) {
      restore();
      setStatus(english ? `Showing all ${cards.size} articles` : `显示全部 ${cards.size} 篇文章`);
      return;
    }
    setStatus(english ? 'Searching…' : '正在搜索…', true);
    try {
      const results = searchEntries(await loadIndex(), query, Number.MAX_SAFE_INTEGER)
        .filter(result => cards.has(result.entry.url));
      if (current !== generation) return;
      const matches = new Set(results.map(result => result.entry.url));
      cards.forEach((card, path) => {card.hidden = !matches.has(path);});
      for (const {entry} of results) {
        const card = cards.get(entry.url);
        container.append(card);
      }
      setStatus(results.length
        ? (english ? `${results.length} articles found` : `找到 ${results.length} 篇文章`)
        : (english ? 'No matching articles. Try another keyword.' : '没有找到匹配的文章，请换一个关键词。'));
    } catch {
      if (current !== generation) return;
      restore();
      setStatus(english
        ? 'Search could not load. Browse all articles below, or submit again to retry.'
        : '搜索暂时无法加载，仍可浏览下方的全部文章；再次搜索即可重试。');
    }
  };
  const schedule = event => {
    invalidate();
    if (composing || event?.isComposing) return;
    if (!input.value.trim()) search();
    else timer = setTimeout(() => search(), 150);
  };
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!composing) search();
  });
  input.addEventListener('input', schedule);
  input.addEventListener('compositionstart', () => {composing = true; invalidate();});
  input.addEventListener('compositionend', () => {composing = false; schedule();});
  input.addEventListener('search', () => {if (!composing) search();});
  const restoreFromURL = () => {
    composing = false;
    input.value = new URLSearchParams(window.location.search).get('q') || '';
    search(false);
  };
  window.addEventListener('popstate', restoreFromURL);
  restoreFromURL();
}
