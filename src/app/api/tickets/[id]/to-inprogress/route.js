import { NextResponse } from "next/server";
import Ticket from "@/models/Ticket";
import { ROLES } from "@/lib/permissions";
import { authService } from "@/lib/auth/authService";
import connectDB from "@/lib/db";

export async function PUT(request, { params }) {
  try {
    const id = await params?.id;
    // احراز هویت کاربر
    const userAuth = await authService.validateToken(request);
    if (!userAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("id---->", id);
    // بررسی دسترسی - فقط مدیر سیستم
    if (userAuth.role !== ROLES.SYSTEM_ADMIN) {
      return NextResponse.json(
        {
          error:
            "فقط مدیر سیستم می‌تواند وضعیت تیکت را به در حال بررسی تغییر دهد",
        },
        { status: 403 }
      );
    }

    // اتصال به دیتابیس
    await connectDB();

    // یافتن تیکت
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return NextResponse.json({ error: "تیکت یافت نشد" }, { status: 404 });
    }

    console.log("step 1---->");
    // بررسی وضعیت فعلی تیکت - تیکت‌های بسته شده نمی‌توانند به حالت بررسی تغییر کنند
    if (ticket.status !== "closed" && userAuth.role !== ROLES.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: "تنها امکان تغییر وضعیت به در حال بررسی برای تیکت‌های بسته شده وجود دارد" },
        { status: 400 }
      );
    }
    console.log("step 2---->");
    // تغییر وضعیت تیکت به 'در حال بررسی'
    ticket.status = "inProgress";
    ticket.updatedAt = new Date();
    console.log("step 3---->");
    // ذخیره تیکت
    await ticket.save();

    console.log("step 4---->");

    return NextResponse.json({
      success: true,
      message: "وضعیت تیکت با موفقیت به در حال بررسی تغییر یافت",
      ticket,
    });
    console.log("step 5---->");
  } catch (error) {
    console.error("Error in PUT /api/tickets/[id]/to-inprogress:", error);
    console.log("step 6---->");
    return NextResponse.json(
      { error: "خطای سرور در تغییر وضعیت تیکت" },
      { status: 500 }
    );
  }
}
