import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock("../src/features/auth/authService.js", async (importOriginal) => ({
  ...(await importOriginal()),
  signOut: mocks.signOut,
}));

import LoginPage from "../src/pages/LoginPage.jsx";
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

  it("still signs out, without a connection error, when the service cannot be reached", async () => {
    mocks.signOut.mockRejectedValue(
      new ApiError("network", "Unable to reach the procurement service. Check your connection."),
    );
    const markSignedOut = vi.fn();
    renderMenu(markSignedOut);
    await logOut();
    await waitFor(() => expect(markSignedOut).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Unable to reach the procurement service/)).not.toBeInTheDocument();
    expect(localStorage.getItem("procurement.notifications.v1:u1")).toBeNull();
  });

  it("clearClientSession tolerates unavailable storage", () => {
    expect(() => clearClientSession([null, { get length() { throw new Error("blocked"); } }])).not.toThrow();
  });
});

describe("login page layout", () => {
  it("centres the card in a full-width, full-height container", () => {
    const { container } = render(
      <SessionContext.Provider value={{ status: "unauthenticated", session: null, error: null, reload: vi.fn(), markSignedOut: vi.fn() }}>
        <LoginPage />
      </SessionContext.Provider>,
    );
    const root = container.firstElementChild;
    expect(root.className).toContain("min-h-screen");
    expect(root.className).toContain("w-full");
    expect(root.className).toContain("grid-rows-[1fr_auto_1fr]");
    expect(root.className).toContain("justify-items-center");
    expect(root.className).not.toMatch(/\bpt-10\b/);
    expect(screen.getByRole("main").className).toContain("max-w-[450px]");
  });
});
