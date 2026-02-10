'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SearchResult } from '@/types/spot';

interface SpotCardProps {
  spot: SearchResult | null;
  onClose: () => void;
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m先`;
  }
  return `${km.toFixed(1)}km先`;
}

const DRAG_DISMISS_THRESHOLD = 100;

export default function SpotCard({ spot, onClose }: SpotCardProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);

  // Escape key handler
  useEffect(() => {
    if (!spot) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [spot, onClose]);

  // Focus management
  useEffect(() => {
    if (spot && sheetRef.current) {
      sheetRef.current.focus();
    }
  }, [spot]);

  // Reset drag state when spot changes
  useEffect(() => {
    setDragY(0);
    setIsDragging(false);
  }, [spot]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0) {
      // Only allow dragging down
      setDragY(diff);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (dragY > DRAG_DISMISS_THRESHOLD) {
      onClose();
    }
    setDragY(0);
  }, [dragY, onClose]);

  if (!spot) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-label={`${spot.name}の詳細`}
        aria-modal="true"
        tabIndex={-1}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl
                   animate-slide-up
                   max-h-[70vh] overflow-y-auto
                   pb-[env(safe-area-inset-bottom)]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: isDragging ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Header: Name + Category */}
          <div>
            <h2 className="text-xl font-bold text-gray-900">{spot.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                {spot.category}
              </span>
              <span className="text-sm text-gray-400">
                {formatDistance(spot.distance)}
              </span>
            </div>
          </div>

          {/* Rating */}
          {spot.rating != null && (
            <div className="flex items-center gap-1">
              <span className="text-yellow-500 text-sm">
                {'★'.repeat(Math.round(spot.rating))}{'☆'.repeat(5 - Math.round(spot.rating))}
              </span>
              <span className="text-sm text-gray-600">{spot.rating.toFixed(1)}</span>
            </div>
          )}

          {/* Address */}
          {spot.address && (
            <p className="text-xs text-gray-500">{spot.address}</p>
          )}

          {/* Opening Hours */}
          {spot.openingHours && (() => {
            try {
              const hours = JSON.parse(spot.openingHours) as string[];
              if (hours.length === 0) return null;
              return (
                <details className="text-xs text-gray-500">
                  <summary className="cursor-pointer font-medium">営業時間</summary>
                  <ul className="mt-1 space-y-0.5 pl-2">
                    {hours.map((line, i) => <li key={i}>{line}</li>)}
                  </ul>
                </details>
              );
            } catch { return null; }
          })()}

          {/* Description */}
          {spot.description && (
            <p className="text-sm text-gray-700 leading-relaxed">
              {spot.description}
            </p>
          )}

          {/* Magazine Context */}
          {spot.magazineContext && (
            <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
              <span className="shrink-0 font-medium">掲載情報:</span>
              <span>{spot.magazineContext}</span>
            </div>
          )}

          {/* Google Maps link */}
          <a
            href={
              spot.googlePlaceId
                ? `https://www.google.com/maps/place/?q=place_id:${spot.googlePlaceId}`
                : `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 bg-gray-900 text-white rounded-xl font-medium text-sm
                       text-center hover:bg-gray-800 active:bg-gray-700 transition-colors"
            aria-label={`${spot.name}をGoogle Mapsで開く`}
          >
            Google Mapsで開く
          </a>
        </div>
      </div>
    </>
  );
}
