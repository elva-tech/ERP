import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "ELVA TECH HRMS backend is running",
    service: "HR & Payroll ERP API",
  });
}
