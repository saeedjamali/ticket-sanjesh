import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import dbConnect from "@/lib/dbConnect";
import CourseBranchField from "@/models/CourseBranchField";

// POST - آپلود گروهی دوره-شاخه-رشته‌ها
export async function POST(request) {
  try {
    // احراز هویت
    const cookieStore = await cookies();
    const authToken = cookieStore?.get("refresh-token");
    const { user } = await authService.refreshToken(authToken?.value);

    console.log("user---->", user);
    if (!user || user.role !== ROLES.SYSTEM_ADMIN) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const { data, options = {} } = body;

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "داده‌های ورودی نامعتبر" },
        { status: 400 }
      );
    }

    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      errors: [],
      duplicates: 0,
    };

    const { overwriteExisting = false } = options;

    // پردازش داده‌ها
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 1;

      try {
        const {
          courseCode,
          courseTitle,
          branchCode,
          branchTitle,
          fieldCode,
          fieldTitle,
        } = row;

        // اعتبارسنجی فیلدهای الزامی
        if (
          !courseCode ||
          !courseTitle ||
          !branchCode ||
          !branchTitle ||
          !fieldCode ||
          !fieldTitle
        ) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            error: "تمام فیلدها الزامی هستند",
            data: row,
          });
          continue;
        }

        // تمیز کردن داده‌ها
        const cleanData = {
          courseCode: courseCode.toString().trim(),
          courseTitle: courseTitle.toString().trim(),
          branchCode: branchCode.toString().trim(),
          branchTitle: branchTitle.toString().trim(),
          fieldCode: fieldCode.toString().trim(),
          fieldTitle: fieldTitle.toString().trim(),
          createdBy: user.id,
        };

        // بررسی تکراری بودن
        const existingItem = await CourseBranchField.findOne({
          courseCode: cleanData.courseCode,
          branchCode: cleanData.branchCode,
          fieldCode: cleanData.fieldCode,
        });

        if (existingItem) {
          if (overwriteExisting) {
            // به‌روزرسانی آیتم موجود
            await CourseBranchField.findByIdAndUpdate(existingItem._id, {
              ...cleanData,
              updatedBy: user._id,
            });
            results.success++;
          } else {
            results.duplicates++;
            results.errors.push({
              row: rowNumber,
              error: "این ترکیب دوره-شاخه-رشته قبلاً ثبت شده است",
              data: row,
            });
          }
        } else {
          // ایجاد آیتم جدید
          const newItem = new CourseBranchField(cleanData);
          await newItem.save();
          results.success++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          error: error.message || "خطا در پردازش ردیف",
          data: row,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `آپلود گروهی تکمیل شد. ${results.success} مورد موفق، ${results.failed} مورد ناموفق، ${results.duplicates} مورد تکراری`,
      results,
    });
  } catch (error) {
    console.error("خطا در آپلود گروهی:", error);
    return NextResponse.json({ error: "خطا در پردازش فایل" }, { status: 500 });
  }
}
