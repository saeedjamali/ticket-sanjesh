import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import User from "@/models/User";

import { ROLES } from "@/lib/permissions";
import { authService } from "@/lib/auth/authService";

export async function GET(request) {
  try {
    await connectDB();

    // بررسی توکن و دریافت اطلاعات کاربر
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    // فقط ادمین و سوپر ادمین می‌توانند این درخواست را انجام دهند
    if (![ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user.role)) {
      return NextResponse.json(
        {
          success: false,
          error: "شما دسترسی لازم برای انجام این عملیات را ندارید",
        },
        { status: 403 }
      );
    }

    // دریافت شناسه استان از پارامترهای URL
    const { searchParams } = new URL(request.url);
    const provinceId = searchParams.get("province");

    if (!provinceId) {
      return NextResponse.json(
        { success: false, error: "شناسه استان الزامی است" },
        { status: 400 }
      );
    }

    // بررسی وجود مدیر کل برای استان
    const existingSuperAdmin = await User.findOne({
      role: ROLES.SUPER_ADMIN,
      province: provinceId,
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      exists: !!existingSuperAdmin,
    });
  } catch (error) {
    console.error("Error in GET /api/users/check-super-admin:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در بررسی وجود مدیر کل. لطفا دوباره تلاش کنید",
      },
      { status: 500 }
    );
  }
}
