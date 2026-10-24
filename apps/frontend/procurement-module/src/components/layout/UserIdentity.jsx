import { UserRound } from "lucide-react";
import { useSession } from "../../features/auth/sessionContext.js";

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
  const { status, session } = useSession();
  const classes = SIZE_CLASSES[size];
  const user = session?.user;

  let name = "Not signed in";
  let role = status === "loading" ? "Loading session…" : "Session unavailable";
  if (status === "unauthenticated") role = "Session expired";
  if (user) {
    name = user.displayName;
    role = user.roleLabel;
  }

  return (
    <div className="flex items-center gap-2.5">
      {user?.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className={`${classes.avatar} shrink-0 rounded-full object-cover`} />
      ) : (
        <span
          aria-hidden="true"
          className={`${classes.avatar} grid shrink-0 place-items-center rounded-full bg-navy font-semibold text-white`}
        >
          {user ? initialsFor(user.displayName) : <UserRound size={16} />}
        </span>
      )}
      <div className="hidden min-w-0 xl:block">
        <p className={`${classes.name} truncate font-semibold text-ink`}>{name}</p>
        <p className={`${classes.role} truncate text-muted`}>{role}</p>
      </div>
    </div>
  );
}

export default UserIdentity;
