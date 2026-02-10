'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from 'motion/react';
import type { VibePlace, Mood } from '@/types/vibe';
import VibeCard from './VibeCard';
import LikePassButtons from './LikePassButtons';

const SWIPE_THRESHOLD = 160;
const VELOCITY_THRESHOLD = 800;
const EXIT_X = 400;

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
  const exitDirectionRef = useRef<'left' | 'right'>('right');

  // Motion values for drag feedback
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const likeOpacity = useTransform(x, [0, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, 0], [1, 0]);

  const handleLike = useCallback(() => {
    if (!currentCard) return;
    exitDirectionRef.current = 'right';
    onLike(currentCard);
  }, [currentCard, onLike]);

  const handlePass = useCallback(() => {
    if (!currentCard) return;
    exitDirectionRef.current = 'left';
    onPass(currentCard.id);
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
            style={{ x, rotate }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
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
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{
              x: exitDirectionRef.current === 'right' ? EXIT_X : -EXIT_X,
              opacity: 0,
              rotate: exitDirectionRef.current === 'right' ? 20 : -20,
              transition: { duration: 0.3 },
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            whileDrag={{ cursor: 'grabbing' }}
          >
            {/* LIKE stamp overlay */}
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

            {/* NOPE stamp overlay */}
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
