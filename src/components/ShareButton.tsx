'use client';

import { useState, useCallback } from 'react';
import type { VibePlace, Mood } from '@/types/vibe';
import { buildPlaceShareUrl, shareOrCopy } from '@/lib/share';

interface ShareButtonProps {
  place: VibePlace;
  mood: Mood;
}

export default function ShareButton({ place, mood }: ShareButtonProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'shared'>('idle');

  const handleShare = useCallback(async () => {
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : '';

    const shareUrl = buildPlaceShareUrl(baseUrl, place, mood);

    const result = await shareOrCopy(
      `${place.name} - VIBE MAP`,
      place.catchphrase,
      shareUrl,
    );

    if (result === 'copied') {
      setStatus('copied');
      setTimeout(() => setStatus('idle'), 2000);
    } else if (result === 'shared') {
      setStatus('shared');
      setTimeout(() => setStatus('idle'), 2000);
    }
  }, [place, mood]);

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                 text-white/80 bg-white/10 backdrop-blur-sm
                 rounded-full border border-white/20
                 hover:bg-white/20 active:scale-95 transition-all"
      aria-label={`${place.name}をシェアする`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-3.5 h-3.5"
      >
        <path d="M13 4.5a2.5 2.5 0 11.702 1.737L6.97 9.604a2.518 2.518 0 010 .792l6.733 3.367a2.5 2.5 0 11-.671 1.341l-6.733-3.367a2.5 2.5 0 110-3.474l6.733-3.367A2.52 2.52 0 0113 4.5z" />
      </svg>
      {status === 'copied' ? 'コピー済み' : status === 'shared' ? 'シェア済み' : 'シェア'}
    </button>
  );
}
