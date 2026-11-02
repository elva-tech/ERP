import { itemHandlers } from "@/lib/org-units";

const handlers = itemHandlers("department");

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
