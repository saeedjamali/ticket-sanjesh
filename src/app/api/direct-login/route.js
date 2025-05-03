import { NextResponse } from "next/server";

import bcrypt from "bcryptjs";

import User from "@/models/User";
import { tokenService } from "@/lib/auth/tokenService";
import { cookies } from "next/headers";
import dbConnect from "@/lib/dbConnect";

export async function POST(request) {
  try {
    await dbConnect();
    console.log("Direct Login API");
    const { nationalId, password } = await request.json();

    // Find user or create test user if not exists

    let user = await User.findOne({ nationalId });

    if (!user) {
      console.log("User not found");
      return NextResponse.json(
        { message: "چنین کاربری یافت نشد" },
        { status: 404 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log("Password is not valid");
      return NextResponse.json(
        { message: "کد ملی یا رمز عبور اشتباه است" },
        { status: 404 }
      );
    }

    // Generate tokens using tokenService object
    const accessToken = await tokenService.generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });
    console.log("Access token generated", accessToken);
    const refreshToken = await tokenService.generateRefreshToken({
      userId: user._id.toString(),
      role: user.role,
    });

    const addRefreshTokenToUser = await User.findByIdAndUpdate(user._id, {
      refreshToken,
    });
    console.log("addRefreshTokenToUser token added to user", addRefreshTokenToUser);
    // Set cookies
    const cookieStore = cookies();
    cookieStore.set("access-token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    cookieStore.set("refresh-token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({
      message: "ورود موفقیت‌آمیز بود",
      data: {
        user: {
          _id: user._id,
          role: user.role,
          name: user.name,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "خطا در ورود به سیستم" },
      { status: 500 }
    );
  }
}
