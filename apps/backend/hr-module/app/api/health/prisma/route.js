import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      success: true,
      message: "Prisma database connection successful",
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Prisma database connection failed",
      },
      { status: 503 },
    );
  }
}
