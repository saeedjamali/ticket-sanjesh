import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";

export async function GET(request) {
  try {
    await connectDB();

    const user = await User.findOne({ nationalId: "1111111111" }).select(
      "+password"
    );

    if (!user) {
      return NextResponse.json({
        success: false,
        message: "کاربر ادمین در دیتابیس وجود ندارد",
      });
    }

    // Test password comparison
    const isPasswordValid = await user.comparePassword("123456");

    return NextResponse.json({
      success: true,
      message: "اطلاعات کاربر ادمین",
      user: {
        nationalId: user.nationalId,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        hashedPassword: user.password,
        isPasswordValid,
      },
    });
  } catch (error) {
    console.error("Error in check-admin:", error);
    return NextResponse.json(
      {
        success: false,
        message: "خطا در بررسی کاربر ادمین",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
