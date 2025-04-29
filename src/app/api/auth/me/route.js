import { authService } from "@/lib/auth/authService";
import { NextResponse } from "next/server";


export async function GET(request) {
  try {
    const user = await authService.validateToken(request);
    console.log("user from api------>", user);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    // حذف فیلدهای حساس
    const userResponse = {
      _id: user.id,
      fullName: user.fullName,
      nationalId: user.nationalId,
      role: user.role,
      province: user.province ? user.province._id.toString() : null,
      district: user.district ? user.district._id.toString() : null,
      examCenter: user.examCenter ? user.examCenter._id.toString() : null,
      isActive: user.isActive,
    };

    console.log("User response:", userResponse); // اضافه کردن لاگ برای دیباگ

    return NextResponse.json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    console.error("Error in GET /api/auth/me:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در دریافت اطلاعات کاربر. لطفا دوباره تلاش کنید",
      },
      { status: 500 }
    );
  }
}
