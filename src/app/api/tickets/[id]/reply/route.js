import { NextResponse } from "next/server";

import Ticket from "@/models/Ticket";
import { ROLES } from "@/lib/permissions";
import connectDB from "@/lib/db";
import { authService } from "@/lib/auth/authService";

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    // اعتبارسنجی توکن
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "لطفا وارد شوید" },
        { status: 401 }
      );
    }

    // دریافت متن پاسخ
    const { text } = await request.json();
    if (!text?.trim()) {
      return NextResponse.json(
        { success: false, message: "متن پاسخ الزامی است" },
        { status: 400 }
      );
    }

    // یافتن تیکت
    const ticket = await Ticket.findById(id)
      .populate("createdBy", "role province district examCenter")
      .populate("province", "_id")
      .populate("district", "_id")
      .populate("examCenter", "_id");

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "تیکت مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی دسترسی و تعیین isAdmin
    let isAdmin = false;
    let canReply = false;

    switch (user.role) {
      case ROLES.EXAM_CENTER_MANAGER:
        // مسئول مرکز فقط می‌تواند به تیکت‌های خودش پاسخ دهد
        canReply = ticket.createdBy._id.toString() === user.id.toString();
        isAdmin = false;
        break;

      case ROLES.DISTRICT_TECH_EXPERT:
        // کارشناس منطقه می‌تواند به تیکت‌های مراکز منطقه خود پاسخ دهد
        canReply =
          ticket.district?._id.toString() === user.district?.toString();
        isAdmin = true;
        break;
      case ROLES.DISTRICT_EDUCATION_EXPERT:
        // کارشناس منطقه می‌تواند به تیکت‌های مراکز منطقه خود پاسخ دهد
        canReply =
          ticket.district?._id.toString() === user.district?.toString();
        isAdmin = true;
        break;

      case ROLES.PROVINCE_ADMIN:
        // کارشناس استان می‌تواند به تیکت‌های مراکز و مناطق استان خود پاسخ دهد
        canReply =
          ticket.province?._id.toString() === user.province?.toString();
        isAdmin = true;
        break;

      case ROLES.ADMIN:
      case ROLES.SUPER_ADMIN:
      case ROLES.SYSTEM_ADMIN:
        // مدیران سیستم به همه تیکت‌ها دسترسی دارند
        canReply = true;
        isAdmin = true;
        break;

      default:
        canReply = false;
    }

    if (!canReply) {
      return NextResponse.json(
        { success: false, message: "شما دسترسی به این تیکت ندارید" },
        { status: 403 }
      );
    }

    // اضافه کردن پاسخ
    ticket.responses.push({
      text,
      createdBy: user.id,
      createdAt: new Date(),
      isAdmin,
    });

    // بروزرسانی وضعیت تیکت
    if (isAdmin) {
      // اگر پاسخ از طرف کارشناس باشد
      if (ticket.status === "new" || ticket.status === "inProgress") {
        ticket.status = "resolved";
      }
    } else {
      // اگر پاسخ از طرف مسئول مرکز باشد
      if (ticket.status === "resolved") {
        ticket.status = "inProgress";
      } else {
        ticket.status = "new";
      }
    }

    await ticket.save();

    return NextResponse.json({
      success: true,
      message: "پاسخ با موفقیت ثبت شد",
    });
  } catch (error) {
    console.error("Error in ticket reply:", error);
    return NextResponse.json(
      { success: false, message: "خطا در ثبت پاسخ" },
      { status: 500 }
    );
  }
}
