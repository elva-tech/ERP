import { Star } from "lucide-react";

const TOTAL_STARS = 5;

/** Display of a backend rating; `filledStars` is supplied by the API, not derived here. */
function RatingStars({ filledStars, rating }) {
  const filled = Number.isInteger(filledStars) ? filledStars : 0;
  return (
    <span className="inline-flex items-center gap-1 text-brand">
      <span className="inline-flex" aria-hidden="true">
        {Array.from({ length: TOTAL_STARS }, (_, index) => (
          <Star
            key={index}
            size={12.5}
            strokeWidth={1.75}
            fill={index < filled ? "currentColor" : "none"}
          />
        ))}
      </span>
      <span className="text-[12px] font-semibold" aria-hidden="true">
        ({rating})
      </span>
      <span className="sr-only">
        Rated {rating} out of {TOTAL_STARS}
      </span>
    </span>
  );
}

export default RatingStars;
