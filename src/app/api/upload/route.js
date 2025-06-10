import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { authService } from "@/lib/auth/authService";

// مجاز کردن فقط فایل‌های فشرده
const ALLOWED_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/gzip",
  "application/x-tar",
  "application/x-compressed",
  "application/octet-stream", // برای برخی فایل‌های فشرده
];

const ALLOWED_EXTENSIONS = [".zip", ".rar", ".7z", ".tar", ".gz", ".tar.gz"];

// حداکثر سایز فایل: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { success: false, message: "فایلی انتخاب نشده است" },
        { status: 400 }
      );
    }

    // بررسی سایز فایل
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: `حجم فایل نباید بیشتر از ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB باشد`,
        },
        { status: 400 }
      );
    }

    // بررسی نوع فایل
    const fileExtension = path.extname(file.name).toLowerCase();
    const isValidExtension = ALLOWED_EXTENSIONS.includes(fileExtension);
    const isValidMimeType = ALLOWED_TYPES.includes(file.type);

    if (!isValidExtension && !isValidMimeType) {
      return NextResponse.json(
        {
          success: false,
          message: "فقط فایل‌های فشرده مجاز هستند (zip, rar, 7z, tar, gz)",
        },
        { status: 400 }
      );
    }

    // ایجاد نام فایل منحصر به فرد
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileName = `${timestamp}_${randomString}_${file.name}`;

    // مسیر ذخیره فایل
    const uploadDir = path.join(process.cwd(), "uploads", "attachments");
    const filePath = path.join(uploadDir, fileName);

    try {
      // ایجاد پوشه در صورت عدم وجود
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error("Error creating upload directory:", error);
    }

    // تبدیل فایل به buffer و ذخیره
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(filePath, buffer);

    // اطلاعات فایل برای ذخیره در دیتابیس
    const fileInfo = {
      originalName: file.name,
      filename: fileName,
      path: `uploads/attachments/${fileName}`,
      size: file.size,
      mimetype: file.type,
      uploadedBy: user.id,
      uploadedAt: new Date(),
    };

    return NextResponse.json({
      success: true,
      message: "فایل با موفقیت آپلود شد",
      file: fileInfo,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      {
        success: false,
        message: "خطا در آپلود فایل",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
