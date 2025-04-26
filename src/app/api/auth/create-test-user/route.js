import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import User from "@/models/User";

export async function POST(request) {
  try {
    await connectDB();

    // Check if test user already exists
    const existingUser = await User.findOne({ nationalId: "1111111111" });
    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: "کاربر تست از قبل وجود دارد",
        user: {
          nationalId: "1111111111",
          password: "123456",
        },
      });
    }

    // Create test user
    const hashedPassword = await bcrypt.hash("123456", 10);
    const user = await User.create({
      nationalId: "1111111111",
      password: hashedPassword,
      fullName: "کاربر تست",
      role: "systemAdmin",
      isActive: true,
      academicYear: "1402-1403",
    });

    return NextResponse.json({
      success: true,
      message: "کاربر تست با موفقیت ایجاد شد",
      user: {
        nationalId: "1111111111",
        password: "123456",
      },
    });
  } catch (error) {
    console.error("Error creating test user:", error);
    return NextResponse.json(
      { success: false, message: "خطا در ایجاد کاربر تست" },
      { status: 500 }
    );
  }
}
