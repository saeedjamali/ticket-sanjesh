import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import { tokenService } from "@/lib/auth/tokenService";

export async function POST(request) {
  try {
    const refreshToken = request.cookies.get("refresh-token")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: "توکن بازیابی یافت نشد" },
        { status: 401 }
      );
    }

    // Refresh tokens
    const {
      accessToken,
      refreshToken: newRefreshToken,
      user,
    } = await authService.refreshToken(refreshToken);

    // Create response
    const response = NextResponse.json({
      success: true,
      user,
      token: accessToken,
    });

    // Set new auth cookies
    tokenService.setCookies(response, {
      accessToken,
      refreshToken: newRefreshToken,
      user,
    });

    return response;
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "خطا در بازیابی نشست" },
      { status: error.message ? 401 : 500 }
    );
  }
}
