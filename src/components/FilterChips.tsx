'use client';

interface Filters {
  radiusMeters: number;
  openNow: boolean;
  maxPriceLevel: number | null;
}

interface FilterChipsProps {
  filters: Filters;
  onFilterChange: (partial: Partial<Filters>) => void;
}

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors
        ${active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
        }`}
    >
      {children}
    </button>
  );
}

export default function FilterChips({ filters, onFilterChange }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center" role="group" aria-label="フィルター">
      {/* Distance */}
      <ChipButton
        active={filters.radiusMeters === 900}
        onClick={() => onFilterChange({ radiusMeters: 900 })}
      >
        徒歩10分
      </ChipButton>
      <ChipButton
        active={filters.radiusMeters === 1800}
        onClick={() => onFilterChange({ radiusMeters: 1800 })}
      >
        徒歩20分
      </ChipButton>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-200 self-center" />

      {/* Open Now */}
      <ChipButton
        active={filters.openNow}
        onClick={() => onFilterChange({ openNow: !filters.openNow })}
      >
        営業中
      </ChipButton>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-200 self-center" />

      {/* Price */}
      <ChipButton
        active={filters.maxPriceLevel === 1}
        onClick={() => onFilterChange({ maxPriceLevel: filters.maxPriceLevel === 1 ? null : 1 })}
      >
        ~¥1000
      </ChipButton>
      <ChipButton
        active={filters.maxPriceLevel === 2}
        onClick={() => onFilterChange({ maxPriceLevel: filters.maxPriceLevel === 2 ? null : 2 })}
      >
        ~¥3000
      </ChipButton>
    </div>
  );
}
