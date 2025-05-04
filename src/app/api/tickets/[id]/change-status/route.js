import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect"; // مسیر فایل اتصال به دیتابیس
import Ticket from "@/models/Ticket"; // مسیر مدل تیکت
import { authService } from "@/lib/auth/authService";

// نقش‌های مجاز برای تغییر وضعیت
const ALLOWED_ROLES = ["districtEducationExpert", "districtTechExpert"];
// وضعیت فعلی مجاز
const REQUIRED_CURRENT_STATUS = "inProgress"; // معادل "در حال بررسی"
// وضعیت جدید
const NEW_STATUS = "referred_province"; // معادل "ارجاع به استان"

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json({ message: "ابتدا وارد شوید" }, { status: 401 });
    }
    const id = await params?.id;

    // 2. بررسی نقش کاربر
    if (!ALLOWED_ROLES.includes(user?.role)) {
      return NextResponse.json(
        { message: "شما مجاز به انجام این عملیات نیستید" },
        { status: 403 } // Forbidden
      );
    }

    // 3. یافتن تیکت
    const ticket = await Ticket.findById(id);
    console.log("ticket", ticket);
    if (!ticket) {
      return NextResponse.json({ message: "تیکت یافت نشد" }, { status: 404 });
    }

    // 4. بررسی وضعیت فعلی تیکت
    if (ticket.status !== REQUIRED_CURRENT_STATUS) {
      return NextResponse.json(
        {
          message: `فقط تیکت‌های با وضعیت '${REQUIRED_CURRENT_STATUS}' قابل ارجاع به استان هستند`,
        },
        { status: 400 } // Bad Request
      );
    }

    // 5. به‌روزرسانی وضعیت تیکت
    const updatedTicket = await Ticket.findByIdAndUpdate(
      id,
      { $set: { status: NEW_STATUS } },
      { new: true } // برای برگرداندن داکیومنت آپدیت شده
    );

    if (!updatedTicket) {
      // اگر به هر دلیلی آپدیت ناموفق بود (گرچه findById باید این را هندل کند)
      return NextResponse.json(
        { message: "خطا در به‌روزرسانی تیکت" },
        { status: 500 }
      );
    }

    console.log(
      `Ticket ${id} status changed to ${NEW_STATUS} by user ${user?.id}`
    );

    return NextResponse.json(updatedTicket, { status: 200 });
  } catch (error) {
    console.error("Error changing ticket status:", error);
    return NextResponse.json(
      { message: "خطای سرور در تغییر وضعیت تیکت" },
      { status: 500 }
    );
  }
}
