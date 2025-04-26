const { NextResponse } = require("next/server");
const { authService } = require("@/lib/auth/authService");
const { tokenService } = require("@/lib/auth/tokenService");
const connectDB = require("@/lib/db");

export async function POST(request) {
  try {
    await connectDB();

    // Get login information from request body
    const { nationalId, password } = await request.json();

    // Check required fields
    if (!nationalId || !password) {
      return NextResponse.json(
        { success: false, message: "کد ملی و رمز عبور الزامی است" },
        { status: 400 }
      );
    }

    // Login user
    const { accessToken, refreshToken, user } = await authService.login(
      nationalId,
      password
    );

    // Create response
    const response = NextResponse.json({
      success: true,
      user,
      token: accessToken,
    });

    // Set auth cookies
    tokenService.setCookies(response, { accessToken, refreshToken, user });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "خطا در ورود به سیستم" },
      { status: error.message ? 401 : 500 }
    );
  }
}
