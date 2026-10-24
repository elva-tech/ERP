import { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";

/**
 * Single-file picker with drag and drop. Type and size limits are the ones stated in the design;
 * the backend must enforce them again and scan the file.
 */
function FileDropzone({ id, label, hint, accept, acceptedTypes, maxBytes, file, onChange, error }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState(null);
  const shownError = localError ?? error;

  function selectFile(nextFile) {
    if (!nextFile) return;
    if (!acceptedTypes.includes(nextFile.type)) {
      setLocalError("Only PDF, JPG or PNG files can be attached.");
      return;
    }
    if (nextFile.size > maxBytes) {
      setLocalError(`The file is larger than ${Math.round(maxBytes / (1024 * 1024))} MB.`);
      return;
    }
    setLocalError(null);
    onChange(nextFile);
  }

  if (file) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-field-line bg-field px-3 py-2.5">
        <span className="flex min-w-0 items-center gap-2 text-[12px] text-ink">
          <FileText size={16} className="shrink-0 text-muted" aria-hidden="true" />
          <span className="truncate">{file.name}</span>
          <span className="shrink-0 text-muted">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={`Remove ${file.name}`}
          className="grid size-7 place-items-center rounded-md text-muted hover:bg-workspace hover:text-danger"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          selectFile(event.dataTransfer.files?.[0]);
        }}
        className={`flex flex-col items-center justify-center gap-1 rounded-md border border-dashed px-4 py-[13px] text-center ${
          isDragging ? "border-accent bg-accent/5" : shownError ? "border-danger" : "border-field-line"
        }`}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-describedby={`${id}-hint${shownError ? ` ${id}-error` : ""}`}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          <Upload size={13} strokeWidth={2.5} aria-hidden="true" />
          {label}
        </button>
        <p id={`${id}-hint`} className="text-[10px] leading-[14px] text-placeholder">
          {hint}
        </p>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            selectFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      {shownError && (
        <p id={`${id}-error`} className="mt-1 text-[11px] leading-[14px] text-danger">
          {shownError}
        </p>
      )}
    </div>
  );
}

export default FileDropzone;
