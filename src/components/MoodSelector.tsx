'use client';

import type { Mood } from '@/types/vibe';
import { MOOD_LABELS } from '@/types/vibe';

interface MoodSelectorProps {
  onSelect: (mood: Mood) => void;
  disabled?: boolean;
}

const MOOD_ICONS: Record<Mood, string> = {
  chill: '🌿',
  party: '🎉',
  focus: '📖',
};

const MOOD_ORDER: Mood[] = ['chill', 'party', 'focus'];

export default function MoodSelector({ onSelect, disabled = false }: MoodSelectorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">今の気分は？</h1>
        <p className="text-sm text-gray-500 mt-2">気分に合ったスポットを見つけよう</p>
      </div>

      <div
        className="flex flex-col gap-4 w-full max-w-xs"
        role="group"
        aria-label="ムード選択"
      >
        {MOOD_ORDER.map((mood) => (
          <button
            key={mood}
            onClick={() => onSelect(mood)}
            disabled={disabled}
            aria-label={`${MOOD_LABELS[mood].ja}モードを選択`}
            className="flex items-center gap-4 px-6 py-4 bg-white rounded-2xl shadow-md
                       border border-gray-100 hover:border-blue-300 hover:shadow-lg
                       active:scale-[0.98] transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-3xl" aria-hidden="true">{MOOD_ICONS[mood]}</span>
            <div className="text-left">
              <span className="block text-lg font-semibold text-gray-900">
                {MOOD_LABELS[mood].ja}
              </span>
              <span className="block text-xs text-gray-400">
                {MOOD_LABELS[mood].en}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
