import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";

// GET - دانلود فایل نمونه برای آپلود گروهی
export async function GET(request) {
  try {
    // احراز هویت
    const cookieStore = await cookies();
    const authToken = cookieStore?.get("refresh-token");
    const { user } = await authService.refreshToken(authToken?.value);

    if (!user || user.role !== ROLES.SYSTEM_ADMIN) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    // ایجاد محتوای CSV
    const headers = [
      "courseCode",
      "courseTitle",
      "branchCode",
      "branchTitle",
      "fieldCode",
      "fieldTitle",
    ];

    const sampleData = [
      ["01", "متوسطه اول", "01", "علوم تجربی", "01", "زیست شناسی"],
      ["01", "متوسطه اول", "01", "علوم تجربی", "02", "شیمی"],
      ["01", "متوسطه اول", "02", "ریاضی", "01", "ریاضی کاربردی"],
      ["02", "متوسطه دوم", "01", "علوم تجربی", "01", "علوم پایه"],
      ["02", "متوسطه دوم", "02", "ریاضی فیزیک", "01", "ریاضی"],
    ];

    // تبدیل به CSV
    const csvContent = [
      headers.join(","),
      ...sampleData.map((row) => row.join(",")),
    ].join("\n");

    // اضافه کردن BOM برای پشتیبانی از UTF-8 در Excel
    const bom = "\uFEFF";
    const csvWithBom = bom + csvContent;

    // ایجاد Response با محتوای CSV
    const response = new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          "attachment; filename=course-branch-field-template.csv",
      },
    });

    return response;
  } catch (error) {
    console.error("خطا در تولید فایل نمونه:", error);
    return NextResponse.json(
      { error: "خطا در تولید فایل نمونه" },
      { status: 500 }
    );
  }
}
