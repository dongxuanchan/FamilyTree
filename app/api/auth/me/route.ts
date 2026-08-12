import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, isSuperAdminRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    isAdmin: isAdminRequest(req),
    isSuperAdmin: isSuperAdminRequest(req) 
  });
}