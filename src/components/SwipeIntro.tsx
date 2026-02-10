'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from 'motion/react';
import type { VibePlace } from '@/types/vibe';
import VibeCard from './VibeCard';
import LikePassButtons from './LikePassButtons';

const SWIPE_THRESHOLD = 160;
const VELOCITY_THRESHOLD = 800;
const EXIT_X = 400;

interface SwipeIntroProps {
  places: VibePlace[];
  savedPlaceIds: string[];
  onLike: (placeId: string) => void;
  onToggleSaved: (placeId: string) => void;
  onComplete: () => void;
}

export default function SwipeIntro({
  places,
  savedPlaceIds,
  onLike,
  onToggleSaved,
  onComplete,
}: SwipeIntroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const exitDirectionRef = useRef<'left' | 'right'>('right');

  const currentCard = places[currentIndex] ?? null;
  const nextCard = places[currentIndex + 1] ?? null;

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const likeOpacity = useTransform(x, [0, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, 0], [1, 0]);

  const advance = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= places.length) {
      onComplete();
    } else {
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex, places.length, onComplete]);

  const handleLike = useCallback(() => {
    if (!currentCard) return;
    exitDirectionRef.current = 'right';
    onLike(currentCard.id);
    advance();
  }, [currentCard, onLike, advance]);

  const handlePass = useCallback(() => {
    if (!currentCard) return;
    exitDirectionRef.current = 'left';
    advance();
  }, [currentCard, advance]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentCard) return;
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          handleLike();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePass();
          break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentCard, handleLike, handlePass]);

  // Empty state
  if (places.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
        <p className="text-sm text-gray-600">
          近くで条件に合う候補が見つかりませんでした。
        </p>
      </div>
    );
  }

  // All swiped — should not render (onComplete triggers transition)
  if (!currentCard) return null;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto px-4 pt-4">
      {/* Progress indicator */}
      <div className="flex items-center gap-1.5">
        {places.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all ${
              i < currentIndex
                ? 'w-6 bg-blue-600'
                : i === currentIndex
                  ? 'w-6 bg-blue-400'
                  : 'w-4 bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Card area */}
      <div
        className="relative w-full aspect-[3/4]"
        style={{ touchAction: 'none' }}
        role="region"
        aria-label="スワイプカード"
      >
        {/* Next card preview */}
        {nextCard && (
          <div className="absolute inset-0 scale-[0.95] opacity-50">
            <VibeCard
              place={nextCard}
              isSaved={savedPlaceIds.includes(nextCard.id)}
              onToggleSaved={() => {}}
            />
          </div>
        )}

        {/* Current card with drag */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentCard.id}
            className="absolute inset-0"
            style={{ x, rotate }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_e, info) => {
              const { offset, velocity } = info;
              if (Math.abs(offset.y) > Math.abs(offset.x) * 1.5) return;
              if (
                offset.x > SWIPE_THRESHOLD ||
                velocity.x > VELOCITY_THRESHOLD
              ) {
                handleLike();
              } else if (
                offset.x < -SWIPE_THRESHOLD ||
                velocity.x < -VELOCITY_THRESHOLD
              ) {
                handlePass();
              }
            }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{
              x: exitDirectionRef.current === 'right' ? EXIT_X : -EXIT_X,
              opacity: 0,
              rotate: exitDirectionRef.current === 'right' ? 20 : -20,
              transition: { duration: 0.3 },
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* LIKE stamp */}
            <motion.div
              className="absolute top-8 left-6 z-10 pointer-events-none"
              style={{ opacity: likeOpacity }}
            >
              <div className="px-4 py-2 border-4 border-emerald-400 rounded-lg rotate-[-15deg]">
                <span className="text-3xl font-black text-emerald-400 tracking-wider">
                  LIKE
                </span>
              </div>
            </motion.div>

            {/* NOPE stamp */}
            <motion.div
              className="absolute top-8 right-6 z-10 pointer-events-none"
              style={{ opacity: nopeOpacity }}
            >
              <div className="px-4 py-2 border-4 border-red-400 rounded-lg rotate-[15deg]">
                <span className="text-3xl font-black text-red-400 tracking-wider">
                  NOPE
                </span>
              </div>
            </motion.div>

            <VibeCard
              place={currentCard}
              isSaved={savedPlaceIds.includes(currentCard.id)}
              onToggleSaved={() => onToggleSaved(currentCard.id)}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Like/Pass buttons */}
      <LikePassButtons
        onLike={handleLike}
        onPass={handlePass}
      />
    </div>
  );
}
