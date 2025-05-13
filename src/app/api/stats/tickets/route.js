import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import connectDB from "@/lib/db";
import Ticket from "@/models/Ticket";
import { ROLES } from "@/lib/permissions";

export async function GET(request) {
  try {
    // اعتبارسنجی توکن
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "لطفا وارد شوید" },
        { status: 401 }
      );
    }

    await connectDB();

    // ساخت کوئری بر اساس نقش کاربر
    const query = {};

    if (user.role === ROLES.EXAM_CENTER_MANAGER) {
      query.createdBy = user.id;
    } else if (user.role === ROLES.DISTRICT_EDUCATION_EXPERT) {
      query.district = user.district;
      query.$or = [
        { receiver: ROLES.PROVINCE_EDUCATION_EXPERT },
        { receiver: ROLES.DISTRICT_EDUCATION_EXPERT },
      ];
      // query.receiver = ROLES.DISTRICT_EDUCATION_EXPERT;
    } else if (user.role === ROLES.DISTRICT_TECH_EXPERT) {
      query.district = user.district;
      query.$or = [
        { receiver: ROLES.PROVINCE_TECH_EXPERT },
        { receiver: ROLES.DISTRICT_TECH_EXPERT },
      ];
    } else if (user.role === ROLES.PROVINCE_EDUCATION_EXPERT) {
      query.province = user.province;
      query.$or = [
        { receiver: ROLES.PROVINCE_EDUCATION_EXPERT },
        { receiver: ROLES.DISTRICT_EDUCATION_EXPERT },
      ];
    } else if (user.role === ROLES.PROVINCE_TECH_EXPERT) {
      query.province = user.province;
      query.$or = [
        { receiver: ROLES.PROVINCE_TECH_EXPERT },
        { receiver: ROLES.DISTRICT_TECH_EXPERT },
      ];
    }

   

    // دریافت آمار تیکت‌ها
    const [
      totalTickets,
      newTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      referenceTickets,
      highPriorityTickets,
    ] = await Promise.all([
      Ticket.countDocuments(query),
      Ticket.countDocuments({ ...query, status: "new" }),
      Ticket.countDocuments({ ...query, status: "inProgress" }),
      Ticket.countDocuments({ ...query, status: "resolved" }),
      Ticket.countDocuments({ ...query, status: "closed" }),
      Ticket.countDocuments({ ...query, status: "reference-ticket" }),
      Ticket.countDocuments({ ...query, priority: "high" }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalTickets,
        newTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        referenceTickets,
        highPriorityTickets,
      },
    });
  } catch (error) {
    console.error("Error in ticket stats:", error);
    return NextResponse.json(
      { success: false, message: "خطا در دریافت آمار تیکت‌ها" },
      { status: 500 }
    );
  }
}
