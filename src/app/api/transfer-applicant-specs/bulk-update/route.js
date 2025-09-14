import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import TransferApplicantSpec from "@/models/TransferApplicantSpec";
import dbConnect from "@/lib/dbConnect";
import { ROLES } from "@/lib/permissions";
import * as XLSX from "xlsx";

export async function POST(request) {
  try {
    console.log("Bulk update request received");

    // احراز هویت و بررسی دسترسی
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی نقش کاربر - فقط systemAdmin
    if (user.role !== ROLES.SYSTEM_ADMIN) {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی - فقط مدیر سیستم" },
        { status: 403 }
      );
    }

    await dbConnect();

    // دریافت داده‌ها از فرم
    const formData = await request.formData();
    const file = formData.get("file");
    const field = formData.get("field");

    if (!file) {
      return NextResponse.json(
        { success: false, error: "فایل ارسال نشده است" },
        { status: 400 }
      );
    }

    if (!field) {
      return NextResponse.json(
        { success: false, error: "فیلد انتخاب نشده است" },
        { status: 400 }
      );
    }

    // فیلدهای مجاز برای بروزرسانی
    const allowedFields = [
      "currentRequestStatus",
      "finalTransferDestinationCode",
      "finalResultReason",
      "approvedClauses",
      "approvedScore",
      "effectiveYears",
      "medicalCommissionCode",
      "medicalCommissionVerdict",
      "candidDestination",
      "isActive",
      "fieldCode",
      "employmentField",
      "currentWorkPlaceCode",
      "sourceDistrictCode",
    ];

    if (!allowedFields.includes(field)) {
      return NextResponse.json(
        { success: false, error: "فیلد انتخاب شده مجاز نیست" },
        { status: 400 }
      );
    }

    console.log(`Processing bulk update for field: ${field}`);

    // خواندن فایل اکسل
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length < 2) {
      return NextResponse.json(
        { success: false, error: "فایل باید حداقل یک ردیف داده داشته باشد" },
        { status: 400 }
      );
    }

    // بررسی ساختار فایل
    const headers = jsonData[0];
    if (headers.length !== 3) {
      return NextResponse.json(
        { success: false, error: "فایل باید دقیقاً 3 ستون داشته باشد" },
        { status: 400 }
      );
    }

    // پردازش داده‌ها
    const rows = jsonData.slice(1); // حذف ردیف هدر
    const updates = [];
    const errors = [];

    console.log(`Processing ${rows.length} rows`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const personnelCode = String(row[0] || "").trim();
      const nationalId = String(row[1] || "").trim();
      const value = row[2];

      // بررسی وجود داده‌های ضروری
      if (!personnelCode && !nationalId) {
        errors.push({
          row: i + 2,
          error: "کد پرسنلی یا کد ملی موجود نیست",
        });
        continue;
      }

      if (value === undefined || value === null || value === "") {
        errors.push({
          row: i + 2,
          error: "مقدار جدید خالی است",
        });
        continue;
      }

      updates.push({
        personnelCode,
        nationalId,
        value,
        row: i + 2,
      });
    }

    console.log(`Valid updates: ${updates.length}, Errors: ${errors.length}`);

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "هیچ ردیف معتبری برای بروزرسانی یافت نشد" },
        { status: 400 }
      );
    }

    // انجام بروزرسانی‌ها
    let updatedCount = 0;
    const updateErrors = [];

    for (const update of updates) {
      try {
        // ساخت query براساس کد پرسنلی یا کد ملی
        let query = {};
        if (update.personnelCode) {
          query.personnelCode = update.personnelCode;
        } else if (update.nationalId) {
          query.nationalId = update.nationalId;
        }

        // اعتبارسنجی مقدار براساس نوع فیلد
        let processedValue = update.value;

        if (field === "isActive") {
          // برای فیلد boolean
          if (typeof update.value === "boolean") {
            processedValue = update.value;
          } else {
            const strValue = String(update.value).toLowerCase();
            processedValue =
              strValue === "true" || strValue === "1" || strValue === "فعال";
          }
        } else if (field === "approvedScore" || field === "effectiveYears") {
          // برای فیلدهای عددی
          processedValue = Number(update.value);
          if (isNaN(processedValue)) {
            updateErrors.push({
              row: update.row,
              personnelCode: update.personnelCode,
              nationalId: update.nationalId,
              error: "مقدار باید عدد باشد",
            });
            continue;
          }
        } else {
          // برای فیلدهای متنی
          processedValue = String(update.value).trim();
        }

        // بروزرسانی رکورد
        const updateData = {
          [field]: processedValue,
          updatedBy: user.userId,
          updatedAt: new Date(),
        };

        const result = await TransferApplicantSpec.updateOne(query, {
          $set: updateData,
        });

        if (result.matchedCount === 0) {
          updateErrors.push({
            row: update.row,
            personnelCode: update.personnelCode,
            nationalId: update.nationalId,
            error: "رکورد یافت نشد",
          });
        } else if (result.modifiedCount === 1) {
          updatedCount++;
        }
      } catch (error) {
        console.error(`Error updating row ${update.row}:`, error);
        updateErrors.push({
          row: update.row,
          personnelCode: update.personnelCode,
          nationalId: update.nationalId,
          error: error.message || "خطا در بروزرسانی",
        });
      }
    }

    console.log(`Successfully updated ${updatedCount} records`);

    return NextResponse.json({
      success: true,
      message: "بروزرسانی دسته‌ای با موفقیت انجام شد",
      updatedCount,
      totalProcessed: updates.length,
      errors: [...errors, ...updateErrors],
    });
  } catch (error) {
    console.error("Error in bulk update:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در بروزرسانی دسته‌ای: " + error.message,
      },
      { status: 500 }
    );
  }
}
