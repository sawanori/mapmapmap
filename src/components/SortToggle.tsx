import type { SortBy } from '@/types/spot';

interface SortToggleProps {
  sortBy: SortBy;
  onSortChange: (sortBy: SortBy) => void;
}

const SORT_CYCLE: SortBy[] = ['relevance', 'distance', 'rating'];
const SORT_LABELS: Record<SortBy, string> = {
  relevance: '関連度順',
  distance: '距離順',
  rating: '評価順',
};

export default function SortToggle({ sortBy, onSortChange }: SortToggleProps) {
  const label = SORT_LABELS[sortBy];

  const handleClick = () => {
    const currentIndex = SORT_CYCLE.indexOf(sortBy);
    const nextIndex = (currentIndex + 1) % SORT_CYCLE.length;
    onSortChange(SORT_CYCLE[nextIndex]);
  };

  return (
    <button
      onClick={handleClick}
      className="fixed top-4 left-4 z-50 px-3 h-10 rounded-lg bg-white shadow-md text-sm font-bold text-blue-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
      aria-label={`ソート切り替え: 現在 ${label}`}
    >
      {label}
    </button>
  );
}
