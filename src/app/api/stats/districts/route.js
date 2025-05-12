import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import connectDB from "@/lib/db";
import District from "@/models/District";
import Ticket from "@/models/Ticket";
import ExamCenter from "@/models/ExamCenter";
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

    // بررسی دسترسی
    const allowedRoles = [
      ROLES.GENERAL_MANAGER,
      ROLES.SYSTEM_ADMIN,
      ROLES.PROVINCE_TECH_EXPERT,
      ROLES.PROVINCE_EDUCATION_EXPERT,
    ];

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "شما دسترسی به این اطلاعات را ندارید" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const provinceId = searchParams.get("province");

    await connectDB();

    // ساخت کوئری برای دریافت مناطق
    const districtQuery = {};
    if (provinceId && provinceId !== "all") {
      districtQuery.province = provinceId;
    } else if (
      user.role === ROLES.PROVINCE_TECH_EXPERT ||
      user.role === ROLES.PROVINCE_EDUCATION_EXPERT ||
      user.role === ROLES.GENERAL_MANAGER
    ) {
      // اگر کاربر کارشناس استان است، فقط مناطق استان خودش را ببیند
      districtQuery.province = user.province;
    }

    // دریافت مناطق با اطلاعات تکمیلی
    const districts = await District.find(districtQuery)
      .populate("province", "name")
      .lean();

    // دریافت آمار تیکت‌ها برای هر منطقه
    const districtsWithStats = await Promise.all(
      districts.map(async (district) => {
        const ticketQuery = {
          district: district._id,
        };

        const [
          totalTickets,
          newTickets,
          openTickets,
          resolvedTickets,
          inProgressTickets,
          closedTickets,
          referredTickets,
          highPriorityTickets,
          examCentersCount,
          expertsCount,
          // تیکت‌های کارشناس سنجش - جدید
          educationNewTickets,
          // تیکت‌های کارشناس سنجش - در حال بررسی
          educationInProgressTickets,
          // تیکت‌های کارشناس فناوری - جدید
          techNewTickets,
          // تیکت‌های کارشناس فناوری - در حال بررسی
          techInProgressTickets,
        ] = await Promise.all([
          Ticket.countDocuments(ticketQuery),
          Ticket.countDocuments({ ...ticketQuery, status: "new" }),
          Ticket.countDocuments({ ...ticketQuery, status: "seen" }),
          Ticket.countDocuments({ ...ticketQuery, status: "resolved" }),
          Ticket.countDocuments({ ...ticketQuery, status: "inProgress" }),
          Ticket.countDocuments({ ...ticketQuery, status: "closed" }),
          Ticket.countDocuments({
            ...ticketQuery,
            status: "referred_province",
          }),
          Ticket.countDocuments({ ...ticketQuery, priority: "high" }),
          ExamCenter.countDocuments({ district: district._id, isActive: true }),
          2,
          // تیکت‌های جدید کارشناس سنجش
          Ticket.countDocuments({
            ...ticketQuery,
            status: "new",
            receiver: { $in: ["education", "districtEducationExpert"] },
          }),
          // تیکت‌های در حال بررسی کارشناس سنجش
          Ticket.countDocuments({
            ...ticketQuery,
            status: { $in: ["inProgress", "seen"] },
            receiver: { $in: ["education", "districtEducationExpert"] },
          }),
          // تیکت‌های جدید کارشناس فناوری
          Ticket.countDocuments({
            ...ticketQuery,
            status: "new",
            receiver: { $in: ["tech", "districtTechExpert"] },
          }),
          // تیکت‌های در حال بررسی کارشناس فناوری
          Ticket.countDocuments({
            ...ticketQuery,
            status: { $in: ["inProgress", "seen"] },
            receiver: { $in: ["tech", "districtTechExpert"] },
          }),
        ]);

        // آخرین فعالیت روی تیکت‌های این منطقه
        const lastTicket = await Ticket.findOne(ticketQuery)
          .sort({ updatedAt: -1 })
          .select("updatedAt")
          .lean();

        // تاریخ آخرین فعالیت
        const lastActivityTime = lastTicket ? lastTicket.updatedAt : null;

        return {
          ...district,
          _id: district._id.toString(),
          province: district.province._id.toString(),
          province_name: district.province.name,
          totalTicketsCount: totalTickets,
          newTicketsCount: newTickets,
          openTicketsCount: openTickets,
          resolvedTicketsCount: resolvedTickets,
          inProgressTicketsCount: inProgressTickets,
          referredTicketsCount: referredTickets,
          closedTicketsCount: closedTickets,
          hasOpenTickets: openTickets > 0,
          highPriorityTicketsCount: highPriorityTickets,
          examCentersCount: examCentersCount,
          expertsCount: expertsCount,
          // آمار تیکت‌ها به تفکیک نوع کارشناس
          educationNewTicketsCount: educationNewTickets,
          educationInProgressTicketsCount: educationInProgressTickets,
          techNewTicketsCount: techNewTickets,
          techInProgressTicketsCount: techInProgressTickets,
          lastActivityTime: lastActivityTime,
        };
      })
    );

    return NextResponse.json({
      success: true,
      districts: districtsWithStats,
    });
  } catch (error) {
    console.error("Error in districts stats:", error);
    return NextResponse.json(
      { success: false, message: "خطا در دریافت اطلاعات مناطق" },
      { status: 500 }
    );
  }
}
