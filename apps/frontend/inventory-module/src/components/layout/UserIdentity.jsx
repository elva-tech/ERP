import { UserRound } from "lucide-react";
import { MOCK_INVENTORY_USER } from "../../features/auth/mockUser.js";

function initialsFor(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

const SIZE_CLASSES = {
  default: { avatar: "size-9 text-[12px]", name: "text-[13px] leading-[18px]", role: "text-[10px] leading-[14px]" },
  compact: { avatar: "size-8 text-[11px]", name: "text-[13px] leading-4", role: "text-[10px] leading-[14px]" },
};

function UserIdentity({ size = "default" }) {
  const classes = SIZE_CLASSES[size];
  const user = MOCK_INVENTORY_USER;

  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className={`${classes.avatar} grid shrink-0 place-items-center rounded-full bg-navy font-semibold text-white`}
      >
        {initialsFor(user.displayName)}
      </span>
      <div className="hidden min-w-0 xl:block">
        <p className={`${classes.name} truncate font-semibold text-ink`}>{user.displayName}</p>
        <p className={`${classes.role} truncate text-muted`}>{user.roleLabel}</p>
      </div>
    </div>
  );
}

export default UserIdentity;
