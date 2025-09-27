import { NextResponse } from "next/server";
// import connectDB from "@/lib/db";
import TransferApplicantSpec from "@/models/TransferApplicantSpec";
import User from "@/models/User";
import { authService } from "@/lib/auth/authService";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/dbConnect";

// POST /api/transfer-applicant-specs/excel-upload
export async function POST(req) {
  try {
    const userAuth = await authService.validateToken(req);

    console.log("User Auth structure:", userAuth);

    if (!userAuth || !userAuth.role) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی نقش کاربر (فقط systemAdmin)
    if (userAuth.role !== "systemAdmin") {
      return NextResponse.json(
        { error: "عدم دسترسی. فقط مدیر سیستم مجاز به این عملیات است." },
        { status: 403 }
      );
    }

    // گرفتن فایل از FormData
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "فایل اکسل انتخاب نشده است." },
        { status: 400 }
      );
    }

    // بررسی نوع فایل
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "فرمت فایل باید Excel (.xlsx یا .xls) باشد." },
        { status: 400 }
      );
    }

    // خواندن فایل اکسل
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let workbook;
    try {
      workbook = XLSX.read(buffer, { type: "buffer" });
    } catch (error) {
      return NextResponse.json(
        { error: "خطا در خواندن فایل اکسل. فایل معتبر نیست." },
        { status: 400 }
      );
    }

    // گرفتن اولین شیت
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // تبدیل به JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "فایل اکسل خالی است یا داده‌ای ندارد." },
        { status: 400 }
      );
    }

    // اتصال به دیتابیس
    await dbConnect();

    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const results = [];

    // پردازش هر ردیف
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // ردیف 1 عنوان است

      try {
        // استخراج اطلاعات از ردیف
        const personnelCode = row["کد پرسنلی"]?.toString().trim();
        const nationalId = row["کد ملی"]?.toString().trim();
        const finalResultStatus = row["وضعیت نتیجه نهایی"]?.toString().trim();
        const finalTransferDestinationCode = row["کد منطقه مقصد"]
          ?.toString()
          .trim();
        const finalResultReason = row["علت موافقت یا مخالفت"]
          ?.toString()
          .trim();
        const approvedClauses = row["بندهای موافقت شده"]?.toString().trim();
        const currentRequestStatus = row["وضعیت درخواست فعلی"]
          ?.toString()
          .trim();

        // اعتبارسنجی فیلدهای الزامی
        if (!personnelCode && !nationalId) {
          errors.push(`ردیف ${rowNumber}: کد پرسنلی یا کد ملی الزامی است`);
          errorCount++;
          continue;
        }

        // ایجاد شرط جستجو
        const searchQuery = {};
        if (personnelCode) {
          searchQuery.personnelCode = personnelCode;
        } else if (nationalId) {
          searchQuery.nationalId = nationalId;
        }

        // جستجوی رکورد موجود
        const existingRecord = await TransferApplicantSpec.findOne(searchQuery);

        if (!existingRecord) {
          errors.push(
            `ردیف ${rowNumber}: پرسنل با کد ${
              personnelCode || nationalId
            } یافت نشد`
          );
          errorCount++;
          continue;
        }

        // آماده‌سازی داده‌های بروزرسانی
        const updateData = {};

        // اعتبارسنجی وضعیت نتیجه نهایی
        if (finalResultStatus) {
          const validFinalStatuses = [
            "conditions_not_met",
            "source_disagreement",
            "temporary_transfer_approved",
            "permanent_transfer_approved",
            "under_review",
          ];

          if (validFinalStatuses.includes(finalResultStatus)) {
            updateData.finalResultStatus = finalResultStatus;
          } else {
            errors.push(
              `ردیف ${rowNumber}: وضعیت نتیجه نهایی "${finalResultStatus}" نامعتبر است. مقادیر مجاز: ${validFinalStatuses.join(
                ", "
              )}`
            );
            errorCount++;
            continue;
          }
        }

        // اعتبارسنجی کد منطقه مقصد
        if (finalTransferDestinationCode) {
          if (!/^\d{4}$/.test(finalTransferDestinationCode)) {
            errors.push(`ردیف ${rowNumber}: کد منطقه مقصد باید 4 رقم باشد`);
            errorCount++;
            continue;
          }
          updateData.finalTransferDestinationCode =
            finalTransferDestinationCode;
        }

        // علت موافقت یا مخالفت
        if (finalResultReason) {
          if (finalResultReason.length > 1000) {
            errors.push(
              `ردیف ${rowNumber}: علت موافقت یا مخالفت نباید بیش از 1000 کاراکتر باشد`
            );
            errorCount++;
            continue;
          }
          updateData.finalResultReason = finalResultReason;
        }

        // بندهای موافقت شده
        if (approvedClauses) {
          // اعتبارسنجی فرمت: باید اعداد جدا شده با + باشد
          if (!/^(\d+)(\+\d+)*$/.test(approvedClauses)) {
            errors.push(
              `ردیف ${rowNumber}: بندهای موافقت شده باید به فرمت '1+2+9+11' باشد`
            );
            errorCount++;
            continue;
          }
          updateData.approvedClauses = approvedClauses;
        }

        // اعتبارسنجی وضعیت درخواست فعلی
        if (currentRequestStatus) {
          const validCurrentStatuses = [
            "user_no_action",
            "awaiting_user_approval",
            "user_approval",
            "source_review",
            "exception_eligibility_approval",
            "exception_eligibility_rejection",
            "source_approval",
            "source_rejection",
            "province_review",
            "province_approval",
            "province_rejection",
            "destination_review",
            "destination_approval",
            "destination_rejection",
            "temporary_transfer_approved",
            "permanent_transfer_approved",
            "invalid_request",
            "destination_correction_approved",
            "processing_stage_results",
          ];

          if (validCurrentStatuses.includes(currentRequestStatus)) {
            updateData.currentRequestStatus = currentRequestStatus;
          } else {
            errors.push(
              `ردیف ${rowNumber}: وضعیت درخواست فعلی "${currentRequestStatus}" نامعتبر است. مقادیر مجاز: ${validCurrentStatuses.join(
                ", "
              )}`
            );
            errorCount++;
            continue;
          }
        }

        // بروزرسانی رکورد
        if (Object.keys(updateData).length > 0) {
          updateData.updatedAt = new Date();

          console.log(`Processing row ${rowNumber}:`, {
            searchQuery,
            updateData,
            existingRecord: existingRecord.id,
          });

          // اضافه کردن لاگ برای statusLog
          const statusLogEntry = {
            fromStatus: updateData.currentRequestStatus
              ? existingRecord.currentRequestStatus
              : null,
            toStatus:
              updateData.currentRequestStatus ||
              existingRecord.currentRequestStatus,
            actionType: updateData.currentRequestStatus
              ? "status_change"
              : "updated",
            performedBy: userAuth.id,
            performedAt: new Date(),
            comment: `Excel bulk update - Row ${rowNumber}. Updated fields: ${Object.keys(
              updateData
            ).join(", ")}`,
          };

          // اضافه کردن لاگ به statusLog
          if (!updateData.$push) {
            updateData.$push = {};
          }
          updateData.$push.statusLog = statusLogEntry;

          // اضافه کردن workflow entry اگر وضعیت تغییر کرده
          if (
            updateData.currentRequestStatus &&
            updateData.currentRequestStatus !==
              existingRecord.currentRequestStatus
          ) {
            const workflowEntry = {
              status: updateData.currentRequestStatus,
              changedBy: userAuth.id,
              changedAt: new Date(),
              previousStatus: existingRecord.currentRequestStatus,
              reason: `Excel bulk status update - Row ${rowNumber}`,
            };

            updateData.$push.requestStatusWorkflow = workflowEntry;
          }

          const updatedRecord = await TransferApplicantSpec.findOneAndUpdate(
            searchQuery,
            updateData,
            { new: true, runValidators: true }
          );

          if (updatedRecord) {
            console.log(`Successfully updated record for row ${rowNumber}`);
            results.push({
              personnelCode: updatedRecord.personnelCode,
              nationalId: updatedRecord.nationalId,
              firstName: updatedRecord.firstName,
              lastName: updatedRecord.lastName,
              updatedFields: Object.keys(updateData).filter(
                (key) => !key.startsWith("$")
              ),
              action: "updated", // نشان‌دهنده update بودن
              statusChanged:
                updateData.currentRequestStatus &&
                updateData.currentRequestStatus !==
                  existingRecord.currentRequestStatus,
              logAdded: true,
            });
            successCount++;
          }
        } else {
          errors.push(
            `ردیف ${rowNumber}: هیچ داده معتبری برای بروزرسانی یافت نشد`
          );
          errorCount++;
        }
      } catch (error) {
        console.error(`خطا در پردازش ردیف ${rowNumber}:`, error);
        errors.push(`ردیف ${rowNumber}: خطا در پردازش - ${error.message}`);
        errorCount++;
      }
    }

    // محاسبه آمار لاگ‌ها
    const statusChangedCount = results.filter((r) => r.statusChanged).length;
    const logsAddedCount = results.filter((r) => r.logAdded).length;

    return NextResponse.json({
      success: true,
      message: `پردازش کامل شد. ${successCount} رکورد بروزرسانی شد، ${errorCount} خطا`,
      summary: {
        totalRows: data.length,
        successCount,
        errorCount,
        statusChangedCount,
        logsAddedCount,
      },
      results,
      errors: errors.slice(0, 100), // حداکثر 100 خطای اول
    });
  } catch (error) {
    console.error("خطا در بارگذاری فایل اکسل:", error);
    return NextResponse.json(
      {
        error: "خطا در پردازش فایل اکسل",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// GET /api/transfer-applicant-specs/excel-upload - دانلود قالب اکسل
export async function GET(req) {
  try {
    console.log("Excel download - Starting validation...");

    // اعتبارسنجی توکن
    const userAuth = await authService.validateToken(req);

    console.log("Excel download - userAuth:", userAuth);

    if (!userAuth || !userAuth.role) {
      console.log("Excel download - Auth failed");
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // بررسی نقش کاربر (فقط systemAdmin)
    if (userAuth.role !== "systemAdmin") {
      return NextResponse.json(
        { error: "عدم دسترسی. فقط مدیر سیستم مجاز به این عملیات است." },
        { status: 403 }
      );
    }

    console.log("Excel download - Creating template...");

    // ایجاد قالب اکسل
    const templateData = [
      {
        "کد پرسنلی": "12345678",
        "کد ملی": "1234567890",
        "وضعیت نتیجه نهایی": "permanent_transfer_approved",
        "کد منطقه مقصد": "1234",
        "علت موافقت یا مخالفت": "نمونه علت...",
        "بندهای موافقت شده": "1+2+9+11",
        "وضعیت درخواست فعلی": "province_approval",
      },
    ];

    // ایجاد workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    console.log("Excel download - Worksheet created");

    // تنظیم عرض ستون‌ها
    const columnWidths = [
      { wch: 15 }, // کد پرسنلی
      { wch: 15 }, // کد ملی
      { wch: 25 }, // وضعیت نتیجه نهایی
      { wch: 15 }, // کد منطقه مقصد
      { wch: 40 }, // علت موافقت یا مخالفت
      { wch: 20 }, // بندهای موافقت شده
      { wch: 20 }, // وضعیت درخواست فعلی
    ];
    worksheet["!cols"] = columnWidths;

    // اضافه کردن شیت اصلی به workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "قالب اعلام نتایج");

    // ایجاد شیت راهنما
    const guideData = [
      {
        "نوع فیلد": "وضعیت نتیجه نهایی",
        "کد برای اکسل": "permanent_transfer_approved",
        "توضیحات فارسی": "با انتقال متقاضی بصورت دائم موافقت شد",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "temporary_transfer_approved",
        "توضیحات فارسی": "با انتقال متقاضی بصورت موقت یکساله موافقت شد",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "conditions_not_met",
        "توضیحات فارسی":
          "شرایط مصوب دستورالعمل تجدیدنظر، توسط اداره مبدأ احراز نشده",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "source_disagreement",
        "توضیحات فارسی":
          "به دلیل کمبود نیروی انسانی، انتقال متقاضی مورد موافقت اداره مبدأ قرار نگرفت",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "under_review",
        "توضیحات فارسی": "پرونده متقاضی درحال بررسی است",
      },
      { "نوع فیلد": "", "کد برای اکسل": "", "توضیحات فارسی": "" },
      {
        "نوع فیلد": "وضعیت درخواست فعلی",
        "کد برای اکسل": "user_no_action",
        "توضیحات فارسی": "عدم اقدام کاربر",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "awaiting_user_approval",
        "توضیحات فارسی": "در انتظار تایید کاربر",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "user_approval",
        "توضیحات فارسی": "تایید کاربر",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "source_review",
        "توضیحات فارسی": "بررسی مبدا",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "exception_eligibility_approval",
        "توضیحات فارسی": "تایید واجد شرایط استثنا",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "exception_eligibility_rejection",
        "توضیحات فارسی": "عدم تایید واجد شرایط استثنا",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "source_approval",
        "توضیحات فارسی": "تایید مبدا",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "source_rejection",
        "توضیحات فارسی": "مخالفت مبدا بدلیل کمبود نیرو",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "province_review",
        "توضیحات فارسی": "بررسی استان",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "province_approval",
        "توضیحات فارسی": "تایید استان",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "province_rejection",
        "توضیحات فارسی": "عدم تایید استان",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "destination_review",
        "توضیحات فارسی": "بررسی مقصد",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "destination_approval",
        "توضیحات فارسی": "تایید مقصد",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "destination_rejection",
        "توضیحات فارسی": "عدم تایید مقصد",
      },
      { "نوع فیلد": "", "کد برای اکسل": "", "توضیحات فارسی": "" },
      {
        "نوع فیلد": "نکات مهم",
        "کد برای اکسل": "• کد پرسنلی یا کد ملی الزامی است",
        "توضیحات فارسی": "",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "• کد منطقه مقصد باید دقیقاً 4 رقم باشد",
        "توضیحات فارسی": "",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "• علت موافقت یا مخالفت حداکثر 1000 کاراکتر",
        "توضیحات فارسی": "",
      },
      { "نوع فیلد": "", "کد برای اکسل": "", "توضیحات فارسی": "" },
      {
        "نوع فیلد": "بندهای موافقت شده",
        "کد برای اکسل": "1+2+9+11",
        "توضیحات فارسی": "کدهای بند جدا شده با علامت + (مثال: 1+2+9+11)",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "• کدها باید با + از هم جدا شوند",
        "توضیحات فارسی": "",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "• کدها به جدول TransferReason اشاره می‌کنند",
        "توضیحات فارسی": "",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "• فقط از کدهای انگلیسی استفاده کنید",
        "توضیحات فارسی": "",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "• تمام تغییرات در statusLog ثبت می‌شود",
        "توضیحات فارسی": "",
      },
      {
        "نوع فیلد": "",
        "کد برای اکسل": "• تغییر وضعیت در requestStatusWorkflow لاگ می‌شود",
        "توضیحات فارسی": "",
      },
    ];

    const guideWorksheet = XLSX.utils.json_to_sheet(guideData);

    // تنظیم عرض ستون‌های شیت راهنما
    const guideColumnWidths = [
      { wch: 25 }, // نوع فیلد
      { wch: 40 }, // کد برای اکسل
      { wch: 60 }, // توضیحات فارسی
    ];
    guideWorksheet["!cols"] = guideColumnWidths;

    // اضافه کردن شیت راهنما به workbook
    XLSX.utils.book_append_sheet(
      workbook,
      guideWorksheet,
      "راهنمای مقادیر مجاز"
    );

    console.log("Excel download - Sheet added to workbook");

    // تبدیل به buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    console.log("Excel download - Buffer created, size:", buffer.length);

    // ایجاد response با فایل اکسل
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          "attachment; filename=transfer-results-template.xlsx",
      },
    });
  } catch (error) {
    console.error("خطا در ایجاد قالب اکسل:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      {
        error: "خطا در ایجاد قالب اکسل",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
