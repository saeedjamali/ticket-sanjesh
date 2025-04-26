import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";

export async function GET(request) {
  try {
    await connectDB();

    // Check if admin user already exists
    const existingUser = await User.findOne({ nationalId: "1111111111" });
    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: "کاربر ادمین از قبل وجود دارد",
        credentials: {
          nationalId: "1111111111",
          password: "123456",
        },
      });
    }

    // Create admin user
    const user = new User({
      nationalId: "1111111111",
      password: "123456", // Will be hashed by the pre-save hook
      fullName: "مدیر سیستم",
      role: "systemAdmin",
      isActive: true,
      academicYear: "1402-1403",
    });

    await user.save();

    return NextResponse.json({
      success: true,
      message: "کاربر ادمین با موفقیت ایجاد شد",
      credentials: {
        nationalId: "1111111111",
        password: "123456",
      },
    });
  } catch (error) {
    console.error("Error in create-admin:", error);
    return NextResponse.json(
      {
        success: false,
        message: "خطا در ایجاد کاربر ادمین",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
