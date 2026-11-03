import { sendJson } from "../api";

export const decideCompanyApproval = (companyId, decision) =>
  sendJson(
    "PATCH",
    `/api/companies/${encodeURIComponent(companyId)}/approval`,
    { decision }
  );