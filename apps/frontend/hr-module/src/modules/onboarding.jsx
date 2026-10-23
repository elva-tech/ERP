import { useEffect, useRef, useState } from "react";
import { Building2, CheckCircle2, MailCheck } from "lucide-react";
import { sendJson } from "../api";
import { ROLE_LABELS, formatDate, inputClass, primaryButton, secondaryButton } from "./helpers";

const cardClass = "space-y-5 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8";

function FormError({ message }) {
  const ref = useRef(null);
  useEffect(() => {
    if (message) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [message]);
  if (!message) return null;
  return (
    <p ref={ref} role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
      {message}
    </p>
  );
}

function Field({ label, hint, ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input {...props} className={`${inputClass} mt-1.5 py-2.5`} />
      {hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

function passwordProblem(password, confirm) {
  if (password.length < 12 || password.length > 72) return "Choose a password of 12-72 characters.";
  if (password !== confirm) return "The passwords do not match.";
  return "";
}

/** Public self-registration. The company stays pending until a platform administrator approves it. */
export function RegisterCompanyForm({ onBack }) {
  const [form, setForm] = useState({ companyName: "", fullName: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    const problem = passwordProblem(form.password, form.confirm);
    if (problem) return setError(problem);
    setError("");
    setBusy(true);
    try {
      await sendJson("POST", "/api/companies/register", {
        companyName: form.companyName.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setDone(true);
    } catch (requestError) {
      setError(requestError.message || "Registration failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className={cardClass}>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600" aria-hidden="true">
          <MailCheck size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Registration submitted</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Your company is awaiting approval by the platform administrator. You can sign in with the account you just
            created once the company has been approved.
          </p>
        </div>
        <button type="button" onClick={onBack} className={`${primaryButton} w-full py-3`}>
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={cardClass}>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Register your company</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          You become the company admin. The company can be used after the platform administrator approves it.
        </p>
      </div>
      <FormError message={error} />
      <Field label="Company name" required minLength={2} maxLength={200} value={form.companyName} onChange={set("companyName")} autoComplete="organization" />
      <Field label="Your full name" required minLength={2} maxLength={200} value={form.fullName} onChange={set("fullName")} autoComplete="name" />
      <Field label="Work email" type="email" required maxLength={255} value={form.email} onChange={set("email")} autoComplete="username" />
      <Field label="Password" type="password" required minLength={12} maxLength={72} value={form.password} onChange={set("password")} autoComplete="new-password" hint="12-72 characters." />
      <Field label="Confirm password" type="password" required minLength={12} maxLength={72} value={form.confirm} onChange={set("confirm")} autoComplete="new-password" />
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <button type="button" onClick={onBack} className={`${secondaryButton} sm:flex-1`}>
          Back to sign in
        </button>
        <button type="submit" disabled={busy} className={`${primaryButton} sm:flex-1`}>
          {busy ? "Submitting..." : "Submit registration"}
        </button>
      </div>
    </form>
  );
}

/**
 * Accepts an invitation link (#invite=TOKEN). New invitees choose their own
 * password; existing accounts confirm with their current password or session.
 * The company and role always come from the invitation on the server.
 */
export function InvitationAccept({ token, user, onAccepted, onDismiss, onSignOut, signOutBusy }) {
  const [invitation, setInvitation] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({ fullName: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    sendJson("POST", "/api/invitations/lookup", { token })
      .then((data) => {
        if (!active) return;
        setInvitation(data.invitation);
        setForm((current) => ({ ...current, fullName: data.invitation.employeeName || "" }));
      })
      .catch((requestError) => {
        if (active) setLoadError(requestError.message || "This invitation could not be checked.");
      });
    return () => {
      active = false;
    };
  }, [token]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const signedInAs = user?.email?.toLowerCase() || "";
  const sameAccount = invitation && signedInAs === invitation.email;

  async function accept(body) {
    setError("");
    setBusy(true);
    try {
      const result = await sendJson("POST", "/api/invitations/accept", { token, ...body });
      onAccepted(result);
    } catch (requestError) {
      setError(requestError.message || "The invitation could not be accepted.");
      setBusy(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    if (sameAccount) return accept({});
    if (invitation.accountExists) return accept({ password: form.password });
    const problem = passwordProblem(form.password, form.confirm);
    if (problem) return setError(problem);
    return accept({ fullName: form.fullName.trim(), password: form.password });
  }

  if (loadError) {
    return (
      <div className={cardClass}>
        <h1 className="text-2xl font-bold text-slate-900">Invitation unavailable</h1>
        <FormError message={loadError} />
        <button type="button" onClick={onDismiss} className={`${primaryButton} w-full py-3`}>
          Continue
        </button>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className={cardClass} role="status">
        <p className="text-sm text-slate-600">Checking your invitation...</p>
      </div>
    );
  }

  const summary = (
    <div className="flex gap-3 rounded-xl border border-line bg-canvas p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600" aria-hidden="true">
        <Building2 size={20} />
      </span>
      <dl className="grid min-w-0 gap-0.5 text-sm">
        <dt className="sr-only">Company</dt>
        <dd className="font-semibold text-slate-900">{invitation.companyName}</dd>
        <dt className="sr-only">Role</dt>
        <dd className="text-slate-600">
          {ROLE_LABELS[invitation.role] || invitation.role}
          {invitation.employeeName ? ` · ${invitation.employeeName}` : ""}
        </dd>
        <dt className="sr-only">Email</dt>
        <dd className="truncate text-slate-500">{invitation.email}</dd>
        <dt className="sr-only">Expires</dt>
        <dd className="text-xs text-slate-500">Link valid until {formatDate(invitation.expiresAt)}</dd>
      </dl>
    </div>
  );

  if (user && !sameAccount) {
    return (
      <div className={cardClass}>
        <h1 className="text-2xl font-bold text-slate-900">Join {invitation.companyName}</h1>
        {summary}
        <p className="text-sm text-slate-600">
          You are signed in as <strong>{user.email}</strong>, but this invitation is for{" "}
          <strong>{invitation.email}</strong>. Sign out to continue with the invited account.
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <button type="button" onClick={onDismiss} className={`${secondaryButton} sm:flex-1`}>
            Not now
          </button>
          <button type="button" disabled={signOutBusy} onClick={onSignOut} className={`${primaryButton} sm:flex-1`}>
            {signOutBusy ? "Please wait..." : "Sign out"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={cardClass}>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Join {invitation.companyName}</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          {sameAccount
            ? "Accept to add this company to your account."
            : invitation.accountExists
              ? "An account already exists for this email. Confirm it with your current password."
              : "Create your account. Only you will know your password."}
        </p>
      </div>
      {summary}
      <FormError message={error} />
      {!sameAccount && invitation.accountExists && (
        <Field label="Current password" type="password" required maxLength={72} value={form.password} onChange={set("password")} autoComplete="current-password" />
      )}
      {!sameAccount && !invitation.accountExists && (
        <>
          <Field label="Full name" required minLength={2} maxLength={200} value={form.fullName} onChange={set("fullName")} autoComplete="name" />
          <Field label="Choose a password" type="password" required minLength={12} maxLength={72} value={form.password} onChange={set("password")} autoComplete="new-password" hint="12-72 characters." />
          <Field label="Confirm password" type="password" required minLength={12} maxLength={72} value={form.confirm} onChange={set("confirm")} autoComplete="new-password" />
        </>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <button type="button" onClick={onDismiss} className={`${secondaryButton} sm:flex-1`}>
          Not now
        </button>
        <button type="submit" disabled={busy} className={`${primaryButton} sm:flex-1`}>
          <CheckCircle2 size={16} aria-hidden="true" />
          {busy ? "Joining..." : sameAccount ? "Accept invitation" : invitation.accountExists ? "Sign in and join" : "Create account and join"}
        </button>
      </div>
    </form>
  );
}
