import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Ticket from "@/models/Ticket";
import { ROLES } from "@/lib/permissions";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

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

    // بررسی اعتبار توکن (بصورت ساده)
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

export async function GET(request, { params }) {
  try {
    console.log(`GET /api/tickets/${params.id} - request received`);
    console.log(`Ticket ID parameter: ${params.id}`);

    // بررسی معتبر بودن params.id
    if (!params.id || params.id === "undefined") {
      console.error("Invalid ticket ID: undefined or empty");
      return NextResponse.json(
        {
          error: "Invalid ticket ID",
          message: "The ticket ID is undefined or invalid",
        },
        { status: 400 }
      );
    }

    console.log(
      `Is valid ObjectId: ${mongoose.Types.ObjectId.isValid(params.id)}`
    );

    // بررسی اینکه آیا params.id یک ObjectId معتبر است
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      console.error(`Invalid ticket ID format: ${params.id}`);
      return NextResponse.json(
        {
          error: "Invalid ticket ID format",
          message: `The provided ticket ID (${params.id}) is not a valid MongoDB ObjectId`,
        },
        { status: 400 }
      );
    }

    // روش 1: تلاش برای احراز هویت با توکن
    const userFromToken = await validateToken(request);

    // روش 2: استفاده از کوکی و تقلید سشن برای سازگاری با کد قبلی
    const authCookie = request.cookies.get("authToken")?.value;
    let userFromCookie = null;

    if (authCookie) {
      try {
        // فرض می‌کنیم که localStorage قبلاً کاربر را ذخیره کرده است
        const userCookie = request.cookies.get("user")?.value;
        if (userCookie) {
          userFromCookie = JSON.parse(decodeURIComponent(userCookie));
        }
      } catch (cookieError) {
        console.error("Cookie parsing error:", cookieError);
      }
    }

    // روش 3: استفاده از پارامتر کوئری استرینگ (برای سادگی در تست)
    const { searchParams } = new URL(request.url);
    const userRoleParam = searchParams.get("userRole");
    const examCenterId = searchParams.get("examCenter");
    const districtId = searchParams.get("district");
    const provinceId = searchParams.get("province");
    const userIdParam = searchParams.get("userId");

    console.log(`Query parameters received:`, {
      userRole: userRoleParam,
      examCenter: examCenterId,
      district: districtId,
      province: provinceId,
      userId: userIdParam,
    });

    let userFromQuery = null;
    if (userRoleParam) {
      userFromQuery = {
        id: userIdParam || "test-user-id",
        role: userRoleParam,
        examCenter: examCenterId,
        district: districtId,
        province: provinceId,
      };
    }

    // اولویت‌بندی منابع احراز هویت
    const user =
      userFromToken || userFromCookie || userFromQuery || (await auth())?.user;

    console.log(
      `GET /api/tickets/${params.id} - authenticated user:`,
      user
        ? {
            id: user.id,
            role: user.role,
            examCenter: user.examCenter,
            district: user.district,
            province: user.province,
          }
        : "null"
    );

    if (!user) {
      console.log(
        `GET /api/tickets/${params.id} - No authenticated user found`
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    console.log(`GET /api/tickets/${params.id} - Database connected`);

    try {
      const ticket = await Ticket.findById(params.id)
        .populate("createdBy", "fullName")
        .populate("examCenter", "name")
        .populate("district", "name")
        .populate("province", "name")
        .populate("responses.createdBy", "fullName")
        .lean();

      console.log(
        `GET /api/tickets/${params.id} - Ticket found:`,
        ticket ? "yes" : "no"
      );

      if (!ticket) {
        console.log(`Ticket with ID ${params.id} not found in database`);
        return NextResponse.json(
          { error: "Ticket not found" },
          { status: 404 }
        );
      }

      console.log(`Ticket details (partial):`, {
        _id: ticket._id,
        createdBy: ticket.createdBy
          ? {
              _id: ticket.createdBy._id,
              fullName: ticket.createdBy.fullName,
            }
          : "undefined",
        examCenter: ticket.examCenter
          ? {
              _id: ticket.examCenter._id,
              name: ticket.examCenter.name,
            }
          : "undefined",
      });

      // Check if user has permission to view this ticket
      let canViewTicket = false;

      if (user.role === ROLES.EXAM_CENTER_MANAGER) {
        // مسئول مرکز آزمون می‌تواند تمام تیکت‌های مرکز خود را ببیند
        if (
          user.examCenter &&
          ticket.examCenter &&
          (user.examCenter === ticket.examCenter._id.toString() ||
            user.examCenter === ticket.examCenter._id)
        ) {
          canViewTicket = true;
          console.log(
            "Exam center manager can view this ticket (same exam center)"
          );
        }

        // همچنین مسئول مرکز آزمون می‌تواند تیکت‌هایی که خودش ایجاد کرده را ببیند
        if (
          user.id &&
          ticket.createdBy &&
          (user.id === ticket.createdBy._id.toString() ||
            user.id === ticket.createdBy._id)
        ) {
          canViewTicket = true;
          console.log("Exam center manager can view this ticket (creator)");
        }

        console.log(`Comparison details:`, {
          userId: user.id,
          ticketCreatedById: ticket.createdBy
            ? ticket.createdBy._id
            : "undefined",
          userExamCenter: user.examCenter,
          ticketExamCenter: ticket.examCenter
            ? ticket.examCenter._id
            : "undefined",
        });
      } else if (user.role === ROLES.DISTRICT_EDUCATION_EXPERT) {
        // کارشناس سنجش منطقه فقط تیکت‌های سنجش منطقه خودش را می‌بیند
        if (
          ticket.district &&
          (user.district === ticket.district._id.toString() ||
            user.district === ticket.district._id) &&
          (ticket.receiver === "education" || ticket.type === "EDUCATION")
        ) {
          canViewTicket = true;
        }
      } else if (user.role === ROLES.DISTRICT_TECH_EXPERT) {
        // کارشناس فناوری منطقه فقط تیکت‌های فناوری منطقه خودش را می‌بیند
        if (
          ticket.district &&
          (user.district === ticket.district._id.toString() ||
            user.district === ticket.district._id) &&
          (ticket.receiver === "tech" || ticket.type === "TECH")
        ) {
          canViewTicket = true;
        }
      } else if (user.role === ROLES.PROVINCE_EDUCATION_EXPERT) {
        // کارشناس سنجش استان فقط تیکت‌های سنجش استان خودش را می‌بیند
        if (
          ticket.province &&
          (user.province === ticket.province._id.toString() ||
            user.province === ticket.province._id) &&
          (ticket.receiver === "education" || ticket.type === "EDUCATION")
        ) {
          canViewTicket = true;
        }
      } else if (user.role === ROLES.PROVINCE_TECH_EXPERT) {
        // کارشناس فناوری استان فقط تیکت‌های فناوری استان خودش را می‌بیند
        if (
          ticket.province &&
          (user.province === ticket.province._id.toString() ||
            user.province === ticket.province._id) &&
          (ticket.receiver === "tech" || ticket.type === "TECH")
        ) {
          canViewTicket = true;
        }
      } else if (user.role === ROLES.GENERAL_MANAGER) {
        // مدیر کل فقط تیکت‌های استان خود را می‌بیند
        if (
          ticket.province &&
          user.province &&
          (user.province === ticket.province._id.toString() ||
            user.province === ticket.province._id)
        ) {
          canViewTicket = true;
          console.log("General manager can view this ticket (same province)");
        } else {
          console.log(
            "General manager cannot view this ticket (different province)"
          );
        }
      } else if (user.role === ROLES.SYSTEM_ADMIN) {
        // مدیر سیستم تمام تیکت‌ها را می‌بیند
        canViewTicket = true;
      }

      console.log(
        `GET /api/tickets/${params.id} - Can view ticket:`,
        canViewTicket
      );

      if (!canViewTicket) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Automatically update ticket status to "seen" when viewed by district or province experts
      // Only update if status is "new" (unseen) and the viewer is the appropriate expert
      if (
        ticket.status === "new" &&
        ((user.role === ROLES.DISTRICT_EDUCATION_EXPERT &&
          ticket.receiver === "education") ||
          (user.role === ROLES.DISTRICT_TECH_EXPERT &&
            ticket.receiver === "tech") ||
          (user.role === ROLES.PROVINCE_EDUCATION_EXPERT &&
            ticket.receiver === "education") ||
          (user.role === ROLES.PROVINCE_TECH_EXPERT &&
            ticket.receiver === "tech"))
      ) {
        console.log(
          `Automatically updating ticket status from "new" to "seen"`
        );

        // Ensure the type field is set correctly based on receiver
        let ticketUpdate = { status: "seen" };

        // Update type if needed
        if (!ticket.type || ticket.type === "UNKNOWN") {
          console.log(
            "Setting ticket type based on receiver:",
            ticket.receiver
          );
          if (ticket.receiver === "education") {
            ticketUpdate.type = "EDUCATION";
            // Update the response object too
            ticket.type = "EDUCATION";
          } else if (ticket.receiver === "tech") {
            ticketUpdate.type = "TECH";
            // Update the response object too
            ticket.type = "TECH";
          }
          console.log("Ticket type updated to:", ticketUpdate.type);
        }

        // Update the ticket in the database
        await Ticket.findByIdAndUpdate(params.id, ticketUpdate);

        // Update the status in our response object
        ticket.status = "seen";
        console.log(`Ticket status updated to "seen"`);
      }

      return NextResponse.json(ticket);
    } catch (dbError) {
      console.error(
        `Error retrieving ticket ${params.id} from database:`,
        dbError
      );
      return NextResponse.json(
        {
          error: "Database error",
          message: dbError.message,
          stack: dbError.stack,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`Error in GET /api/tickets/${params.id}:`, error);
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

export async function PUT(request, { params }) {
  try {
    // روش 1: تلاش برای احراز هویت با توکن
    const userFromToken = await validateToken(request);

    // روش 2: استفاده از کوکی و تقلید سشن برای سازگاری با کد قبلی
    const authCookie = request.cookies.get("authToken")?.value;
    let userFromCookie = null;

    if (authCookie) {
      try {
        const userCookie = request.cookies.get("user")?.value;
        if (userCookie) {
          userFromCookie = JSON.parse(decodeURIComponent(userCookie));
        }
      } catch (cookieError) {
        console.error("Cookie parsing error:", cookieError);
      }
    }

    // روش 3: استفاده از پارامتر کوئری استرینگ (برای سادگی در تست)
    const { searchParams } = new URL(request.url);
    const userRoleParam = searchParams.get("userRole");
    const examCenterId = searchParams.get("examCenter");
    const districtId = searchParams.get("district");
    const provinceId = searchParams.get("province");
    const userIdParam = searchParams.get("userId");

    let userFromQuery = null;
    if (userRoleParam) {
      userFromQuery = {
        id: userIdParam || "test-user-id",
        role: userRoleParam,
        examCenter: examCenterId,
        district: districtId,
        province: provinceId,
      };
    }

    // اولویت‌بندی منابع احراز هویت
    const user =
      userFromToken || userFromCookie || userFromQuery || (await auth())?.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const ticket = await Ticket.findById(params.id);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // فقط مسئول مرکز آزمونی که تیکت را ایجاد کرده و تنها قبل از پاسخگویی کارشناس می‌تواند ویرایش کند
    const isCreator = user.id === ticket.createdBy.toString();
    const isSameExamCenter = user.examCenter === ticket.examCenter.toString();

    if (
      user.role !== ROLES.EXAM_CENTER_MANAGER ||
      !isCreator ||
      !isSameExamCenter
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // اگر تیکت پاسخی دارد، اجازه ویرایش ندارد
    if (ticket.responses && ticket.responses.length > 0) {
      return NextResponse.json(
        { error: "Cannot edit ticket after it has been responded to" },
        { status: 403 }
      );
    }

    // Process form data
    const formData = await request.formData();

    // اطلاعاتی که می‌توانند ویرایش شوند
    if (formData.get("title")) {
      ticket.title = formData.get("title");
    }

    if (formData.get("description")) {
      ticket.description = formData.get("description");
    }

    if (formData.get("priority")) {
      ticket.priority = formData.get("priority");
    }

    if (formData.get("receiver")) {
      ticket.receiver = formData.get("receiver");

      // Update type based on new receiver value
      if (ticket.receiver === "education") {
        ticket.type = "EDUCATION";
      } else if (ticket.receiver === "tech") {
        ticket.type = "TECH";
      }
      console.log(
        `Updated ticket type to ${ticket.type} based on receiver ${ticket.receiver}`
      );
    }

    // Handle image upload if provided
    const image = formData.get("image");
    if (image && image.size > 0) {
      try {
        // اطمینان از وجود دایرکتوری آپلود
        const uploadDir = path.join(process.cwd(), "public/uploads");

        // ایجاد دایرکتوری اگر وجود ندارد
        try {
          await mkdir(uploadDir, { recursive: true });
        } catch (mkdirError) {
          console.log(
            "Directory already exists or error creating it:",
            mkdirError
          );
        }

        // ایجاد نام فایل یکتا
        const fileName = `${Date.now()}-${image.name.replace(/\s+/g, "_")}`;
        const filePath = path.join(uploadDir, fileName);

        // ذخیره فایل
        const bytes = await image.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        console.log(`Image saved to ${filePath}`);

        // ذخیره آدرس فایل در تیکت
        ticket.image = `/uploads/${fileName}`;
      } catch (uploadError) {
        console.error("Error saving uploaded image:", uploadError);
        // حفظ تصویر قبلی در صورت خطا
      }
    }

    // Update updatedAt timestamp
    ticket.updatedAt = new Date();

    await ticket.save();

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Error in PUT /api/tickets/[id]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
