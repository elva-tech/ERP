import { useEffect, useState } from "react";
import { ArrowLeft, Building2, LogOut, ShieldCheck } from "lucide-react";
import { UNAUTHORIZED_EVENT, apiRequest } from "./api";
import App from "./App";
import { PlatformAdminConsole } from "./modules/platform";
import { InvitationAccept, RegisterCompanyForm } from "./modules/onboarding";
import { inputClass, linkButton, loginButton, secondaryButton } from "./modules/helpers";
import { LogoTile } from "./shell";

/** Invitation links look like https://app/#invite=TOKEN; the fragment never reaches a server. */
function readInviteToken() {
  const match = /^#invite=([A-Za-z0-9_-]{43})$/.exec(window.location.hash);
  return match ? match[1] : "";
}

function clearInviteHash() {
  if (window.location.hash) {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }
}

function AuthLayout({ children }) {
  return (
    <main className="flex min-h-screen bg-workspace">
      <aside className="relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden bg-sidebar p-10 text-surface lg:flex">
        <div className="flex items-center gap-3">
          <LogoTile size={48} />
          <div>
            <p className="text-lg font-bold tracking-wide">ELVA TECH</p>
            <p className="text-xs text-sidebar-text">HR & Payroll Portal</p>
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">People, attendance, leave and payroll in one secure workspace.</h2>
          <p className="mt-4 max-w-md text-sm leading-6 text-sidebar-text">
            Access is limited to the companies and records your role allows.
          </p>
        </div>
        <p className="text-xs text-sidebar-text">© ELVA TECH</p>
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand/20" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-10 top-1/3 h-40 w-40 rounded-full bg-accent/10" aria-hidden="true" />
      </aside>
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoTile size={44} />
            <div>
              <p className="font-bold tracking-wide text-navy">ELVA TECH</p>
              <p className="text-xs text-muted">HR & Payroll Portal</p>
            </div>
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}

function AuthError({ message }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
      {message}
    </p>
  );
}

