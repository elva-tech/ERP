import { FileSearch } from "lucide-react";
import Panel from "../components/ui/Panel.jsx";
import { DEFAULT_ROUTE } from "../config/navigation.js";
import { buildHref } from "../hooks/useHashRoute.js";

function NotFoundPage({ requestedPath }) {
  return (
    <Panel className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <FileSearch size={24} className="text-muted" aria-hidden="true" />
      <h2 className="text-[15px] font-semibold text-ink">Page not found</h2>
      <p className="max-w-md text-[13px] leading-5 text-muted">
        There is no procurement screen at <code className="rounded bg-workspace px-1">{requestedPath}</code>.
      </p>
      <a
        href={buildHref(DEFAULT_ROUTE)}
        className="mt-2 inline-flex h-[31px] items-center rounded-md border border-line bg-surface px-3 text-[13px] font-semibold text-ink hover:bg-workspace"
      >
        Go to Dashboard
      </a>
    </Panel>
  );
}

export default NotFoundPage;
