import { Star } from "lucide-react";
import FormField from "./FormField.jsx";

const STARS = [1, 2, 3, 4, 5];

/** Whole-star rating picker rendered as a radio group inside a field-styled box. */
function StarRatingInput({ id, label, value, onChange, error }) {
  const selected = Number(value) || 0;
  return (
    <FormField label={label} htmlFor={`${id}-1`} error={error}>
      <div
        role="radiogroup"
        aria-label={label}
        className={`flex h-[38px] items-center gap-1 rounded-md border bg-field px-2.5 ${error ? "border-danger" : "border-field-line"}`}
      >
        {STARS.map((star) => (
          <button
            key={star}
            id={`${id}-${star}`}
            type="button"
            role="radio"
            aria-checked={selected === star}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            onClick={() => onChange(selected === star ? "" : String(star))}
            className="grid size-6 place-items-center rounded text-warning-strong focus-visible:outline-2 focus-visible:outline-navy"
          >
            <Star size={16} strokeWidth={1.75} fill={star <= selected ? "currentColor" : "none"} aria-hidden="true" />
          </button>
        ))}
        <span className="ml-1.5 text-[12px] text-placeholder">{selected ? `${selected} of 5` : "Select rating"}</span>
      </div>
    </FormField>
  );
}

export default StarRatingInput;
