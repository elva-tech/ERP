import React from "react";
import { Plus, Trash2 } from "lucide-react";
import SelectInput from "./SelectInput.jsx";
import { INPUT_CLASS } from "./formStyles.js";

/**
 * Editable line items for creation modals (Procurement pattern).
 */
function LineItemsEditor({ form, name = "items", idPrefix, label = "Items", columns, emptyItem, addLabel, computedHint }) {
  const items = form.values[name] ?? [];
  const template = `${columns.map((column) => column.width).join(" ")}${emptyItem ? " 32px" : ""}`;
  const listError = form.fieldErrors[name];

  function updateItem(index, key, value) {
    form.setValue(
      name,
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    );
  }

  function removeItem(index) {
    form.setValue(
      name,
      items.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  return (
    <div role="group" aria-labelledby={`${idPrefix}-${name}-label`} className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <span id={`${idPrefix}-${name}-label`} className="text-[13px] font-semibold leading-4 text-ink">
          {label}
        </span>
        {emptyItem && addLabel && (
          <button
            type="button"
            onClick={() => form.setValue(name, [...items, { ...emptyItem }])}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
            {addLabel}
          </button>
        )}
      </div>

      <div className="mt-1.5 overflow-x-auto">
        <div className="min-w-[560px]">
          <div
            aria-hidden="true"
            className="grid h-[29px] items-center gap-2 rounded bg-workspace px-2.5 text-[11px] font-semibold leading-[14px] text-muted"
            style={{ gridTemplateColumns: template }}
          >
            {columns.map((column) => (
              <span key={column.key} className="truncate">
                {column.label}
              </span>
            ))}
            {emptyItem && <span className="sr-only">Remove</span>}
          </div>

          <div className="mt-2 space-y-2">
            {items.map((item, index) => (
              <div key={index} className="grid items-start gap-2" style={{ gridTemplateColumns: template }}>
                {columns.map((column) => (
                  <LineItemCell
                    key={column.key}
                    column={column}
                    item={item}
                    id={`${idPrefix}-${name}-${index}-${column.key}`}
                    value={item[column.key] ?? ""}
                    error={form.fieldErrors[`${name}.${index}.${column.key}`]}
                    rowLabel={`line ${index + 1}`}
                    onChange={(value) => updateItem(index, column.key, value)}
                  />
                ))}
                {emptyItem && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                    aria-label={`Remove line ${index + 1}`}
                    className="grid h-[38px] w-8 place-items-center rounded-md text-muted hover:bg-workspace hover:text-danger disabled:invisible"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {computedHint && <p className="mt-1.5 text-[11px] leading-[14px] text-placeholder">{computedHint}</p>}
      {listError && <p className="mt-1.5 text-[11px] leading-[14px] text-danger">{listError}</p>}
    </div>
  );
}

function LineItemCell({ column, item, id, value, error, rowLabel, onChange }) {
  const ariaLabel = `${column.label}, ${rowLabel}`;
  const errorId = error ? `${id}-error` : undefined;
  const errorText = error && (
    <p id={errorId} className="mt-1 text-[11px] leading-[14px] text-danger">
      {error}
    </p>
  );

  if (column.kind === "computed") {
    const display = column.compute ? column.compute(item) : "—";
    return (
      <output
        id={id}
        aria-label={ariaLabel}
        className="flex h-[38px] items-center rounded-md border border-field-line bg-workspace px-3 text-[13px] font-semibold text-ink"
      >
        {display}
      </output>
    );
  }

  if (column.kind === "readonly") {
    return (
      <output
        id={id}
        aria-label={ariaLabel}
        className="flex h-[38px] items-center rounded-md border border-field-line bg-workspace px-3 text-[13px] text-muted"
      >
        {value || "—"}
      </output>
    );
  }

  if (column.kind === "select") {
    return (
      <div className="min-w-0">
        <label htmlFor={id} className="sr-only">
          {ariaLabel}
        </label>
        <SelectInput
          id={id}
          name={id}
          value={value}
          placeholder={column.placeholder ?? "Select"}
          options={column.lookup?.options ?? []}
          status={column.lookup?.status ?? "success"}
          invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.value)}
        />
        {errorText}
      </div>
    );
  }

  const isNumeric = column.kind === "quantity" || column.kind === "decimal";
  return (
    <div className="min-w-0">
      <input
        id={id}
        type="text"
        inputMode={isNumeric ? "decimal" : undefined}
        autoComplete="off"
        aria-label={ariaLabel}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        placeholder={column.placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT_CLASS}
      />
      {errorText}
    </div>
  );
}

export default LineItemsEditor;
