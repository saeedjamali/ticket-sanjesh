import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

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

    // بررسی دسترسی - فقط کاربران transferApplicant
    if (user.role !== "transferApplicant") {
      return NextResponse.json(
        { success: false, message: "عدم دسترسی" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image");

    if (!file) {
      return NextResponse.json(
        { success: false, message: "فایل تصویر یافت نشد" },
        { status: 400 }
      );
    }

    // بررسی نوع فایل
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, message: "فقط فایل‌های تصویری مجاز هستند" },
        { status: 400 }
      );
    }

    // بررسی اندازه فایل (حداکثر 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: "حجم فایل نباید بیشتر از 5 مگابایت باشد" },
        { status: 400 }
      );
    }

    // ایجاد نام فایل منحصر به فرد
    const fileExtension = path.extname(file.name);
    const fileName = `profile-correction-${uuidv4()}${fileExtension}`;

    // مسیر ذخیره فایل - مشابه tickets
    const uploadDir = path.join(process.cwd(), "uploads");
    const filePath = path.join(uploadDir, fileName);

    // تبدیل فایل به buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ذخیره فایل
    await writeFile(filePath, buffer);

    // نام فایل برای ذخیره در دیتابیس (مشابه tickets)
    const fileUrl = fileName;

    return NextResponse.json({
      success: true,
      message: "تصویر با موفقیت آپلود شد",
      imageUrl: fileUrl,
      fileName: fileName,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      {
        success: false,
        message: "خطا در آپلود تصویر",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
