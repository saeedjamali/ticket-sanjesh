import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ExamCenter from "@/models/ExamCenter";
import { authService } from "@/lib/auth/authService";
import * as XLSX from "xlsx";

export async function POST(req) {
  try {
    const userValid = await authService.validateToken(req);
    if (!userValid) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    await dbConnect();

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { success: false, error: "فایل یافت نشد" },
        { status: 400 }
      );
    }

    // تبدیل فایل به آرایه بایت
    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: "array" });

    // خواندن اولین شیت
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { success: false, error: "داده‌ای در فایل یافت نشد" },
        { status: 400 }
      );
    }

    const errors = [];
    let successCount = 0;

    for (const row of data) {
      const code = row["کد مرکز"] || row["کد"] || row["code"];
      const geographicalLocation =
        row["موقعیت جغرافیایی"] ||
        row["location"] ||
        row["geographicalLocation"];

      if (!code || !geographicalLocation) {
        errors.push({
          code: code || "نامشخص",
          message: "کد یا موقعیت جغرافیایی خالی است",
          row: data.indexOf(row) + 2, // +2 برای در نظر گرفتن هدر و شروع از 1
        });
        continue;
      }

      // اعتبارسنجی موقعیت جغرافیایی
      if (!["شهری", "روستایی", "خارج کشور"].includes(geographicalLocation)) {
        errors.push({
          code,
          message: "موقعیت جغرافیایی نامعتبر است",
          row: data.indexOf(row) + 2,
        });
        continue;
      }

      try {
        const result = await ExamCenter.updateOne(
          { code },
          { $set: { geographicalLocation } }
        );

        if (result.matchedCount === 0) {
          errors.push({
            code,
            message: "مرکزی با این کد یافت نشد",
            row: data.indexOf(row) + 2,
          });
        } else if (result.modifiedCount > 0) {
          successCount++;
        }
      } catch (error) {
        errors.push({
          code,
          message: `خطا در بروزرسانی: ${error.message}`,
          row: data.indexOf(row) + 2,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalProcessed: data.length,
        successCount,
        errorCount: errors.length,
        errors,
      },
    });
  } catch (error) {
    console.error("Error in update locations:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
