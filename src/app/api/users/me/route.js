import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";

export async function GET(request) {
  try {
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        role: user.role,
        examCenter: user.examCenter,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Error getting user info:", error);
    return NextResponse.json(
      { success: false, message: "خطا در دریافت اطلاعات کاربر" },
      { status: 500 }
    );
  }
}
