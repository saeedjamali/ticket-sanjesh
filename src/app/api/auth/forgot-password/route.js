import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import axios from "axios";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { nationalId } = body;

    // اعتبارسنجی کد ملی
    if (!nationalId) {
      return NextResponse.json(
        { success: false, message: "کد ملی الزامی است" },
        { status: 400 }
      );
    }

    // یافتن کاربر با کد ملی
    const user = await User.findOne({ nationalId });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "کاربری با این کد ملی یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی وجود شماره موبایل تأیید شده
    if (!user.phone || !user.phoneVerified) {
      return NextResponse.json(
        {
          success: false,
          message:
            "شماره موبایل تأیید شده‌ای برای حساب کاربری شما ثبت نشده است",
          notVerified: true,
        },
        { status: 400 }
      );
    }

    // ایجاد رمز عبور جدید تصادفی
    const newPassword = Math.floor(100000 + Math.random() * 900000).toString(); // رمز 6 رقمی

    // هش کردن رمز عبور جدید
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // به‌روزرسانی رمز عبور کاربر
    await User.findByIdAndUpdate(user._id, { password: hashedPassword });

    // تبدیل شماره موبایل به حالت محدود شده (فقط 4 رقم آخر نمایش داده شود)
    const maskedPhone = user.phone.replace(/^(\d{7})(\d{4})$/, "****" + "$2");

    try {
      // ارسال رمز عبور جدید به شماره موبایل کاربر
      await axios.post("https://sms.3300.ir/api/wsSend.ashx", {
        // username: "Esari",
        // پنل امور اداری
        // username: "Esari",
        username: "sanjesh_razavi800",
        password: "@108180&%$@ALi",
        // پنل امور اداری
        // password: "Saeed@435",
        //line: "9830007206",
        line: "983000610320",
        mobile: user.phone,
        message: `سامانه رصد رمز عبور جدید شما: ${newPassword}`,
        type: 0,
        template: 0,
      });
    } catch (smsError) {
      console.error("Error sending SMS:", smsError);
      // در صورت خطا در ارسال پیامک، کاربر را مطلع کنیم اما عملیات را ادامه می‌دهیم
      return NextResponse.json({
        success: true,
        message:
          "رمز عبور با موفقیت تغییر کرد اما در ارسال پیامک مشکلی پیش آمد. لطفاً با پشتیبانی تماس بگیرید.",
        smsError: true,
        maskedPhone,
      });
    }

    return NextResponse.json({
      success: true,
      message: "رمز عبور جدید به شماره موبایل شما ارسال شد",
      maskedPhone,
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    return NextResponse.json(
      {
        success: false,
        message: "خطا در بازیابی رمز عبور",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
