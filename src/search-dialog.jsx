import { useEffect, useRef } from 'react';
import { CommandPalette, CommandPaletteInput, CommandPaletteFooter, useCommandPaletteContext } from '@astryxdesign/core/CommandPalette';
import { Button } from '@astryxdesign/core/Button';
import { siteIcons } from './icons.mjs';

function MatchText({text, query}) {
  const value = String(text || '');
  const terms = [...new Set(String(query || '').trim().split(/\s+/u).filter(Boolean))];
  if (!terms.length) return value;
  const escaped = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escaped.join('|')})`, 'giu');
  return value.split(pattern).map((part, index) => index % 2 ? <mark key={index}>{part}</mark> : part);
}

function SearchHeader({en}) {
  const ctx = useCommandPaletteContext();
  const input = useRef(null);
  const count = ctx.searchResults.length;
  return <div className="search-dialog-header">
    <CommandPaletteInput ref={input} label={en ? 'Search articles' : '搜索文章'}
      placeholder={en ? 'Search articles…' : '搜索文章…'} maxLength={200} autoComplete="off" spellCheck={false}
      onKeyDown={event => {
        if ((event.isComposing || event.nativeEvent.isComposing || event.keyCode === 229) && ['Enter', 'Escape', 'ArrowDown', 'ArrowUp'].includes(event.key)) event.preventDefault();
        else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {event.preventDefault(); ctx.onClose();}
      }}
      endContent={<Button label={en ? 'Close search' : '关闭搜索'} variant="ghost" isIconOnly icon={siteIcons.close}
        className="search-close" onClick={ctx.onClose}/>}/>
    <div className="search-dialog-status">
      <span>{ctx.isBusy ? (en ? 'Searching…' : '正在查找…')
        : ctx.search.trim() ? (en ? `${count} results` : `${count} 条结果`) : (en ? 'Recently published' : '最近发布')}</span>
      {ctx.search ? <Button label={en ? 'Clear' : '清空'} size="sm" variant="ghost" className="search-clear"
        onClick={() => {ctx.setSearch(''); input.current?.focus();}}/>
        : <span>{en ? `${count} articles` : `${count} 篇文章`}</span>}
    </div>
  </div>;
}

function SearchHit({item}) {
  const ctx = useCommandPaletteContext();
  const data = item.auxiliaryData;
  return <div className="search-hit" lang={data.language}>
    <span className="search-hit-title"><MatchText text={item.label} query={ctx.search}/></span>
    <span className="search-hit-excerpt"><MatchText text={data.excerpt} query={ctx.search}/></span>
    <span className="search-hit-meta"><span>{data.language?.startsWith('en') ? 'EN' : '中文'}</span><time dateTime={data.date}>{data.date}</time></span>
  </div>;
}

function AllResultsLink({en, searchURL}) {
  const ctx = useCommandPaletteContext();
  const query = ctx.search.trim();
  const url = new URL(searchURL, location.href);
  if (query) url.searchParams.set('q', query);
  return <a href={`${url.pathname}${url.search}${url.hash}`}>
    {query ? (en ? 'All results' : '全部结果') : (en ? 'All articles' : '全部文章')}
    <span aria-hidden="true">↗</span>
  </a>;
}

function EmptyResults({en, error, searchURL, initial = false}) {
  const ctx = useCommandPaletteContext();
  if (ctx.isBusy) return <p className="search-empty">{en ? 'Loading articles…' : '正在加载文章…'}</p>;
  return <div className="search-empty">
    <p>{error ? (en ? 'Search is temporarily unavailable' : '搜索暂时无法加载')
      : initial ? (en ? 'No articles yet' : '暂时还没有文章') : (en ? 'No matching articles' : '没有找到文章')}</p>
    <span>{error ? (en ? 'You can browse the complete index.' : '可以先浏览全部文章。')
      : (en ? 'Try a shorter keyword or a different phrase.' : '试试更短的关键词，或换一种表达。')}</span>
    {error && <div className="search-empty-actions">
      <Button label={en ? 'Retry' : '重试'} variant="secondary" size="sm" onClick={() => ctx.setSearch(ctx.search)}/>
      <a href={searchURL}>{en ? 'Browse all articles' : '浏览全部文章'}</a>
    </div>}
  </div>;
}

export function ArticleSearch({open, onOpenChange, source, config, error}) {
  const en = config.uiLocale?.startsWith('en');
  useEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    const root = document.documentElement;
    const update = () => {
      root.style.setProperty('--search-viewport-height', `${viewport?.height || innerHeight}px`);
      root.style.setProperty('--search-viewport-top', `${viewport?.offsetTop || 0}px`);
    };
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      root.style.removeProperty('--search-viewport-height');
      root.style.removeProperty('--search-viewport-top');
    };
  }, [open]);
  return <CommandPalette isOpen={open} onOpenChange={onOpenChange} searchSource={source} className="article-search-dialog"
    lang={config.uiLocale} label={en ? 'Search articles' : '搜索文章'}
    width="min(640px, calc(100vw - 32px))" maxHeight="min(640px, calc(var(--search-viewport-height, 100dvh) - var(--search-dialog-offset, 16px) - 16px))"
    input={<SearchHeader en={en}/>}
    footer={<CommandPaletteFooter className="search-dialog-footer">
      <span className="search-keyboard-hints"><kbd>↑</kbd><kbd>↓</kbd> {en ? 'Navigate' : '切换'} <kbd>↵</kbd> {en ? 'Open' : '打开'} <kbd>Esc</kbd> {en ? 'Close' : '关闭'}</span>
      <AllResultsLink en={en} searchURL={config.searchURL}/>
    </CommandPaletteFooter>}
    emptySearchText={<EmptyResults en={en} error={error} searchURL={config.searchURL}/>}
    emptyBootstrapText={<EmptyResults en={en} error={error} searchURL={config.searchURL} initial/>}
    onValueChange={id => {if (id?.startsWith('/') && !id.startsWith('//')) window.location.assign(id);}}
    renderItem={item => <SearchHit item={item}/>}/>;
}
