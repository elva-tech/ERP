
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";

export async function GET() {
  await connection();

  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        platformRole: user.platform_role,
      },
    });
  } catch (error) {
    console.error("Session check failed:", error.message);

    return NextResponse.json(
      { success: false, message: "Unable to verify session." },
      { status: 500 }
    );
  }
}
