import { apiRequest, sendJson, withQuery } from "../api";

export const membersPath = (companyId) =>
  withQuery("/api/members", { companyId, includeSuspended: 1 });

export const invitationsPath = (companyId) =>
  withQuery("/api/invitations", { companyId });

export const createInvitation = (companyId, body) =>
  sendJson("POST", invitationsPath(companyId), body);

export const revokeInvitation = (invitationId, companyId) =>
  apiRequest(
    withQuery(`/api/invitations/${invitationId}`, { companyId }),
    { method: "DELETE" }
  );

export const updateMember = (userId, companyId, change) =>
  sendJson(
    "PATCH",
    withQuery(`/api/members/${userId}`, { companyId }),
    change
  );