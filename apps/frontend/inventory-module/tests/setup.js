import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

globalThis.React = React;

if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal ??= function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close ??= function close() {
    this.removeAttribute("open");
  };
}

// Automatically cleanup after each React testing library render
afterEach(() => {
  cleanup();
});

