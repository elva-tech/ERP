import { useState } from "react";
import { AlertCircle, Eye, EyeOff, Info } from "lucide-react";
import elvaLogo from "../assets/Elva.svg";
import { ROUTES } from "../config/navigation.js";
import { isBlank } from "../lib/validation.js";

const LABEL_CLASS = "text-[12px] font-semibold leading-4 text-ink";
const INPUT_CLASS =
  "h-[38px] w-full rounded-md border bg-surface px-3 text-[12px] text-ink outline-none placeholder:text-muted focus:border-login focus:ring-2 focus:ring-login/15";
const ERROR_TEXT_CLASS = "text-[11px] leading-4 text-danger";

function LoginPage({ onLogin, onShowToast }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState(null);

  function validate() {
    const errors = {};
    if (isBlank(username)) errors.username = "Enter your Employee ID or email.";
    if (password === "") errors.password = "Enter your password.";
    return errors;
  }

  function handleSubmit(event) {
    event.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    window.setTimeout(() => {
      setIsSubmitting(false);
      onShowToast?.("Signed in successfully as Suresh Patil (Inventory Head)", "success");
      onLogin?.();
      window.location.hash = ROUTES.dashboard;
    }, 400);
  }

  const inputBorder = (name) => (fieldErrors[name] ? "border-danger" : "border-[#dfe3e8]");

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#f1f2f2] px-4 pt-10 text-ink">
      <main className="w-full max-w-[450px] rounded-lg border border-[#e3e6e8] bg-surface px-10 pb-10 pt-10 shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col items-center text-center">
          <img src={elvaLogo} alt="" className="size-[82px] rounded-md" />
          <h1 className="mt-4 text-[18px] font-bold leading-6 text-ink">ELVA TECH</h1>
          <p className="mt-1 text-[12px] leading-4 text-muted">Inventory &amp; Stock Management</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-[18px]">
          <div className="flex flex-col gap-2">
            <label htmlFor="login-identifier" className={LABEL_CLASS}>
              Employee ID / Email
            </label>
            <input
              id="login-identifier"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="Enter your official financial login"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              aria-invalid={Boolean(fieldErrors.username) || undefined}
              className={`${INPUT_CLASS} ${inputBorder("username")}`}
            />
            {fieldErrors.username && <p className={ERROR_TEXT_CLASS}>{fieldErrors.username}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="login-password" className={LABEL_CLASS}>
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(fieldErrors.password) || undefined}
                className={`${INPUT_CLASS} ${inputBorder("password")} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded text-muted hover:text-ink"
              >
                {showPassword ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
              </button>
            </div>
            {fieldErrors.password && <p className={ERROR_TEXT_CLASS}>{fieldErrors.password}</p>}
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-[12px] text-muted">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="size-[14px] rounded border-line"
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() =>
                setNotice("Password reset is handled by the shared ELVA identity service, which is not connected yet.")
              }
              className="text-[12px] font-medium text-login hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          {notice && (
            <p
              role="status"
              className="flex items-start gap-2 rounded-md bg-info-soft px-3 py-2 text-[12px] leading-[17px] text-ink"
            >
              <Info size={15} className="mt-px shrink-0 text-info" aria-hidden="true" />
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-[41px] w-full rounded-md bg-login text-[13px] font-semibold text-white hover:bg-login-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-login disabled:cursor-wait disabled:opacity-70"
          >
            {isSubmitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </main>
      <p className="mt-auto pb-8 pt-10 text-[10px] text-placeholder">Powered by ELVA</p>
    </div>
  );
}

export default LoginPage;
