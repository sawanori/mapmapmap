'use client';

interface LikePassButtonsProps {
  onLike: () => void;
  onPass: () => void;
  disabled?: boolean;
}

export default function LikePassButtons({ onLike, onPass, disabled = false }: LikePassButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-6">
      <button
        onClick={onPass}
        disabled={disabled}
        aria-label="パスする"
        className="flex items-center justify-center w-14 h-14 rounded-full
                   bg-white shadow-lg border border-gray-200
                   text-gray-400 hover:text-red-400 hover:border-red-200
                   active:scale-95 transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <button
        onClick={onLike}
        disabled={disabled}
        aria-label="お気に入りに追加"
        className="flex items-center justify-center w-16 h-16 rounded-full
                   bg-blue-800 shadow-lg
                   text-white hover:bg-blue-700
                   active:scale-95 transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
        </svg>
      </button>
    </div>
  );
}
