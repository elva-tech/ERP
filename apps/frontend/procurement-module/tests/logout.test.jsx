import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock("../src/features/auth/authService.js", async (importOriginal) => ({
  ...(await importOriginal()),
  signOut: mocks.signOut,
}));

import UserMenu from "../src/components/layout/UserMenu.jsx";
import { ApiError } from "../src/lib/apiClient.js";
import { clearClientSession } from "../src/features/auth/authService.js";
import { SessionContext } from "../src/features/auth/sessionContext.js";

const session = {
  user: { id: "u1", displayName: "Demo User", roleLabel: "Procurement Manager", avatarUrl: null },
  tenant: { id: "t1", name: "Demo Tenant" },
  permissions: [],
  navigation: [],
};

function renderMenu(markSignedOut) {
  return render(
    <SessionContext.Provider value={{ status: "authenticated", session, error: null, reload: vi.fn(), markSignedOut }}>
      <UserMenu />
    </SessionContext.Provider>,
  );
}

async function logOut() {
  fireEvent.click(screen.getByRole("button", { name: /Account menu/ }));
  fireEvent.click(screen.getByRole("menuitem", { name: /Log out/ }));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem("procurement.notifications.v1:u1", "{}");
  sessionStorage.setItem("procurement.draft", "x");
  localStorage.setItem("other.app.key", "keep");
});

describe("logout", () => {
  it("ends the session and clears Procurement storage when the backend answers", async () => {
    mocks.signOut.mockResolvedValue(null);
    const markSignedOut = vi.fn();
    renderMenu(markSignedOut);
    await logOut();
    await waitFor(() => expect(markSignedOut).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem("procurement.notifications.v1:u1")).toBeNull();
    expect(sessionStorage.getItem("procurement.draft")).toBeNull();
    expect(localStorage.getItem("other.app.key")).toBe("keep");
  });

  it("shows an error and keeps session state when the server logout fails", async () => {
    mocks.signOut.mockRejectedValue(
      new ApiError("unavailable", "The procurement service is temporarily unavailable."),
    );
    const markSignedOut = vi.fn();
    renderMenu(markSignedOut);
    await logOut();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/temporarily unavailable/i));
    expect(markSignedOut).not.toHaveBeenCalled();
    expect(localStorage.getItem("procurement.notifications.v1:u1")).toBe("{}");
  });

  it("clears client state when the session is already unauthorized", async () => {
    mocks.signOut.mockRejectedValue(new ApiError("unauthorized", "Session expired."));
    const markSignedOut = vi.fn();
    renderMenu(markSignedOut);
    await logOut();
    await waitFor(() => expect(markSignedOut).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem("procurement.notifications.v1:u1")).toBeNull();
  });

  it("clearClientSession tolerates unavailable storage", () => {
    expect(() => clearClientSession([null, { get length() { throw new Error("blocked"); } }])).not.toThrow();
  });
});