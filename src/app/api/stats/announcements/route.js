import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import connectDB from "@/lib/db";
import Announcement from "@/models/Announcement";
import { ROLES } from "@/lib/permissions";

export async function GET(request) {
  try {
    // Authenticate user
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "لطفا وارد شوید" },
        { status: 401 }
      );
    }

    await connectDB();

    // Only district experts and exam center managers need to track unread announcements
    if (
      ![
        "districtEducationExpert",
        "districtTechExpert",
        "examCenterManager",
      ].includes(user.role)
    ) {
      return NextResponse.json({
        success: true,
        stats: {
          total: 0,
          unread: 0,
          highPriority: 0,
        },
      });
    }

    // Build query based on user role to find announcements targeted at this user
    const query = {
      status: "active",
      targetRoles: user.role,
    };

    // Add district filter if user has a district
    if (user.district) {
      query.$or = [
        { targetDistricts: { $size: 0 } }, // Target all districts
        { targetDistricts: user.district }, // Target specific district
      ];
    }

    // Count total active announcements for this user
    const totalCount = await Announcement.countDocuments(query);

    // Count unread announcements
    const unreadCount = await Announcement.countDocuments({
      ...query,
      viewedBy: { $not: { $elemMatch: { user: user.id } } },
    });

    // Count high priority unread announcements
    const highPriorityCount = await Announcement.countDocuments({
      ...query,
      priority: "high",
      viewedBy: { $not: { $elemMatch: { user: user.id } } },
    });

    // Count by priority
    const highPriorityTotal = await Announcement.countDocuments({
      ...query,
      priority: "high",
    });

    const mediumPriorityTotal = await Announcement.countDocuments({
      ...query,
      priority: "medium",
    });

    const lowPriorityTotal = await Announcement.countDocuments({
      ...query,
      priority: "low",
    });

    return NextResponse.json({
      success: true,
      stats: {
        total: totalCount,
        unread: unreadCount,
        highPriority: highPriorityCount,
        byPriority: {
          high: highPriorityTotal,
          medium: mediumPriorityTotal,
          low: lowPriorityTotal,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching announcement stats:", error);
    return NextResponse.json(
      {
        success: false,
        message: "خطا در دریافت آمار اطلاعیه‌ها",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
