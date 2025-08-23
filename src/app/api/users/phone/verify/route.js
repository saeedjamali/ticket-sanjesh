import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import User from "@/models/User";
import Otp from "@/models/Otp";
import dbConnect from "@/lib/dbConnect";

export async function POST(request) {
  try {
    // احراز هویت کاربر
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "لطفا وارد شوید" },
        { status: 401 }
      );
    }

    // بررسی دسترسی - کاربران transferApplicant نمی‌توانند شماره موبایل خود را تأیید کنند
    // if (user.role === "transferApplicant") {
    //   return NextResponse.json(
    //     { success: false, message: "کاربران متقاضی انتقال نمی‌توانند شماره موبایل خود را ویرایش کنند" },
    //     { status: 403 }
    //   );
    // }

    await dbConnect();

    // دریافت اطلاعات از درخواست
    const data = await request.json();
    const { code } = data;
    console.log("code----->", code);
    // بررسی وجود کد
    if (!code) {
      return NextResponse.json(
        { success: false, message: "کد تأیید الزامی است" },
        { status: 400 }
      );
    }

    // دریافت اطلاعات کاربر
    const userInfo = await User.findById(user.id);
    console.log("userInfo----->", userInfo);
    if (!userInfo || !userInfo.phone) {
      return NextResponse.json(
        { success: false, message: "شماره موبایلی برای تأیید ثبت نشده است" },
        { status: 400 }
      );
    }

    // بررسی کد OTP
    const otp = await Otp.findOne({ phone: userInfo.phone, code });
    if (!otp) {
      return NextResponse.json(
        { success: false, message: "کد تأیید نامعتبر است" },
        { status: 400 }
      );
    }

    // بررسی مهلت اعتبار کد
    const now = new Date().getTime();
    if (otp.expTime < now) {
      return NextResponse.json(
        { success: false, message: "کد تأیید منقضی شده است" },
        { status: 400 }
      );
    }

    // علامت‌گذاری کد به عنوان استفاده شده
    otp.used = true;
    await otp.save();

    // به‌روزرسانی وضعیت تأیید شماره موبایل کاربر
    await User.findByIdAndUpdate(user.id, { phoneVerified: true });

    return NextResponse.json({
      success: true,
      message: "شماره موبایل با موفقیت تأیید شد",
    });
  } catch (error) {
    console.error("Error verifying phone number:", error);
    return NextResponse.json(
      {
        success: false,
        message: "خطا در تأیید شماره موبایل",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
