import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

const WIDTH_CLASSES = {
  sm: "w-[480px]",
  md: "w-[720px]",
  lg: "w-[820px]",
  xl: "w-[900px]",
};

function Modal({ title, description, onClose, width = "lg", children }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocusedElement = document.activeElement;
    dialog.showModal();
    dialog.querySelector("[data-autofocus]")?.focus();
    return () => {
      dialog.close();
      previouslyFocusedElement?.focus?.();
    };
  }, []);

  function handleCancel(event) {
    event.preventDefault();
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={handleCancel}
      className={`m-auto hidden max-h-[calc(100dvh-2rem)] ${WIDTH_CLASSES[width]} max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border-0 bg-surface p-0 text-ink shadow-[0_24px_60px_rgba(15,23,42,0.28)] open:flex backdrop:bg-[#0f172a]/[0.73]`}
    >
      <div className="relative shrink-0 border-b border-field-line pb-4 pl-6 pr-16 pt-[18px]">
        <h2 id={titleId} className="text-[20px] font-bold leading-7 text-ink sm:text-[22px]">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="mt-px text-[13px] leading-[18px] text-muted">
            {description}
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-6 top-5 grid size-8 place-items-center rounded-full bg-line-soft text-muted hover:bg-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          <X size={16} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export default Modal;
