'use client';

import { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { VibePlace, Mood } from '@/types/vibe';
import VibeCard from './VibeCard';
import LikePassButtons from './LikePassButtons';

const SWIPE_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 500;

interface CardStackProps {
  cards: VibePlace[];
  currentIndex: number;
  mood?: Mood;
  onLike: (place: VibePlace) => void;
  onPass: (placeId: string) => void;
  onTap?: (place: VibePlace) => void;
}

export default function CardStack({
  cards,
  currentIndex,
  mood,
  onLike,
  onPass,
  onTap,
}: CardStackProps) {
  const currentCard = cards[currentIndex] ?? null;
  const nextCard = cards[currentIndex + 1] ?? null;

  const handleLike = useCallback(() => {
    if (currentCard) onLike(currentCard);
  }, [currentCard, onLike]);

  const handlePass = useCallback(() => {
    if (currentCard) onPass(currentCard.id);
  }, [currentCard, onPass]);

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
        case 'Enter':
        case ' ':
          e.preventDefault();
          onTap?.(currentCard);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentCard, handleLike, handlePass, onTap]);

  if (!currentCard) return null;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
      {/* Card area */}
      <div
        className="relative w-full aspect-[3/4]"
        style={{ touchAction: 'none' }}
        role="region"
        aria-label="スワイプカード"
        aria-roledescription="カードスタック"
      >
        {/* Next card preview (behind current) */}
        {nextCard && (
          <div className="absolute inset-0 scale-[0.95] opacity-50">
            <VibeCard place={nextCard} />
          </div>
        )}

        {/* Current card with drag */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentCard.id}
            className="absolute inset-0"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.9}
            onDragEnd={(_e, info) => {
              const { offset, velocity } = info;

              // Y-axis dead zone
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
            animate={{ scale: 1, opacity: 1 }}
            exit={{ x: 300, opacity: 0, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            whileDrag={{ cursor: 'grabbing' }}
          >
            <VibeCard
              place={currentCard}
              mood={mood}
              onTap={() => onTap?.(currentCard)}
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
