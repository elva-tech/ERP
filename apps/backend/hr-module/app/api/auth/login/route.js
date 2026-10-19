
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { verifyPassword, createSessionToken, hashSessionToken } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/security";

const SESSION_COOKIE_NAME = "hrms_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
  return NextResponse.json(
    { success: false, message: "Forbidden request origin." },
    { status: 403 }
  );
  }
  try {
    const body = await request.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password =
      typeof body.password === "string" ? body.password : "";

    if (
      !email ||
      email.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !password ||
      password.length > 72
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT
         u.id,
         u.email,
         u.full_name,
         u.platform_role,
         u.password_hash
       FROM users u
       WHERE u.email = $1
         AND u.status = 'active'
         AND (
           u.platform_role = 'platform_admin'
           OR EXISTS (
             SELECT 1
             FROM company_memberships cm
             JOIN companies c ON c.id = cm.company_id
             WHERE cm.user_id = u.id
               AND cm.status = 'active'
               AND c.status = 'active'
           )
         )
       LIMIT 1`,
      [email]
    );

    const user = result.rows[0];

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(
      Date.now() + SESSION_DURATION_SECONDS * 1000
    );

    await pool.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        platformRole: user.platform_role,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (error) {
    console.error("Login failed:", error.message);

    return NextResponse.json(
      { success: false, message: "Unable to process login." },
      { status: 500 }
    );
  }
}
