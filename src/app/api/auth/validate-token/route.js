import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";

export async function GET(request) {
  try {
    const user = await authService.validateToken(request);

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "خطا در اعتبارسنجی توکن" },
      { status: error.message ? 401 : 500 }
    );
  }
}
