import { useEffect, useState } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Button } from '@astryxdesign/core/Button';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { Spinner } from '@astryxdesign/core/Spinner';
import { siteIcons } from './icons.mjs';

const viewers = new Map();

function viewerEntry(url) {
  const key = new URL(url || './gallery.js', import.meta.url).href;
  if (!viewers.has(key)) viewers.set(key, {url: key, component: null, pending: null, failures: 0});
  return viewers.get(key);
}

function loadGallery(url) {
  const entry = viewerEntry(url);
  if (entry.component) return Promise.resolve(entry.component);
  if (!entry.pending) {
    const request = new URL(entry.url);
    // Browsers cache failed module requests by URL. A new query makes retry
    // request the same fingerprinted viewer instead of the cached failure.
    if (entry.failures) request.searchParams.set('retry', String(entry.failures));
    entry.pending = import(request.href).then(module => {
      entry.component = module.default;
      entry.pending = null;
      return entry.component;
    }).catch(error => {
      entry.pending = null;
      entry.failures++;
      throw error;
    });
  }
  return entry.pending;
}

/** Safe to call on pointer/focus intent without handling a rejected promise. */
export function preloadGallery(url) {
  // Returning focus after dismissal is also an intent event. Once background
  // preloading has failed, leave further requests to an explicit open/retry.
  if (viewerEntry(url).failures) return Promise.resolve(null);
  return loadGallery(url).catch(() => null);
}

function GallerySession({gallery, onIndexChange, onClose, en, viewerURL}) {
  const entry = viewerEntry(viewerURL);
  const [ReadyGallery, setReadyGallery] = useState(() => entry.component);
  const [phase, setPhase] = useState('loading');
  const [showFeedback, setShowFeedback] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (entry.component) {
      setReadyGallery(() => entry.component);
      return;
    }
    let active = true;
    setPhase('loading');
    // Cached or quickly fetched chunks go straight to the actual Lightbox.
    // Retry retains the same feedback dialog instead of closing/reopening it.
    const delay = setTimeout(() => {if (active) setShowFeedback(true);}, 120);
    loadGallery(viewerURL).then(component => {
      clearTimeout(delay);
      if (active) setReadyGallery(() => component);
    }).catch(() => {
      clearTimeout(delay);
      if (active) {
        setPhase('error');
        setShowFeedback(true);
      }
    });
    return () => {
      active = false;
      clearTimeout(delay);
    };
  }, [entry, viewerURL, attempt]);

  useEffect(() => {
    if (ReadyGallery || entry.component || showFeedback) return;
    // Before the delayed dialog appears there is no Core layer to receive
    // Escape. Once visible, Dialog/Lightbox own all dismissal behavior.
    const closePending = event => {
      if (event.key !== 'Escape' || event.isComposing || event.keyCode === 229) return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', closePending, true);
    return () => document.removeEventListener('keydown', closePending, true);
  }, [entry, ReadyGallery, showFeedback, onClose]);

  const Viewer = ReadyGallery || entry.component;
  if (Viewer) return <Viewer media={gallery.media} index={gallery.index}
    onIndexChange={onIndexChange} onClose={onClose} en={en}/>;
  if (!showFeedback) return null;

  const original = gallery.media[gallery.index]?.src || gallery.media[0]?.src;
  return <GalleryFeedback en={en} state={phase} original={original} onClose={onClose}
    hasRetried={attempt > 0} onRetry={() => {
      setPhase('loading');
      setAttempt(value => value + 1);
    }}/>;
}

export function GalleryFeedback({en, state, original, onClose, onRetry, hasRetried,
  kind = 'viewer', onPrevious, onNext}) {
  const onOpenChange = value => {if (!value) onClose();};
  const failed = state === 'error';
  const image = kind === 'image';
  const loadingLabel = en ? (image ? 'Loading the image again…' : 'Loading image viewer…')
    : (image ? '正在重新加载图片…' : '正在打开图片…');
  return <Dialog isOpen onOpenChange={onOpenChange} purpose="info" width={400}
    padding={4} maxHeight="calc(100dvh - 32px)" className="gallery-feedback-dialog"
    lang={en ? 'en' : 'zh-CN'} onKeyDown={event => {
      if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
      const navigate = event.key === 'ArrowLeft' ? onPrevious : event.key === 'ArrowRight' ? onNext : null;
      if (navigate) {event.preventDefault(); navigate();}
    }}>
    <Layout height="auto"
      header={<DialogHeader title={en ? 'Image preview' : '图片预览'} onOpenChange={onOpenChange}/>}
      content={<LayoutContent isScrollable={false}>
        <div className="gallery-feedback-status">
          {failed ? <p role="status">{en
            ? (image ? 'This image could not load. Try again, or open the original image.'
              : 'The viewer could not load. Try again, or open the original image.')
            : (image ? '这张图片暂时无法加载。可以重试，或打开原图。'
              : '预览暂时无法加载。可以重试，或直接打开原图。')}</p>
            : hasRetried ? <p>{loadingLabel}</p>
              : <Spinner size="lg" shade="subtle" label={loadingLabel}/>}
        </div>
      </LayoutContent>}
      footer={<LayoutFooter>
        <div className="gallery-feedback-actions">
          {(failed || hasRetried) && <Button label={en ? 'Try again' : '重试'} variant="secondary"
            isLoading={!failed}
            tooltip={failed ? (en ? 'Try loading again' : '重新加载') : loadingLabel}
            onClick={() => {if (failed) onRetry();}}/>}
          {original && <Button label={en ? 'Open original' : '打开原图'} variant="ghost"
            href={original} target="_blank" rel="noopener noreferrer"/>}
          {(onPrevious || onNext) && <div className="gallery-feedback-navigation">
            {onPrevious && <Button label={en ? 'Previous' : '上一张'} variant="ghost" size="sm"
              icon={siteIcons.chevronLeft} onClick={onPrevious}/>}
            {onNext && <Button label={en ? 'Next' : '下一张'} variant="ghost" size="sm"
              icon={siteIcons.chevronRight} className="gallery-feedback-next" onClick={onNext}/>}
          </div>}
        </div>
      </LayoutFooter>}/>
  </Dialog>;
}

export function GalleryDialog(props) {
  // Each opening gets fresh transient state. A completed module remains cached
  // across sessions, while a closed pending session cannot reopen itself.
  return props.gallery ? <GallerySession key={props.viewerURL || 'default'} {...props}/> : null;
}
