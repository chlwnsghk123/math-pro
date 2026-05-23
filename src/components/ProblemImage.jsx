import { useState } from 'react';
import { IconImageOff } from './Icons.jsx';

export default function ProblemImage({
  src,
  alt,
  className = '',
  imgClassName = '',
  loading = 'lazy',
  ratio = '4 / 3',
}) {
  const [status, setStatus] = useState('loading');

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl bg-slate-50 ${className}`}
      style={{ aspectRatio: ratio }}
    >
      {status === 'loading' && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-100 to-slate-200" />
      )}
      {status === 'error' ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
          <IconImageOff className="h-8 w-8" />
          <span className="text-xs font-medium">이미지 로드 실패</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={`relative h-full w-full object-contain ${
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-200 ${imgClassName}`}
        />
      )}
    </div>
  );
}
