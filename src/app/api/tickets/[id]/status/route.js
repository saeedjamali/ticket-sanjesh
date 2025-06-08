import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Ticket from "@/models/Ticket";
import { ROLES, getRolePermissions } from "@/lib/permissions";

export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const ticket = await Ticket.findById(params.id);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Parse request body to get the requested status change
    const { status } = await request.json();

    // بررسی معتبر بودن وضعیت
    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Check if user has permission to update status
    const permissions = getRolePermissions(session.user.role);
    let canUpdateStatus = false;

    // مدیر سیستم می‌تواند هر تیکتی را به هر وضعیتی تغییر دهد
    if (session.user.role === ROLES.SYSTEM_ADMIN) {
      canUpdateStatus = true;
    }
    // مدیر واحد سازمانی فقط می‌تواند وضعیت پیش‌نویس را به دیده‌نشده تغییر دهد
    else if (
      session.user.role === ROLES.EXAM_CENTER_MANAGER &&
      ticket.status === "draft" &&
      status === "new" &&
      session.user.id === ticket.createdBy.toString() &&
      session.user.examCenter === ticket.examCenter.toString()
    ) {
      canUpdateStatus = true;
    }
    // کارشناس‌ها می‌توانند وضعیت را به دیده‌شده یا پاسخ داده شده تغییر دهند (اما نه به در حال بررسی)
    else if (permissions.canRespondToTickets) {
      if (
        (session.user.role === ROLES.DISTRICT_EDUCATION_EXPERT &&
          ticket.receiver === "education") ||
        (session.user.role === ROLES.DISTRICT_TECH_EXPERT &&
          ticket.receiver === "tech")
      ) {
        // District expert can only update status for their district's tickets
        if (session.user.district === ticket.district.toString()) {
          // بررسی وضعیت درخواستی - فقط دیده شده و پاسخ داده شده مجاز است
          if (["seen", "resolved"].includes(status)) {
            canUpdateStatus = true;
          }
        }
      }
    }

    if (!canUpdateStatus) {
      return NextResponse.json(
        {
          error:
            status === "inProgress"
              ? "فقط مدیر سیستم می‌تواند وضعیت را به در حال بررسی تغییر دهد"
              : "شما مجاز به انجام این عملیات نیستید",
        },
        { status: 403 }
      );
    }

    // Update status
    ticket.status = status;
    ticket.updatedAt = new Date();

    // Ensure the type field is set correctly based on receiver if it's missing
    if (!ticket.type || ticket.type === "UNKNOWN") {
      console.log("Setting ticket type based on receiver:", ticket.receiver);
      if (ticket.receiver === "education") {
        ticket.type = "EDUCATION";
      } else if (ticket.receiver === "tech") {
        ticket.type = "TECH";
      } else {
        // Default fallback
        ticket.type = "UNKNOWN";
      }
      console.log("Ticket type set to:", ticket.type);
    }

    await ticket.save();

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Error in PUT /api/tickets/[id]/status:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
