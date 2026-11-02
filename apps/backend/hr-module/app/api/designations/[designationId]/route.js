import { itemHandlers } from "@/lib/org-units";

const handlers = itemHandlers("designation");

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
