import elvaLogoUrl from "../../assets/Elva.svg";

function BrandMark() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <img
        src={elvaLogoUrl}
        alt="ELVA"
        width={34}
        height={34}
        className="size-[34px] shrink-0 rounded-md object-cover"
      />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-bold leading-[18px] text-white">ELVA TECH</p>
        <p className="truncate text-[11px] leading-[14px] uppercase text-sidebar-text">Inventory &amp; Stock</p>
      </div>
    </div>
  );
}

export default BrandMark;
