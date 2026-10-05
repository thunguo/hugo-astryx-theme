const languageNames = {
  js: 'JavaScript', javascript: 'JavaScript', jsx: 'JSX',
  ts: 'TypeScript', typescript: 'TypeScript', tsx: 'TSX',
  py: 'Python', python: 'Python', sh: 'Shell', shell: 'Shell', bash: 'Bash', zsh: 'Zsh',
  go: 'Go', golang: 'Go', rs: 'Rust', rust: 'Rust', rb: 'Ruby', ruby: 'Ruby',
  html: 'HTML', xml: 'XML', css: 'CSS', scss: 'SCSS',
  json: 'JSON', yaml: 'YAML', yml: 'YAML', toml: 'TOML', csv: 'CSV', sql: 'SQL',
  md: 'Markdown', markdown: 'Markdown',
};

function sourceText(block, pre) {
  const source = block.dataset.codeSource;
  if (source) {
    try {
      const text = JSON.parse(source);
      if (typeof text === 'string') return text;
    } catch {}
  }
  const code = pre.querySelector('code') || pre;
  const copy = code.cloneNode(true);
  copy.querySelectorAll('.ln, .lnt').forEach(number => number.remove());
  return copy.textContent;
}

/** Return hosts for real Astryx copy buttons; also enhance authored plain pre. */
export function collectCodeBlocks(config = {}) {
  const english = config.uiLocale?.startsWith('en');
  const targets = [];
  document.querySelectorAll('.prose pre').forEach(pre => {
    // Avoid number-only pre elements emitted by legacy table-based highlighting.
    if (pre.closest('.lntd') && pre.querySelector('.lnt') && !pre.querySelector('.cl')) return;
    let block = pre.closest('[data-code-block]');
    if (!block) {
      block = document.createElement('div');
      block.className = 'code-block';
      block.dataset.codeBlock = '';
      const code = pre.querySelector('code');
      const language = code?.dataset.lang
        || [...(code?.classList || [])].find(name => name.startsWith('language-'))?.slice(9)
        || '';
      const toolbar = document.createElement('div');
      toolbar.className = 'code-block-toolbar';
      toolbar.lang = english ? 'en' : 'zh-CN';
      const heading = document.createElement('div');
      heading.className = 'code-block-heading';
      const label = document.createElement('span');
      label.className = 'code-block-language';
      label.textContent = languageNames[language.toLowerCase()] || language
        || (english ? 'Plain text' : '纯文本');
      label.title = label.textContent;
      heading.append(label);
      toolbar.append(heading);
      pre.before(block);
      block.append(toolbar, pre);
      block.dataset.codeLanguage = language;
    }
    if (block.dataset.codeEnhanced) return;
    // Chroma always adds tabindex=0. Let the responsive overflow enhancement
    // retain that tab stop only when this generated pre actually scrolls.
    if (block.hasAttribute('data-code-source') && pre.getAttribute('tabindex') === '0') {
      pre.removeAttribute('tabindex');
    }
    let host = block.querySelector('[data-code-copy-host]');
    if (!host) {
      host = document.createElement('span');
      host.className = 'code-copy-button';
      host.dataset.codeCopyHost = '';
      block.querySelector('.code-block-toolbar').append(host);
    }
    pre.querySelectorAll('.ln, .lnt').forEach(number => number.setAttribute('aria-hidden', 'true'));
    targets.push({ host, text: sourceText(block, pre), pre });
    block.dataset.codeEnhanced = 'true';
  });
  return targets;
}
