import { useEffect, useRef, useState } from 'react';
import { Lightbox } from '@astryxdesign/core/Lightbox';
import { GalleryFeedback } from './gallery-dialog.jsx';

export default function Gallery({media, index, onIndexChange, onClose, en}) {
  const item = media[index];
  const imageKey = `${index}:${item.src}`;
  const [failedImage, setFailedImage] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [version, setVersion] = useState(0);
  const dialog = useRef(null);
  const pending = useRef({id: 0, image: null, timer: null});
  const failed = failedImage === imageKey;

  const cancelRetry = () => {
    pending.current.id++;
    clearTimeout(pending.current.timer);
    pending.current.timer = null;
    if (pending.current.image) {
      pending.current.image.onload = null;
      pending.current.image.onerror = null;
      pending.current.image = null;
    }
  };
  useEffect(() => () => cancelRetry(), [imageKey]);
  useEffect(() => {
    const image = dialog.current?.querySelector('img');
    if (image?.complete && !image.naturalWidth && image.src === item.src) setFailedImage(imageKey);
  }, [imageKey, item.src, version]);

  const navigate = next => {
    cancelRetry();
    setRetrying(false);
    setFailedImage(null);
    onIndexChange(next);
  };
  const close = () => {cancelRetry(); onClose();};
  const retry = () => {
    if (retrying) return;
    cancelRetry();
    const id = pending.current.id;
    const probe = new Image();
    pending.current.image = probe;
    setRetrying(true);
    const finish = loaded => {
      if (pending.current.id !== id) return;
      pending.current.id++;
      clearTimeout(pending.current.timer);
      pending.current.timer = null;
      probe.onload = null;
      probe.onerror = null;
      pending.current.image = null;
      setRetrying(false);
      if (loaded) {
        setFailedImage(null);
        // Recreate the failed IMG using the image that is now in the browser's
        // cache. Normal viewing never waits for this explicit retry probe.
        setVersion(value => value + 1);
      }
    };
    probe.onerror = () => finish(false);
    probe.onload = async () => {
      try {
        if (probe.decode) await probe.decode();
        finish(probe.naturalWidth > 0);
      } catch {finish(false);}
    };
    pending.current.timer = setTimeout(() => finish(false), 20000);
    probe.src = item.src;
  };

  return <>
    <Lightbox key={version} ref={dialog} isOpen={!failed} media={media} index={index}
      onIndexChange={navigate} onOpenChange={open => {if (!open) close();}} hasZoom
      onErrorCapture={event => {
        if (event.target.tagName === 'IMG' && event.target.src === item.src) setFailedImage(imageKey);
      }}/>
    {failed && <GalleryFeedback en={en} kind="image" state={retrying ? 'loading' : 'error'}
      hasRetried={retrying} onRetry={retry} onClose={close} original={item.src}
      onPrevious={index > 0 ? () => navigate(index - 1) : undefined}
      onNext={index < media.length - 1 ? () => navigate(index + 1) : undefined}/>}
  </>;
}
