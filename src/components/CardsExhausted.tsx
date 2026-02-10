'use client';

interface CardsExhaustedProps {
  likedCount: number;
  onExpandRadius: () => void;
  onChangeMood: () => void;
  onShowLikedMap: () => void;
}

export default function CardsExhausted({
  likedCount,
  onExpandRadius,
  onChangeMood,
  onShowLikedMap,
}: CardsExhaustedProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <p className="text-4xl mb-3" aria-hidden="true">🎉</p>
        <h2 className="text-xl font-bold text-gray-900">すべてチェックしました！</h2>
        {likedCount > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            {likedCount}件のお気に入りがあります
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onExpandRadius}
          className="w-full py-3 px-4 bg-blue-800 text-white rounded-xl font-medium text-sm
                     hover:bg-blue-700 active:scale-[0.98] transition-all"
          aria-label="範囲を広げてもっと探す"
        >
          範囲を広げてもっと探す
        </button>

        <button
          onClick={onChangeMood}
          className="w-full py-3 px-4 bg-white text-gray-700 rounded-xl font-medium text-sm
                     border border-gray-200 hover:border-gray-300
                     active:scale-[0.98] transition-all"
          aria-label="気分を変える"
        >
          気分を変える
        </button>

        {likedCount > 0 && (
          <button
            onClick={onShowLikedMap}
            className="w-full py-3 px-4 bg-white text-blue-800 rounded-xl font-medium text-sm
                       border border-blue-200 hover:border-blue-300
                       active:scale-[0.98] transition-all"
            aria-label="お気に入りを地図で見る"
          >
            お気に入りを地図で見る
          </button>
        )}
      </div>
    </div>
  );
}
