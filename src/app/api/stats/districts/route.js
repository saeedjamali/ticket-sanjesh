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
      ROLES.PROVINCE_EVAL_EXPERT,
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
      user.role === ROLES.PROVINCE_EVAL_EXPERT ||
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
        // ساخت کوئری پایه برای تیکت‌ها
        const baseTicketQuery = {
          district: district._id,
        };

        // اعمال فیلترهای نقش‌محور
        let roleBasedFilter = {};

        if (user.role === ROLES.GENERAL_MANAGER) {
          // مدیر کل همه تیکت‌های استان خودش را می‌بیند
          // فیلتر اضافی نیاز نیست
        } else if (user.role === ROLES.PROVINCE_TECH_EXPERT) {
          // کارشناس فناوری استان فقط تیکت‌های فناوری را می‌بیند
          roleBasedFilter = {
            $or: [
              { receiver: ROLES.PROVINCE_TECH_EXPERT },
              { receiver: ROLES.DISTRICT_TECH_EXPERT },
              { receiver: "tech" },
              { type: "TECH" },
            ],
          };
        } else if (user.role === ROLES.PROVINCE_EDUCATION_EXPERT) {
          // کارشناس سنجش استان فقط تیکت‌های سنجش را می‌بیند
          roleBasedFilter = {
            $or: [
              { receiver: ROLES.PROVINCE_EDUCATION_EXPERT },
              { receiver: ROLES.DISTRICT_EDUCATION_EXPERT },
              { receiver: "education" },
              { type: "EDUCATION" },
            ],
          };
        } else if (user.role === ROLES.PROVINCE_EVAL_EXPERT) {
          // کارشناس ارزیابی استان فقط تیکت‌های ارزیابی را می‌بیند
          roleBasedFilter = {
            $or: [
              { receiver: ROLES.PROVINCE_EVAL_EXPERT },
              { receiver: ROLES.DISTRICT_EVAL_EXPERT },
              { receiver: "evaluation" },
              { type: "EVALUATION" },
            ],
          };
        }

        // ترکیب کوئری پایه با فیلتر نقش‌محور
        const ticketQuery = { ...baseTicketQuery, ...roleBasedFilter };

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
          // تیکت‌های کارشناس ارزیابی - جدید
          evalNewTickets,
          // تیکت‌های کارشناس ارزیابی - در حال بررسی
          evalInProgressTickets,
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
            ...baseTicketQuery,
            status: "new",
            $or: [
              { receiver: ROLES.DISTRICT_EDUCATION_EXPERT },
              { receiver: ROLES.PROVINCE_EDUCATION_EXPERT },
              { receiver: "education" },
              { type: "EDUCATION" },
            ],
          }),
          // تیکت‌های در حال بررسی کارشناس سنجش
          Ticket.countDocuments({
            ...baseTicketQuery,
            status: { $in: ["inProgress", "seen"] },
            $or: [
              { receiver: ROLES.DISTRICT_EDUCATION_EXPERT },
              { receiver: ROLES.PROVINCE_EDUCATION_EXPERT },
              { receiver: "education" },
              { type: "EDUCATION" },
            ],
          }),
          // تیکت‌های جدید کارشناس فناوری
          Ticket.countDocuments({
            ...baseTicketQuery,
            status: "new",
            $or: [
              { receiver: ROLES.DISTRICT_TECH_EXPERT },
              { receiver: ROLES.PROVINCE_TECH_EXPERT },
              { receiver: "tech" },
              { type: "TECH" },
            ],
          }),
          // تیکت‌های در حال بررسی کارشناس فناوری
          Ticket.countDocuments({
            ...baseTicketQuery,
            status: { $in: ["inProgress", "seen"] },
            $or: [
              { receiver: ROLES.DISTRICT_TECH_EXPERT },
              { receiver: ROLES.PROVINCE_TECH_EXPERT },
              { receiver: "tech" },
              { type: "TECH" },
            ],
          }),
          // تیکت‌های جدید کارشناس ارزیابی
          Ticket.countDocuments({
            ...baseTicketQuery,
            status: "new",
            $or: [
              { receiver: ROLES.DISTRICT_EVAL_EXPERT },
              { receiver: ROLES.PROVINCE_EVAL_EXPERT },
              { receiver: "evaluation" },
              { type: "EVALUATION" },
            ],
          }),
          // تیکت‌های در حال بررسی کارشناس ارزیابی
          Ticket.countDocuments({
            ...baseTicketQuery,
            status: { $in: ["inProgress", "seen"] },
            $or: [
              { receiver: ROLES.DISTRICT_EVAL_EXPERT },
              { receiver: ROLES.PROVINCE_EVAL_EXPERT },
              { receiver: "evaluation" },
              { type: "EVALUATION" },
            ],
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
          evalNewTicketsCount: evalNewTickets,
          evalInProgressTicketsCount: evalInProgressTickets,
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
