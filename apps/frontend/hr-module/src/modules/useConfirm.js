import { createElement, useCallback, useRef, useState } from "react";
import { ConfirmDialog } from "./ui";

/**
 * In-app replacement for window.confirm / window.prompt.
 * const confirm = useConfirm();
 * await confirm.ask({ title, message, confirmLabel, cancelLabel, danger })                -> true | false
 * await confirm.ask({ ..., input: { label, defaultValue, required, type, min, step } })   -> string | null
 * Render {confirm.dialog} once in the component.
 */
export function useConfirm() {
  const [request, setRequest] = useState(null);
  const counter = useRef(0);
  const ask = useCallback((options) => new Promise((resolve) => {
    counter.current += 1;
    setRequest({ ...options, resolve, id: counter.current });
  }), []);

  const dialog = request
    ? createElement(ConfirmDialog, {
        key: request.id,
        request,
        onSettle: (result) => {
          request.resolve(result);
          setRequest(null);
        },
      })
    : null;

  return { ask, dialog };
}
