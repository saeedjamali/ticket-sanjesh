import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Ticket from "@/models/Ticket";
import { ROLES } from "@/lib/permissions";
import User from "@/models/User";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const districtUser = searchParams.get("districtUser");
    const provinceUser = searchParams.get("provinceUser");

    await connectDB();

    const query = {};

    // Apply appropriate filters based on user role and URL parameters
    if (userId) {
      // Stats for a specific user
      query.createdBy = userId;
    } else if (districtUser) {
      // Get user info to filter by district
      const user = await User.findById(districtUser).lean();
      if (user && user.district) {
        query.district = user.district;

        // If the user is a district education expert, only show education tickets
        if (user.role === ROLES.DISTRICT_EDUCATION_EXPERT) {
          query.receiver =ROLES.DISTRICT_EDUCATION_EXPERT;
        }
        // If the user is a district tech expert, only show tech tickets
        else if (user.role === ROLES.DISTRICT_TECH_EXPERT) {
          query.receiver = ROLES.DISTRICT_TECH_EXPERT;
        }
      }
    } else if (provinceUser) {
      // Get user info to filter by province
      const user = await User.findById(provinceUser).lean();
      if (user && user.province) {
        query.province = user.province;
      }
    } else {
      // For system admin or general manager, don't apply additional filters
      // For other users, apply appropriate restrictions
      if (session.user.role === ROLES.EXAM_CENTER_MANAGER) {
        query.createdBy = session.user.id;
      } else if (
        session.user.role === ROLES.DISTRICT_EDUCATION_EXPERT ||
        session.user.role === ROLES.DISTRICT_TECH_EXPERT
      ) {
        query.district = session.user.district;

        if (session.user.role === ROLES.DISTRICT_EDUCATION_EXPERT) {
          query.receiver = ROLES.DISTRICT_EDUCATION_EXPERT;
        } else {
          query.receiver = ROLES.DISTRICT_TECH_EXPERT;
        }
      } else if (
        session.user.role === ROLES.PROVINCE_EDUCATION_EXPERT ||
        session.user.role === ROLES.PROVINCE_TECH_EXPERT
      ) {
        query.province = session.user.province;
      }
    }

    // Calculate stats
    const totalTickets = await Ticket.countDocuments(query);

    // Pending = new, seen, or inProgress
    const pendingTickets = await Ticket.countDocuments({
      ...query,
      status: { $in: ["new", "seen", "inProgress"] },
    });

    // Resolved tickets
    const resolvedTickets = await Ticket.countDocuments({
      ...query,
      status: "resolved",
    });

    // High priority tickets
    const highPriorityTickets = await Ticket.countDocuments({
      ...query,
      priority: "high",
    });

    return NextResponse.json({
      totalTickets,
      pendingTickets,
      resolvedTickets,
      highPriorityTickets,
    });
  } catch (error) {
    console.error("Error in GET /api/stats:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
