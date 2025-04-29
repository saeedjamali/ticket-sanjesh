import { cookies } from "next/headers";

export async function POST() {
  try {
    // حذف کوکی‌های مربوط به احراز هویت
    const cookieStore = cookies();
    cookieStore.delete("access-token");
    cookieStore.delete("refresh-token");

    return Response.json(
      { success: true, message: "با موفقیت خارج شدید" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Logout error:", error);
    return Response.json(
      { success: false, message: "خطا در خروج از سیستم" },
      { status: 500 }
    );
  }
}
