export function authorizeCompanyAccess({
  user,
  membership,
  companyId,
  roles = [],
}) {
  if (!user) {
    return { error: { status: 401, message: "Authentication required." } };
  }

  if (!companyId) {
    return { error: { status: 400, message: "A valid companyId is required." } };
  }

  if (
    !membership ||
    membership.status !== "active" ||
    String(membership.user_id) !== String(user.id) ||
    String(membership.company_id) !== String(companyId)
  ) {
    return {
      error: { status: 403, message: "Active company membership required." },
    };
  }

  if (roles.length && !roles.includes(membership.role)) {
    return {
      error: {
        status: 403,
        message: "You do not have permission to perform this action.",
      },
    };
  }

  return { user, membership, companyId: String(companyId) };
}