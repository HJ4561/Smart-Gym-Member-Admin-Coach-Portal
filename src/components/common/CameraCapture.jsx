// src/components/common/CameraCapture.jsx
// Take a photo with the desk's webcam (or choose a file when there's no camera). Calls onChange(File).
import { useEffect, useRef, useState } from 'react';
import { btn } from '../site/siteStyles';
import { tl } from '../../i18n';

export default function CameraCapture({ value, onChange, error }) {
  const video = useRef(null);
  const stream = useRef(null);
  const [live, setLive] = useState(false);
  const [problem, setProblem] = useState('');
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!value) return undefined;
    const url = URL.createObjectURL(value);
    const id = setTimeout(() => setPreview(url), 0);
    return () => { clearTimeout(id); URL.revokeObjectURL(url); };
  }, [value]);

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setLive(false);
  };
  useEffect(() => stop, []);

  const start = async () => {
    setProblem('');
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 960, height: 720 } });
      setLive(true);
      requestAnimationFrame(() => { if (video.current) { video.current.srcObject = stream.current; video.current.play(); } });
    } catch {
      setProblem(tl('The camera isn’t available. Choose a photo file instead.'));
    }
  };

  const snap = () => {
    const v = video.current;
    if (!v?.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    c.toBlob((blob) => {
      if (blob) onChange(new File([blob], 'desk-photo.jpg', { type: 'image/jpeg' }));
      stop();
    }, 'image/jpeg', 0.92);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="w-full max-w-xs aspect-[4/3] rounded-lg overflow-hidden bg-[#0a0a0c] border border-[#1a1a1e] grid place-items-center">
        {live ? <video ref={video} className="w-full h-full object-cover -scale-x-100" muted playsInline />
          : value && preview ? <img src={preview} alt={tl('Member photo')} className="w-full h-full object-cover" />
            : <span className="material-symbols-outlined text-[40px] text-on-surface-variant" aria-hidden="true">photo_camera</span>}
      </div>
      <div className="flex gap-2 flex-wrap">
        {live ? (
          <>
            <button type="button" className={btn.primary} onClick={snap}>{tl('Take photo')}</button>
            <button type="button" className={btn.ghost} onClick={stop}>{tl('Cancel')}</button>
          </>
        ) : (
          <>
            <button type="button" className={btn.primary} onClick={start}>{value ? tl('Retake') : tl('Open camera')}</button>
            <label className={`${btn.ghost} cursor-pointer`}>
              {tl('Choose file')}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                onChange={(e) => { if (e.target.files?.[0]) onChange(e.target.files[0]); e.target.value = ''; }} />
            </label>
          </>
        )}
      </div>
      {(problem || error) && <span className="text-[11px] text-rose-400">{problem || tl(error)}</span>}
    </div>
  );
}
