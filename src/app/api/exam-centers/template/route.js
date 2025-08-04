import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    // ساخت داده‌های نمونه
    const data = [
      {
        "کد مرکز": "11111",
        "موقعیت جغرافیایی": "شهری",
      },
      {
        "کد مرکز": "11112",
        "موقعیت جغرافیایی": "روستایی",
      },
      {
        "کد مرکز": "11113",
        "موقعیت جغرافیایی": "خارج کشور",
      },
    ];

    // ایجاد workbook جدید
    const wb = XLSX.utils.book_new();

    // تبدیل داده‌ها به worksheet
    const ws = XLSX.utils.json_to_sheet(data);

    // تنظیم عرض ستون‌ها
    const colWidths = [
      { wch: 15 }, // کد مرکز
      { wch: 20 }, // موقعیت جغرافیایی
    ];
    ws["!cols"] = colWidths;

    // اضافه کردن worksheet به workbook
    XLSX.utils.book_append_sheet(wb, ws, "مراکز");

    // تبدیل به buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // ایجاد response با headers مناسب
    const response = new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=template.xlsx",
      },
    });

    return response;
  } catch (error) {
    console.error("Error generating template:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
