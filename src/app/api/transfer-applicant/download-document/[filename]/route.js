import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import path from "path";
import fs from "fs/promises";

// GET /api/transfer-applicant/download-document/[filename] - دانلود مدرک
export async function GET(request, { params }) {
  try {
    const userAuth = await authService.validateToken(request);

    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی دسترسی - کاربران transferApplicant و کارشناسان
    const allowedRoles = [
      "transferApplicant",
      "districtTransferExpert",
      "provinceTransferExpert",
    ];

    if (!allowedRoles.includes(userAuth.role)) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    const { filename } = params;

    if (!filename) {
      return NextResponse.json(
        { success: false, error: "نام فایل مشخص نشده" },
        { status: 400 }
      );
    }

    // مسیر فایل در uploads directory
    const filePath = path.join(process.cwd(), "uploads", filename);

    // بررسی وجود فایل
    try {
      await fs.access(filePath);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "فایل یافت نشد" },
        { status: 404 }
      );
    }

    // خواندن فایل
    const fileBuffer = await fs.readFile(filePath);

    // تشخیص نوع فایل
    const fileExtension = path.extname(filename).toLowerCase();
    let contentType = "application/octet-stream";

    switch (fileExtension) {
      case ".jpg":
      case ".jpeg":
        contentType = "image/jpeg";
        break;
      case ".png":
        contentType = "image/png";
        break;
      case ".gif":
        contentType = "image/gif";
        break;
      case ".pdf":
        contentType = "application/pdf";
        break;
      default:
        contentType = "application/octet-stream";
    }

    // ارسال فایل
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error(
      "Error in GET /api/transfer-applicant/download-document:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "خطا در دانلود فایل",
      },
      { status: 500 }
    );
  }
}
