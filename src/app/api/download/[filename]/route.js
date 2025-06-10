import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { authService } from "@/lib/auth/authService";

export async function GET(request, { params }) {
  try {
    // احراز هویت کاربر
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "لطفا وارد شوید" },
        { status: 401 }
      );
    }

    const { filename } = params;

    if (!filename) {
      return NextResponse.json(
        { success: false, message: "نام فایل مشخص نشده است" },
        { status: 400 }
      );
    }

    // مسیر فایل
    const filePath = path.join(
      process.cwd(),
      "uploads",
      "attachments",
      filename
    );

    try {
      // خواندن فایل
      const fileBuffer = await readFile(filePath);

      // تشخیص نوع فایل بر اساس پسوند
      const ext = path.extname(filename).toLowerCase();
      let contentType = "application/octet-stream";

      switch (ext) {
        case ".zip":
          contentType = "application/zip";
          break;
        case ".rar":
          contentType = "application/x-rar-compressed";
          break;
        case ".7z":
          contentType = "application/x-7z-compressed";
          break;
        case ".tar":
          contentType = "application/x-tar";
          break;
        case ".gz":
          contentType = "application/gzip";
          break;
        default:
          contentType = "application/octet-stream";
      }

      // استخراج نام اصلی فایل (حذف timestamp و random string)
      const originalName = filename.split("_").slice(2).join("_");

      // ارسال فایل
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${originalName}"`,
          "Content-Length": fileBuffer.length.toString(),
        },
      });
    } catch (fileError) {
      console.error("File read error:", fileError);
      return NextResponse.json(
        { success: false, message: "فایل یافت نشد" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "خطا در دانلود فایل",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
