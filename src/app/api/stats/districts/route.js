import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import District from "@/models/District";
import Ticket from "@/models/Ticket";
import { ROLES } from "@/lib/permissions";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only general manager and system admin can access this endpoint
    if (
      session.user.role !== ROLES.GENERAL_MANAGER &&
      session.user.role !== ROLES.SYSTEM_ADMIN
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const provinceId = searchParams.get("province");

    await connectDB();

    // Build query to get districts
    const districtQuery = {};
    if (provinceId && provinceId !== "all") {
      districtQuery.province = provinceId;
    }

    // Get all districts
    const districts = await District.find(districtQuery)
      .populate("province", "name")
      .lean();

    // Get ticket stats for each district
    const districtsWithStats = await Promise.all(
      districts.map(async (district) => {
        // Base query for tickets in this district
        const ticketQuery = { district: district._id };

        // Count total tickets
        const totalTicketsCount = await Ticket.countDocuments(ticketQuery);

        // Count open tickets (not resolved)
        const openTicketsCount = await Ticket.countDocuments({
          ...ticketQuery,
          status: { $ne: "resolved" },
        });

        // Count resolved tickets
        const resolvedTicketsCount = await Ticket.countDocuments({
          ...ticketQuery,
          status: "resolved",
        });

        return {
          _id: district._id,
          name: district.name,
          code: district.code,
          province: district.province._id,
          province_name: district.province.name,
          totalTicketsCount,
          openTicketsCount,
          resolvedTicketsCount,
          hasOpenTickets: openTicketsCount > 0,
        };
      })
    );

    return NextResponse.json({ districts: districtsWithStats });
  } catch (error) {
    console.error("Error in GET /api/stats/districts:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
