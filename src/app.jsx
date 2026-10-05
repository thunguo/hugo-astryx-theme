import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { Theme } from '@astryxdesign/core/theme';
import { InternationalizationProvider } from '@astryxdesign/core/i18n';
import zhCN from '@astryxdesign/core/locales/zh-CN.generated.js';
import { ToggleButton, ToggleButtonGroup } from '@astryxdesign/core/ToggleButton';
import { Button } from '@astryxdesign/core/Button';
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden';
import { astryxTheme } from '../assets/css/generated/astryx.js';
import { SiteHeader } from './site-ui.jsx';
import { createSearchSource } from './search.mjs';
import { ArticleSearch } from './search-dialog.jsx';
import { GalleryDialog, preloadGallery } from './gallery-dialog.jsx';
import { collectCodeBlocks } from './code-blocks.mjs';
import { enhanceComments } from './comments.mjs';
import { enhanceSearchPage } from './enhancements.mjs';
import { enhanceOverflowRegions, enhanceReading } from './reading.mjs';
import { siteIcons } from './icons.mjs';

const header = document.getElementById('astryx-header');
const filterHost = document.getElementById('astryx-filters');
const codeBlocks = [];

function CodeCopy({target, en}) {
  const [state, setState] = useState('idle');
  const timer = useRef(null);
  const inFlight = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    clearTimeout(timer.current);
    setState('idle');
    try {await navigator.clipboard.writeText(target.text); setState('copied');}
    catch {setState('failed');}
    finally {
      inFlight.current = false;
      timer.current = setTimeout(() => setState('idle'), 1800);
    }
  };
  const labels = en ? {idle: 'Copy code', copied: 'Copied', failed: 'Copy failed'}
    : {idle: '复制代码', copied: '已复制', failed: '复制失败'};
  const label = labels[state];
  return <>
    <Button label={label} lang={en ? 'en' : 'zh-CN'} variant="secondary" size="sm"
      icon={state === 'copied' ? siteIcons.check : siteIcons.copy} onClick={copy}>
      <span className="code-copy-label">
        <span className="code-copy-label-reserve" aria-hidden="true">{Object.values(labels).map(text => <span key={text}>{text}</span>)}</span>
        <span>{label}</span>
      </span>
    </Button>
    <VisuallyHidden role="status" aria-live="polite">{state === 'copied' ? (en ? 'Code copied to clipboard.' : '代码已复制到剪贴板。')
      : state === 'failed' ? (en ? 'Could not copy. Select the code and copy it manually.' : '复制未成功，请选中代码后手动复制。') : ''}</VisuallyHidden>
  </>;
}

function App({config, filters}) {
  const en = config.uiLocale?.startsWith('en');
  const [mode, setMode] = useState(() => document.documentElement.dataset.theme || config.defaultMode || 'system');
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const effectiveMode = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeType, setActiveType] = useState('all');
  const [gallery, setGallery] = useState(null);
  const lastImage = useRef(null);
  const source = useMemo(() => createSearchSource(config.searchIndexURL, setSearchError), [config.searchIndexURL]);

  useEffect(() => {
    try {localStorage.setItem(config.modeStorageKey, mode);} catch {}
  }, [mode, config.modeStorageKey]);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const desktop = matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => {if (desktop.matches) setMenuOpen(false);};
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);
  useEffect(() => {
    document.querySelectorAll('.post-grid .post-card[data-post-type]').forEach(card => {
      card.hidden = activeType !== 'all' && card.dataset.postType !== activeType;
    });
    document.querySelectorAll('.post-grid').forEach(grid => grid.classList.toggle('is-filtered', activeType !== 'all'));
  }, [activeType]);
  useEffect(() => {
    const shortcut = event => {
      if (event.isComposing || event.target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName)) return;
      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setMenuOpen(false); setSearchOpen(open => !open);
      }
    };
    const images = [...document.querySelectorAll('a[data-lightbox]')];
    const mediaByURL = new Map();
    images.forEach(item => {
      const caption = item.dataset.lightboxCaption || item.closest('figure')?.querySelector('figcaption')?.textContent || '';
      const existing = mediaByURL.get(item.href);
      if (!existing) mediaByURL.set(item.href, {src: item.href, alt: item.querySelector('img')?.alt || '', caption});
      else if (!existing.caption && caption) existing.caption = caption;
    });
    const media = [...mediaByURL.values()];
    const prepareImage = () => {preloadGallery(config.galleryURL);};
    const openImage = event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      const link = event.currentTarget;
      lastImage.current = link;
      setGallery({index: media.findIndex(item => item.src === link.href), media});
    };
    const openSearch = event => {event.preventDefault(); setMenuOpen(false); setSearchOpen(true);};
    const searchLinks = [...document.querySelectorAll('[data-open-search]')];
    document.addEventListener('keydown', shortcut);
    images.forEach(link => {
      link.addEventListener('click', openImage);
      link.addEventListener('pointerenter', prepareImage);
      link.addEventListener('focus', prepareImage);
    });
    searchLinks.forEach(link => link.addEventListener('click', openSearch));
    return () => {
      document.removeEventListener('keydown', shortcut);
      images.forEach(link => {
        link.removeEventListener('click', openImage);
        link.removeEventListener('pointerenter', prepareImage);
        link.removeEventListener('focus', prepareImage);
      });
      searchLinks.forEach(link => link.removeEventListener('click', openSearch));
    };
  }, []);
  return <InternationalizationProvider locale={config.uiLocale || 'zh-CN'} messages={{'zh-CN': zhCN}}>
    <Theme theme={astryxTheme} mode={mode}>
      {header && createPortal(<SiteHeader config={config} mode={effectiveMode}
        onSearch={() => {setMenuOpen(false); setSearchOpen(true);}} onMode={() => setMode(effectiveMode === 'light' ? 'dark' : 'light')}
        menuOpen={menuOpen} onMenuChange={setMenuOpen}/>, header)}
      {codeBlocks.map((target, index) => createPortal(<CodeCopy target={target} en={en}/>, target.host, `code-${index}`))}
      {filterHost && filters.length > 1 && createPortal(<div className="post-filters">
        <ToggleButtonGroup label={en ? 'Filter articles' : '筛选文章'} size="sm" value={activeType} onChange={value => setActiveType(value || 'all')}>
          {filters.map(item => <ToggleButton key={item.value} value={item.value} label={item.label}/>) }
        </ToggleButtonGroup>
      </div>, filterHost)}
      <ArticleSearch open={searchOpen} onOpenChange={setSearchOpen} source={source} config={config} error={searchError}/>
      <GalleryDialog gallery={gallery} en={en} viewerURL={config.galleryURL}
        onIndexChange={index => setGallery(current => current && ({...current, index}))}
        onClose={() => {setGallery(null); requestAnimationFrame(() => lastImage.current?.focus({preventScroll: true}));}}/>
    </Theme>
  </InternationalizationProvider>;
}

const configuration = document.getElementById('astryx-config');
const host = document.getElementById('astryx-enhancements');
if (configuration && host) {
  try {
    const config = JSON.parse(configuration.textContent);
    const filters = JSON.parse(document.getElementById('astryx-filter-data')?.textContent || '[]');
    header?.replaceChildren();
    if (filterHost && filters.length > 1) filterHost.replaceChildren();
    codeBlocks.push(...collectCodeBlocks(config));
    createRoot(host).render(<App config={config} filters={filters}/>);
    enhanceOverflowRegions(config);
    enhanceReading(config);
    enhanceSearchPage(config);
    enhanceComments();
  } catch (error) { console.error('Astryx could not initialize.', error); }
}
