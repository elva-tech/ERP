import { NextResponse } from "next/server";
import { ALLOWED_ORIGINS } from "@/lib/security";

const CORS_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const CORS_HEADERS = "Content-Type,Authorization";

function applyCors(response, origin) {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", CORS_METHODS);
  response.headers.set("Access-Control-Allow-Headers", CORS_HEADERS);
  response.headers.set("Vary", "Origin");
  return response;
}

export function proxy(request) {
  const origin = request.headers.get("origin") || "";
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);

  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    if (isAllowedOrigin) {
      applyCors(response, origin);
      response.headers.set("Access-Control-Max-Age", "86400");
    }
    return response;
  }

  const response = NextResponse.next();
  return isAllowedOrigin ? applyCors(response, origin) : response;
}

export const config = {
  matcher: "/api/:path*",
};