export default function AuthGate() {
  const [phase, setPhase] = useState("checking");
  const [user, setUser] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [platformView, setPlatformView] = useState(false);
  const [inviteToken, setInviteToken] = useState(readInviteToken);
  const [registerView, setRegisterView] = useState(false);

  useEffect(() => {
    const onHashChange = () => {
      const token = readInviteToken();
      if (token) setInviteToken(token);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function dismissInvitation() {
    clearInviteHash();
    setInviteToken("");
  }

  async function handleInvitationAccepted(result) {
    localStorage.setItem("elvaActiveCompanyId", String(result.companyId));
    dismissInvitation();
    setPlatformView(false);
    setError("");
    try {
      applyProfile(await apiRequest("/api/auth/me"));
    } catch (requestError) {
      setPhase("login");
      setError(requestError.message || "Please sign in to continue.");
    }
  }

  function applyProfile(profile) {
    const available = profile.memberships || [];

    setUser(profile.user);
    setMemberships(available);

    if (available.length === 0) {
      localStorage.removeItem("elvaActiveCompanyId");
      setSelectedCompanyId("");

      if (profile.user?.platformRole === "platform_admin") {
        setError("");
        setPhase("ready");
        return;
      }

      setPhase("login");
      setError(
        "Your account has no active company membership. Ask your company administrator to check your access."
      );
      return;
    }

    const savedId = localStorage.getItem("elvaActiveCompanyId");
    const savedMembership = available.find(
      (item) => String(item.companyId) === savedId
    );

    if (savedMembership) {
      setSelectedCompanyId(String(savedMembership.companyId));
      setPhase("ready");
    } else if (available.length === 1) {
      const id = String(available[0].companyId);
      localStorage.setItem("elvaActiveCompanyId", id);
      setSelectedCompanyId(id);
      setPhase("ready");
    } else {
      setSelectedCompanyId("");
      setPhase("company");
    }
  }

  useEffect(() => {
    let active = true;

    apiRequest("/api/auth/me")
      .then((profile) => {
        if (active) applyProfile(profile);
      })
      .catch((requestError) => {
        if (!active) return;
        setPhase("login");

        if (requestError.status !== 401) {
          setError(requestError.message);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      setUser(null);
      setMemberships([]);
      setPassword("");
      setPhase("login");
      setError("Your session has expired. Please sign in again.");
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const profile = await apiRequest("/api/auth/me");
      applyProfile(profile);
      setPassword("");
      setLoading(false);
    } catch (requestError) {
      setError(
        requestError.status === 401
          ? requestError.message || "Invalid email or password."
          : requestError.message || "Sign in failed. Please try again."
      );
      setLoading(false);
      return;
    }
  }

  function handleSwitchCompany(companyId) {
    const membership = memberships.find(
      (item) => String(item.companyId) === companyId
    );
    if (!membership) return;
    localStorage.setItem("elvaActiveCompanyId", companyId);
    setSelectedCompanyId(companyId);
  }

  function handleCompanyContinue(event) {
    event.preventDefault();
    setError("");

    const membership = memberships.find(
      (item) => String(item.companyId) === selectedCompanyId
    );

    if (!membership) {
      setError("Please select a company you have access to.");
      return;
    }

    localStorage.setItem(
      "elvaActiveCompanyId",
      String(membership.companyId)
    );
    setPhase("ready");
  }

  async function handleLogout() {
    setLoading(true);
    setError("");

    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch{
      setError(
        "Logout could not be confirmed by the server. Please retry before sharing this browser."
      );
      setLoading(false);
      return;
    }

    localStorage.removeItem("elvaActiveCompanyId");
    setUser(null);
    setMemberships([]);
    setSelectedCompanyId("");
    setPlatformView(false);
    setPassword("");
    setPhase("login");
    setLoading(false);
  }

  if (phase === "checking") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-workspace text-ink-soft" role="status">
        <LogoTile size={48} />
        <p className="text-sm">Checking your session...</p>
      </div>
    );
  }

  if (inviteToken) {
    return (
      <AuthLayout>
        <InvitationAccept
          token={inviteToken}
          user={user}
          onAccepted={handleInvitationAccepted}
          onDismiss={dismissInvitation}
          onSignOut={handleLogout}
          signOutBusy={loading}
        />
      </AuthLayout>
    );
  }

  if (phase === "login" && registerView) {
    return (
      <AuthLayout>
        <RegisterCompanyForm onBack={() => setRegisterView(false)} />
      </AuthLayout>
    );
  }

  if (phase === "login") {
    return (
      <AuthLayout>
        <form onSubmit={handleLogin} className="space-y-5 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <div>
            <h1 className="text-2xl font-bold text-ink">Sign in</h1>
            <p className="mt-1.5 text-sm text-muted">Use your registered ELVA TECH HR & Payroll account.</p>
          </div>

          <AuthError message={error} />

          <label className="block text-sm font-medium text-ink-soft">
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={`${inputClass} mt-1.5 py-2.5`}
            />
          </label>

          <label className="block text-sm font-medium text-ink-soft">
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`${inputClass} mt-1.5 py-2.5`}
            />
          </label>

          <button type="submit" disabled={loading} className={`${loginButton} w-full py-3`}>
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="border-t border-line pt-4 text-center text-sm text-muted">
            New to ELVA TECH HR & Payroll?{" "}
            <button
              type="button"
              onClick={() => {
                setError("");
                setRegisterView(true);
              }}
              className={`${linkButton} text-sm text-link`}
            >
              Register your company
            </button>
          </p>
        </form>
      </AuthLayout>
    );
  }

  if (phase === "company") {
    return (
      <AuthLayout>
        <form onSubmit={handleCompanyContinue} className="space-y-5 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <div>
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand" aria-hidden="true">
              <Building2 size={20} />
            </span>
            <h1 className="mt-4 text-2xl font-bold text-ink">Select your company</h1>
            <p className="mt-1.5 text-sm text-muted">
              {user?.fullName ? `${user.fullName}, choose` : "Choose"} the company you want to work in. You can switch later from the top bar.
            </p>
          </div>

          <AuthError message={error} />

          <label className="block text-sm font-medium text-ink-soft">
            Company
            <select
              required
              value={selectedCompanyId}
              onChange={(event) => setSelectedCompanyId(event.target.value)}
              className={`${inputClass} mt-1.5 py-2.5`}
            >
              <option value="">Choose a company</option>
              {memberships.map((membership) => (
                <option key={String(membership.companyId)} value={String(membership.companyId)}>
                  {membership.companyName}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button type="button" disabled={loading} onClick={handleLogout} className={`${secondaryButton} sm:flex-1`}>
              {loading ? "Please wait..." : "Sign out"}
            </button>
            <button type="submit" className={`${loginButton} sm:flex-1`}>
              Continue
            </button>
          </div>
        </form>
      </AuthLayout>
    );
  }

  const activeMembership = memberships.find(
    (item) => String(item.companyId) === selectedCompanyId
  );
  const platformAdmin = user?.platformRole === "platform_admin";
  const showPlatform = platformAdmin && (platformView || !activeMembership);

  if (showPlatform) {
    return (
      <div className="min-h-screen bg-workspace">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 bg-sidebar px-4 py-3 text-surface sm:px-6">
          <div className="flex items-center gap-3">
            <LogoTile size={40} />
            <div>
              <p className="font-bold tracking-wide">ELVA TECH</p>
              <p className="flex items-center gap-1 text-xs text-sidebar-text">
                <ShieldCheck size={12} aria-hidden="true" /> Platform administration · {user?.fullName || user?.email}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {activeMembership && (
              <button
                type="button"
                onClick={() => setPlatformView(false)}
                className="inline-flex items-center gap-2 rounded-lg border border-surface/20 px-3 py-2 text-sm font-medium hover:bg-surface/10"
              >
                <ArrowLeft size={16} aria-hidden="true" /> Back to company
              </button>
            )}
            <button
              type="button"
              disabled={loading}
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-surface/20 px-3 py-2 text-sm font-medium hover:bg-surface/10 disabled:opacity-60"
            >
              <LogOut size={16} aria-hidden="true" /> {loading ? "Please wait..." : "Sign out"}
            </button>
          </div>
        </header>
        {error && (
          <p role="alert" className="border-b border-danger/30 bg-danger-soft px-4 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <PlatformAdminConsole />
      </div>
    );
  }

  return (
    <App
      key={selectedCompanyId}
      companyId={selectedCompanyId}
      role={activeMembership?.role || ""}
      companyName={activeMembership?.companyName || ""}
      ownEmployeeId={activeMembership?.employeeId || null}
      isApprovalDelegate={Boolean(activeMembership?.isApprovalDelegate)}
      session={{
        user,
        memberships,
        onSwitchCompany: handleSwitchCompany,
        onLogout: handleLogout,
        logoutBusy: loading,
        platformAdmin,
        onOpenPlatform: () => setPlatformView(true),
        error,
      }}
    />
  );
}
