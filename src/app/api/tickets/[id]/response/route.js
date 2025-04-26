import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Ticket from "@/models/Ticket";
import { ROLES, getRolePermissions } from "@/lib/permissions";
import jwt from "jsonwebtoken";
import User from "@/models/User";

// تابع احراز هویت با توکن
async function validateToken(request) {
  try {
    // دریافت توکن از هدر
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return null;
    }

    // بررسی اعتبار توکن
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key"
      );

      // بارگذاری اطلاعات کاربر از پایگاه داده
      await connectDB();
      const user = await User.findById(decoded.userId);

      if (!user) {
        return null;
      }

      return {
        id: user._id.toString(),
        role: user.role,
        examCenter: user.examCenter?.toString(),
        district: user.district?.toString(),
        province: user.province?.toString(),
        academicYear: user.academicYear,
      };
    } catch (error) {
      console.error("Token validation error:", error);
      return null;
    }
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}

export async function POST(request, { params }) {
  try {
    // روش 1: تلاش برای احراز هویت با توکن
    const userFromToken = await validateToken(request);

    // روش 2: استفاده از کوئری استرینگ (برای سادگی در تست)
    const { searchParams } = new URL(request.url);
    const userRoleParam = searchParams.get("userRole");
    const examCenterParam = searchParams.get("examCenter");
    const districtParam = searchParams.get("district");
    const provinceParam = searchParams.get("province");
    const userIdParam = searchParams.get("userId");

    let userFromQuery = null;
    if (userRoleParam) {
      userFromQuery = {
        id: userIdParam || "test-user-id",
        role: userRoleParam,
        examCenter: examCenterParam,
        district: districtParam,
        province: provinceParam,
      };
    }

    // اولویت‌بندی منابع احراز هویت
    const user = userFromToken || userFromQuery;

    console.log("POST /api/tickets/[id]/response - user from auth:", user);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Parse request body
    const requestData = await request.json();
    const { response, status } = requestData;

    console.log("Received response data:", { response, status });

    if (!response || response.trim() === "") {
      return NextResponse.json(
        { error: "Response text is required" },
        { status: 400 }
      );
    }

    // تبدیل شناسه‌ها به ObjectId
    const ticketId = params.id;
    const userId = mongoose.Types.ObjectId.isValid(user.id)
      ? new mongoose.Types.ObjectId(user.id)
      : null;

    if (!userId) {
      console.error("Invalid user ID format:", user.id);
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 }
      );
    }

    // دریافت تیکت و بررسی وجود آن
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Check if user has permission to add a response
    const permissions = getRolePermissions(user.role);
    let canRespond = false;

    if (user.role === ROLES.EXAM_CENTER_MANAGER) {
      // مسئول مرکز آزمون می‌تواند به تیکت‌های خودش پاسخ دهد
      if (
        user.id === ticket.createdBy.toString() &&
        user.examCenter === ticket.examCenter.toString()
      ) {
        canRespond = true;
      }
    } else if (user.role === ROLES.DISTRICT_EDUCATION_EXPERT) {
      // کارشناس سنجش منطقه می‌تواند به تیکت‌های سنجش منطقه خودش پاسخ دهد
      if (
        user.district === ticket.district.toString() &&
        (ticket.receiver === "education" || ticket.type === "EDUCATION")
      ) {
        canRespond = true;
      }
    } else if (user.role === ROLES.DISTRICT_TECH_EXPERT) {
      // کارشناس فناوری منطقه می‌تواند به تیکت‌های فناوری منطقه خودش پاسخ دهد
      if (
        user.district === ticket.district.toString() &&
        (ticket.receiver === "tech" || ticket.type === "TECH")
      ) {
        canRespond = true;
      }
    } else if (user.role === ROLES.PROVINCE_EDUCATION_EXPERT) {
      // کارشناس سنجش استان می‌تواند به تیکت‌های سنجش استان خودش پاسخ دهد
      if (
        user.province === ticket.province.toString() &&
        (ticket.receiver === "education" || ticket.type === "EDUCATION")
      ) {
        canRespond = true;
      }
    } else if (user.role === ROLES.PROVINCE_TECH_EXPERT) {
      // کارشناس فناوری استان می‌تواند به تیکت‌های فناوری استان خودش پاسخ دهد
      if (
        user.province === ticket.province.toString() &&
        (ticket.receiver === "tech" || ticket.type === "TECH")
      ) {
        canRespond = true;
      }
    } else if (user.role === ROLES.GENERAL_MANAGER) {
      // مدیر کل فقط می‌تواند به تیکت‌های استان خود پاسخ دهد
      if (
        ticket.province &&
        user.province &&
        user.province === ticket.province.toString()
      ) {
        canRespond = true;
        console.log(
          "General manager can respond to this ticket (same province)"
        );
      } else {
        console.log(
          "General manager cannot respond to this ticket (different province)"
        );
      }
    } else if (user.role === ROLES.SYSTEM_ADMIN) {
      // مدیر سیستم می‌تواند به تمام تیکت‌ها پاسخ دهد
      canRespond = true;
    }

    if (!canRespond) {
      return NextResponse.json(
        {
          error:
            "Forbidden - You don't have permission to respond to this ticket",
        },
        { status: 403 }
      );
    }

    // Add the response
    ticket.responses.push({
      text: response,
      createdBy: userId,
      createdAt: new Date(),
    });

    // Determine if we need to update the status based on who is responding
    const previousStatus = ticket.status;

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

    if (user.role === ROLES.EXAM_CENTER_MANAGER) {
      // If the exam center manager is responding to an already answered ticket,
      // set status back to "new" so experts know there's a new question
      const expertResponses = ticket.responses.filter((r) => {
        // Check if any previous responses were from district or province experts
        if (r.createdBy && r.createdBy.toString() !== user.id) {
          return true;
        }
        return false;
      });

      if (expertResponses.length > 0) {
        // There are expert responses, so this is a follow-up question
        console.log(
          `Exam center manager follow-up question detected. Setting status from "${previousStatus}" to "new"`
        );
        ticket.status = "new";
      }
    } else if (
      [
        ROLES.DISTRICT_EDUCATION_EXPERT,
        ROLES.DISTRICT_TECH_EXPERT,
        ROLES.PROVINCE_EDUCATION_EXPERT,
        ROLES.PROVINCE_TECH_EXPERT,
      ].includes(user.role)
    ) {
      // If an expert is responding, set to "resolved"
      console.log(
        `Expert (${user.role}) response detected. Setting status from "${previousStatus}" to "resolved"`
      );
      ticket.status = "resolved";
    } else if (status && ["seen", "inProgress", "resolved"].includes(status)) {
      // If a specific status is provided and the user has permission, use that status
      console.log(
        `Status explicitly set from "${previousStatus}" to "${status}"`
      );
      ticket.status = status;
    }

    if (previousStatus !== ticket.status) {
      console.log(
        `Ticket status updated: ${previousStatus} → ${ticket.status}`
      );
    }

    // Update updatedAt timestamp
    ticket.updatedAt = new Date();

    await ticket.save();
    console.log("Ticket response saved successfully");

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Error in POST /api/tickets/[id]/response:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
