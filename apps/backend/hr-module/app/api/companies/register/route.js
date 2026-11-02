
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/security";
import { admitRegistration } from "@/lib/registration-throttle";

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, message: "Forbidden request origin." },
      { status: 403 }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const companyName =
    typeof body.companyName === "string"
      ? body.companyName.trim()
      : "";

  const fullName =
    typeof body.fullName === "string"
      ? body.fullName.trim()
      : "";

  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";

  const password =
    typeof body.password === "string"
      ? body.password
      : "";

  if (
    companyName.length < 2 ||
    companyName.length > 200 ||
    fullName.length < 2 ||
    fullName.length > 200 ||
    email.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 12 ||
    password.length > 72
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Enter a valid company name, full name, email, and password (12-72 characters)."
      },
      { status: 400 }
    );
  }

  let wait;
  try {
    wait = await admitRegistration(pool, request, email);
  } catch (error) {
    console.error("Registration rate limit check failed:", error.message);
    return NextResponse.json(
      { success: false, message: "Unable to complete company registration." },
      { status: 500 }
    );
  }
  if (wait > 0) {
    const minutes = Math.ceil(wait / 60);
    return NextResponse.json(
      {
        success: false,
        message: `Too many registration attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      },
      { status: 429, headers: { "Retry-After": String(wait) } }
    );
  }

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [email]
    );

    if (existingUser.rowCount > 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return NextResponse.json(
        {
          success: false,
          message:
            "This email cannot be registered. Please use another email or contact the administrator.",
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const userResult = await client.query(
      `INSERT INTO users (
         email,
         password_hash,
         full_name,
         status
       )
       VALUES ($1, $2, $3, 'active')
       RETURNING id`,
      [email, passwordHash, fullName]
    );

    const userId = userResult.rows[0].id;

    const companyResult = await client.query(
      `INSERT INTO companies (
         company_name,
         status,
         onboarding_source
       )
       VALUES ($1, 'pending', 'self_registration')
       RETURNING id`,
      [companyName]
    );

    const companyId = companyResult.rows[0].id;

    await client.query(
      `INSERT INTO company_memberships (
         company_id,
         user_id,
         role,
         status
       )
       VALUES ($1, $2, 'company_admin', 'pending')`,
      [companyId, userId]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return NextResponse.json(
      {
        success: true,
        message:
          "Registration submitted. Your company is awaiting administrator approval.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Registration rollback failed:",
          rollbackError.message
        );
      }
    }

    if (error.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This email cannot be registered. Please use another email or contact the administrator.",
        },
        { status: 409 }
      );
    }

    console.error("Company registration failed:", error.message);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to complete company registration.",
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
