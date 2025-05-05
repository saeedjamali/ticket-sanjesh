import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import connectDB from "@/lib/db";
import District from "@/models/District";
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
        ] = await Promise.all([
          Ticket.countDocuments(ticketQuery),
          Ticket.countDocuments({ ...ticketQuery, status: "new" }),
          Ticket.countDocuments({ ...ticketQuery, status: "seen" }),
          Ticket.countDocuments({ ...ticketQuery, status: "resolved" }),
          Ticket.countDocuments({ ...ticketQuery, status: "inProgress" }),
          Ticket.countDocuments({
            ...ticketQuery,
            status: "referred_province",
          }),
          Ticket.countDocuments({ ...ticketQuery, status: "closed" }),
        ]);

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
