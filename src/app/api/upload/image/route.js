import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import { join } from "path";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { v4 as uuidv4 } from "uuid";

export async function POST(request) {
  try {
    // Authenticate user
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "لطفا وارد شوید" },
        { status: 401 }
      );
    }

    // Check permissions - only province roles can upload images
    const allowedRoles = [
      ROLES.GENERAL_MANAGER,
      ROLES.PROVINCE_EDUCATION_EXPERT,
      ROLES.PROVINCE_TECH_EXPERT,
      ROLES.SYSTEM_ADMIN,
    ];

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "شما دسترسی به آپلود تصویر ندارید" },
        { status: 403 }
      );
    }

    // Process multipart form data
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file) {
      return NextResponse.json(
        { success: false, message: "لطفا یک تصویر آپلود کنید" },
        { status: 400 }
      );
    }

    // Check file type
    const fileType = file.type;
    if (!fileType.startsWith("image/")) {
      return NextResponse.json(
        { success: false, message: "فایل آپلود شده باید تصویر باشد" },
        { status: 400 }
      );
    }

    // Check file size (limit to 5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: "حجم تصویر نباید بیشتر از 5 مگابایت باشد" },
        { status: 400 }
      );
    }

    // Convert to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename with original extension
    const originalName = file.name;
    const extension = originalName.split(".").pop() || "jpg";
    const filename = `${uuidv4()}.${extension}`;

    // Ensure upload directory exists
    const uploadDir = join(process.cwd(), "/uploads", "announcements");

    // Create directory if it doesn't exist
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Write the file
    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Return the URL
    const fileUrl = `${filename}`;

    return NextResponse.json({
      success: true,
      message: "تصویر با موفقیت آپلود شد",
      url: fileUrl,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { success: false, message: "خطا در آپلود تصویر", error: error.message },
      { status: 500 }
    );
  }
}
