import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Ticket from "@/models/Ticket";
import { ROLES } from "@/lib/permissions";
import { authService } from "@/lib/auth/authService";

export async function PUT(request, { params }) {
  try {
    // احراز هویت کاربر
    const userAuth = await authService.validateToken(request);
    if (!userAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // اتصال به دیتابیس
    await connectDB();

    // یافتن تیکت
    const ticket = await Ticket.findById(params.id);
    if (!ticket) {
      return NextResponse.json({ error: "تیکت یافت نشد" }, { status: 404 });
    }

    // بررسی دسترسی کاربر به بستن تیکت
    let hasPermission = false;

    // کارشناس سنجش منطقه می‌تواند تیکت‌های آموزشی منطقه خود را ببندد
    if (userAuth.role === ROLES.DISTRICT_EDUCATION_EXPERT) {
      if (
        ticket.receiver === "education" &&
        userAuth.district === ticket.district.toString()
      ) {
        hasPermission = true;
      }
    }
    // کارشناس فناوری منطقه می‌تواند تیکت‌های فنی منطقه خود را ببندد
    else if (userAuth.role === ROLES.DISTRICT_TECH_EXPERT) {
      if (
        ticket.receiver === "tech" &&
        userAuth.district === ticket.district.toString()
      ) {
        hasPermission = true;
      }
    }
    // کارشناس سنجش استان می‌تواند تیکت‌های آموزشی استان خود را ببندد
    else if (userAuth.role === ROLES.PROVINCE_EDUCATION_EXPERT) {
      if (
        ticket.receiver === "education" &&
        userAuth.province === ticket.province.toString()
      ) {
        hasPermission = true;
      }
    }
    // کارشناس فناوری استان می‌تواند تیکت‌های فنی استان خود را ببندد
    else if (userAuth.role === ROLES.PROVINCE_TECH_EXPERT) {
      if (
        ticket.receiver === "tech" &&
        userAuth.province === ticket.province.toString()
      ) {
        hasPermission = true;
      }
    }
    // مدیر سیستم می‌تواند هر تیکتی را ببندد
    else if (userAuth.role === ROLES.SYSTEM_ADMIN) {
      hasPermission = true;
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: "شما دسترسی لازم برای بستن این تیکت را ندارید" },
        { status: 403 }
      );
    }

    // بررسی وضعیت فعلی تیکت - تیکت‌های بسته شده نمی‌توانند دوباره بسته شوند
    if (ticket.status === "closed") {
      return NextResponse.json(
        { error: "این تیکت قبلاً بسته شده است" },
        { status: 400 }
      );
    }

    // تغییر وضعیت تیکت به 'بسته شده'
    ticket.status = "closed";
    ticket.updatedAt = new Date();
    ticket.closedBy = userAuth.id;
    ticket.closedAt = new Date();

    // ذخیره تیکت
    await ticket.save();

    return NextResponse.json({
      success: true,
      message: "تیکت با موفقیت بسته شد",
      ticket,
    });
  } catch (error) {
    console.error("Error in PUT /api/tickets/[id]/close:", error);
    return NextResponse.json(
      { error: "خطای سرور در بستن تیکت" },
      { status: 500 }
    );
  }
}
