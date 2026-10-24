import { useState } from "react";
import { AlertCircle, Eye, EyeOff, Info } from "lucide-react";
import elvaLogo from "../assets/Elva.svg";
import { signIn } from "../features/auth/authService.js";
import { useSession } from "../features/auth/sessionContext.js";
import { useFormSubmission } from "../hooks/useFormSubmission.js";
import { isBlank } from "../lib/validation.js";

const LABEL_CLASS = "text-[12px] font-semibold leading-4 text-ink";
const INPUT_CLASS =
  "h-[38px] w-full rounded-md border bg-surface px-3 text-[12px] text-ink outline-none placeholder:text-muted focus:border-login focus:ring-2 focus:ring-login/15";
const ERROR_TEXT_CLASS = "text-[11px] leading-4 text-danger";

const INITIAL_VALUES = { username: "", password: "", rememberMe: false };

function validate(values) {
  const errors = {};
  if (isBlank(values.username)) errors.username = "Enter your Employee ID or email.";
  if (values.password === "") errors.password = "Enter your password.";
  return errors;
}

function signInErrorMessage(error) {
  if (!error) return null;
  if (error.kind === "unauthorized") return "The Employee ID / email or password is incorrect.";
  if (error.kind === "validation" && Object.keys(error.fieldErrors ?? {}).length > 0) return null;
  return error.message;
}

/**
 * Sign-in screen. Credentials go only to the PROPOSED session endpoint (docs/backend-api-contract.md §1),
 * which the ELVA identity team still has to confirm. On success the session is re-read and the router
 * leaves this screen.
 */
function LoginPage() {
  const { reload } = useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState(null);
  const form = useFormSubmission({
    initialValues: INITIAL_VALUES,
    validate,
    submit: (values) => signIn({ username: values.username.trim(), password: values.password, rememberMe: values.rememberMe }),
    onSuccess: () => reload(),
  });
  const formMessage = signInErrorMessage(form.formError);
  const inputBorder = (name) => (form.fieldErrors[name] ? "border-danger" : "border-[#dfe3e8]");

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#f1f2f2] px-4 pt-10 text-ink">
      <main className="w-full max-w-[450px] rounded-lg border border-[#e3e6e8] bg-surface px-10 pb-10 pt-10 shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col items-center text-center">
          <img src={elvaLogo} alt="" className="size-[82px] rounded-md" />
          <h1 className="mt-4 text-[18px] font-bold leading-6 text-ink">ELVA TECH</h1>
          <p className="mt-1 text-[12px] leading-4 text-muted">Procurement &amp; Vendor Management</p>
        </div>

        <form onSubmit={form.handleSubmit} noValidate className="mt-6 space-y-[18px]">
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
              value={form.values.username}
              onChange={form.handleChange}
              aria-invalid={Boolean(form.fieldErrors.username) || undefined}
              aria-describedby={form.fieldErrors.username ? "login-identifier-error" : undefined}
              className={`${INPUT_CLASS} ${inputBorder("username")}`}
            />
            {form.fieldErrors.username && (
              <p id="login-identifier-error" className={ERROR_TEXT_CLASS}>
                {form.fieldErrors.username}
              </p>
            )}
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
                value={form.values.password}
                onChange={form.handleChange}
                aria-invalid={Boolean(form.fieldErrors.password) || undefined}
                aria-describedby={form.fieldErrors.password ? "login-password-error" : undefined}
                className={`${INPUT_CLASS} ${inputBorder("password")} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded text-muted hover:text-ink"
              >
                {showPassword ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
              </button>
            </div>
            {form.fieldErrors.password && (
              <p id="login-password-error" className={ERROR_TEXT_CLASS}>
                {form.fieldErrors.password}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-[12px] text-muted">
              <input
                type="checkbox"
                name="rememberMe"
                checked={form.values.rememberMe}
                onChange={(event) => form.setValue("rememberMe", event.target.checked)}
                className="size-[14px] rounded border-line"
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => setNotice("Password reset is handled by the shared ELVA identity service, which is not connected yet.")}
              className="text-[12px] font-medium text-login hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          {formMessage && (
            <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2 text-[12px] leading-[17px] text-ink">
              <AlertCircle size={15} className="mt-px shrink-0 text-danger" aria-hidden="true" />
              {formMessage}
            </p>
          )}
          {notice && (
            <p role="status" className="flex items-start gap-2 rounded-md bg-info-soft px-3 py-2 text-[12px] leading-[17px] text-ink">
              <Info size={15} className="mt-px shrink-0 text-info" aria-hidden="true" />
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={form.isSubmitting}
            className="h-[41px] w-full rounded-md bg-login text-[13px] font-semibold text-white hover:bg-login-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-login disabled:cursor-wait disabled:opacity-70"
          >
            {form.isSubmitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </main>
      <p className="mt-auto pb-8 pt-10 text-[10px] text-placeholder">Powered by ELVA</p>
    </div>
  );
}

export default LoginPage;
