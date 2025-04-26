import { NextResponse } from "next/server";
import { tokenService } from "@/lib/auth/tokenService";

export async function POST() {
  try {
    // ایجاد پاسخ با پیام موفقیت
    const response = NextResponse.json({
      success: true,
      message: "خروج موفقیت‌آمیز",
    });

    // حذف کوکی توکن
    tokenService.clearCookies(response);

    return response;
  } catch (error) {
    console.error("خطا در خروج از سیستم:", error);
    return NextResponse.json(
      { success: false, message: "خطا در خروج از سیستم" },
      { status: 500 }
    );
  }
}
