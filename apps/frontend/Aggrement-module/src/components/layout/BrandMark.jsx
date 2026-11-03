import { useSession } from "../../features/auth/sessionContext.js";

export function BrandMark() {
  const { session } = useSession();

  const tenant = session?.tenant || {
    name: "SB Patil Group",
    code: "SBP",
    brandColor: "#c41e3a",
    logoType: "sbp",
    subtitle: "Agreement & Document Store",
  };

  const companyName = tenant.name || "ELVA ERP";
  const shortCode = tenant.code || companyName.slice(0, 3).toUpperCase();
  const subtitle = tenant.subtitle || "Agreement & Document Store";

  return (
    <div className="flex flex-col gap-1 py-1">
      <div className="flex items-center gap-2.5">
        {/* Dynamic Logo Block */}
        {tenant.logoType === "sbp" ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[#c41e3a] font-serif font-black text-white shadow-xs">
            <span className="text-[16px] tracking-tight">SBP</span>
          </div>
        ) : tenant.logoType === "elva" ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[#0e9f7e] font-sans font-black text-white shadow-xs">
            <span className="text-[14px] tracking-tight">ELVA</span>
          </div>
        ) : (
          <div
            style={{ backgroundColor: tenant.brandColor || "#1b2a4a" }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded font-sans font-bold text-white shadow-xs"
          >
            <span className="text-[14px] tracking-tight">{shortCode.slice(0, 4)}</span>
          </div>
        )}

        <div className="min-w-0">
          <div className="inline-block rounded bg-[#1b2a4a] px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-white uppercase">
            {companyName}
          </div>
          <p className="mt-0.5 truncate text-[11px] font-bold tracking-wider text-sidebar-text uppercase">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
