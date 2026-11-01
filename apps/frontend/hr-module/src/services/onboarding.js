import { sendJson } from "../api";

export const registerCompany = (payload) =>
  sendJson("POST", "/api/companies/register", payload);

export const lookupInvitation = (token) =>
  sendJson("POST", "/api/invitations/lookup", { token });

export const acceptInvitation = (token, body) =>
  sendJson("POST", "/api/invitations/accept", { token, ...body });