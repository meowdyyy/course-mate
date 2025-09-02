import { useState } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';

export default function StarRating({ average, userRating, onRate, disabled = false, count }) {
  const [hover, setHover] = useState(null);
  const displayValue = hover || userRating || 0;
  return (
    <div className="flex items-center space-x-2">
      <div className="flex">
        {[1,2,3,4,5].map(v => {
          const active = displayValue >= v;
          const Icon = active ? StarIcon : StarOutline;
          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onMouseEnter={() => !disabled && setHover(v)}
              onMouseLeave={() => setHover(null)}
              onClick={() => !disabled && onRate && onRate(v)}
              className={`h-5 w-5 ${disabled ? 'cursor-default' : 'cursor-pointer'} text-yellow-400 transition-colors`}
              aria-label={`Rate ${v}`}
            >
              <Icon />
            </button>
          )
        })}
      </div>
      <div className="text-xs text-gray-600">
        {average ? `${average} / 5` : 'No ratings'}{count ? ` (${count})` : ''}
      </div>
    </div>
  );
}
