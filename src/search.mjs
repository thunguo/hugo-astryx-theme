const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase();

/** Search original Chinese and English text together, without changing article language. */
export function searchEntries(entries, query, limit = 20) {
  const terms = normalize(query).trim().slice(0, 200).split(/\s+/u).filter(Boolean);
  const ranked = entries.map(entry => {
    const fields = {
      title: normalize(entry.title),
      summary: normalize(entry.summary),
      tags: normalize((entry.tags || []).join(' ')),
      content: normalize(entry.content),
    };
    const text = Object.values(fields).join(' ');
    if (!terms.every(term => text.includes(term))) return null;
    const score = terms.reduce((total, term) => total
      + (fields.title.includes(term) ? 100 : 0)
      + (fields.tags.includes(term) ? 40 : 0)
      + (fields.summary.includes(term) ? 20 : 0)
      + (fields.content.includes(term) ? 5 : 0), 0);
    const content = String(entry.content || entry.summary || '').replace(/\s+/g, ' ');
    const position = terms.length ? Math.max(0, normalize(content).indexOf(terms[0]) - 35) : 0;
    return {entry, score, excerpt: `${position ? '…' : ''}${content.slice(position, position + 130)}${content.length > position + 130 ? '…' : ''}`};
  }).filter(Boolean);
  ranked.sort((a, b) => b.score - a.score || String(b.entry.date).localeCompare(String(a.entry.date)));
  return ranked.slice(0, limit);
}

export function createSearchSource(indexURL, onError = () => {}) {
  let cached;
  const load = () => {
    if (!cached) cached = fetch(indexURL, {credentials: 'same-origin'})
      .then(response => {
        if (!response.ok) throw new Error('Search index unavailable');
        return response.json();
      }).then(entries => {
        if (!Array.isArray(entries)) throw new Error('Invalid search index');
        onError(false);
        return entries;
      }).catch(() => {cached = undefined; onError(true); return [];});
    return cached;
  };
  const items = results => results.map(({entry, excerpt}) => ({
    id: entry.url, label: entry.title,
    auxiliaryData: {...entry, excerpt},
  }));
  return {
    bootstrap: async () => items(searchEntries(await load(), '', 6)),
    search: async query => items(searchEntries(await load(), query)),
  };
}
