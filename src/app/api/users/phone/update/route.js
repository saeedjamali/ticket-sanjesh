import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import connectDB from "@/lib/db";
import User from "@/models/User";

export async function PUT(request) {
  try {
    // احراز هویت کاربر
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "لطفا وارد شوید" },
        { status: 401 }
      );
    }

    await connectDB();

    // دریافت اطلاعات از درخواست
    const data = await request.json();
    const { phone } = data;

    // اعتبارسنجی شماره موبایل
    if (!phone || !/^09\d{9}$/.test(phone)) {
      return NextResponse.json(
        { success: false, message: "شماره موبایل معتبر نیست" },
        { status: 400 }
      );
    }

    // بررسی اینکه آیا شماره موبایل قبلاً توسط کاربر دیگری استفاده شده است
    const existingUser = await User.findOne({ phone, _id: { $ne: user.id } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "این شماره موبایل قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    // به‌روزرسانی شماره موبایل کاربر
    await User.findByIdAndUpdate(user.id, {
      phone,
      phoneVerified: false, // تا زمانی که تأیید نشده، وضعیت را false قرار می‌دهیم
    });

    return NextResponse.json({
      success: true,
      message: "شماره موبایل با موفقیت ثبت شد. لطفاً آن را تأیید کنید.",
    });
  } catch (error) {
    console.error("Error updating phone number:", error);
    return NextResponse.json(
      {
        success: false,
        message: "خطا در به‌روزرسانی شماره موبایل",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
