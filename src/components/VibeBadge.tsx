'use client';

interface VibeBadgeProps {
  tag: string;
}

export default function VibeBadge({ tag }: VibeBadgeProps) {
  return (
    <span className="inline-block px-3 py-1 text-xs font-medium text-white/90
                     bg-white/20 backdrop-blur-md border border-white/30
                     rounded-full whitespace-nowrap">
      {tag}
    </span>
  );
}
