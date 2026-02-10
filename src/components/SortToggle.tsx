import type { SortBy } from '@/types/spot';

interface SortToggleProps {
  sortBy: SortBy;
  onSortChange: (sortBy: SortBy) => void;
}

export default function SortToggle({ sortBy, onSortChange }: SortToggleProps) {
  const label = sortBy === 'distance' ? '距離順' : '評価順';

  const handleClick = () => {
    onSortChange(sortBy === 'distance' ? 'rating' : 'distance');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed top-4 left-4 z-50 px-3 h-10 rounded-lg bg-white shadow-md text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
      aria-label={`ソート切り替え: 現在 ${label}`}
    >
      {label}
    </button>
  );
}
