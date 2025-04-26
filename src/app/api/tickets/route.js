import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Ticket from "@/models/Ticket";
import { ROLES } from "@/lib/permissions";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "@/models/User";
// Import fs and path for file handling
import fs from "fs";
import path from "path";
import { writeFile } from "fs/promises";
import { mkdir } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import dbConnect from "@/lib/dbConnect";

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
    // در سیستم واقعی باید از کلید محرمانه استفاده کنید
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

export async function GET(req) {
  try {
    await dbConnect();

    // روش 1: تلاش برای احراز هویت با توکن
    const userFromToken = await validateToken(req);

    // روش 2: استفاده از کوکی و تقلید سشن برای سازگاری با کد قبلی
    const authCookie = req.cookies.get("authToken")?.value;
    let userFromCookie = null;

    if (authCookie) {
      try {
        // فرض می‌کنیم که localStorage قبلاً کاربر را ذخیره کرده است
        // این فقط برای مطابقت با رفتار localStorage است
        const userCookie = req.cookies.get("user")?.value;
        if (userCookie) {
          userFromCookie = JSON.parse(decodeURIComponent(userCookie));
        }
      } catch (cookieError) {
        console.error("Cookie parsing error:", cookieError);
      }
    }

    // روش 3: استفاده از پارامتر کوئری استرینگ (برای سادگی در تست)
    const { searchParams } = new URL(req.url);
    const userRoleParam = searchParams.get("userRole");
    const examCenterId = searchParams.get("examCenter");
    const districtId = searchParams.get("district");
    const provinceId = searchParams.get("province");
    const userIdParam = searchParams.get("userId");

    console.log("Query parameters:", {
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
    const user = userFromToken || userFromCookie || userFromQuery;

    console.log("GET /api/tickets - user from auth:", user);

    if (!user) {
      console.log(
        "GET /api/tickets - No authenticated user found, returning 401"
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const status = searchParams.get("status");
    const skip = (page - 1) * limit;

    console.log("GET /api/tickets - query params:", { page, limit, status });

    try {
      await connectDB();
      console.log("Database connection established");
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      return NextResponse.json(
        { error: "Database connection failed", details: dbError.message },
        { status: 500 }
      );
    }

    // Verify Ticket model exists
    try {
      console.log("Ticket model exists:", !!Ticket);
      console.log("Ticket model schema:", Ticket.schema.paths);
    } catch (modelError) {
      console.error("Error accessing Ticket model:", modelError);
      return NextResponse.json(
        { error: "Ticket model error", details: modelError.message },
        { status: 500 }
      );
    }

    // Build query based on user role and filters
    const query = {};

    // Add status filter if provided
    if (status && status !== "all") {
      query.status = status;
    }

    const userRole = user.role;
    console.log("GET /api/tickets - user role:", userRole);
    console.log(
      "GET /api/tickets - ROLES.EXAM_CENTER_MANAGER:",
      ROLES.EXAM_CENTER_MANAGER
    );
    console.log(
      "GET /api/tickets - role match:",
      userRole === ROLES.EXAM_CENTER_MANAGER
    );

    // Add user-specific filters based on role
    if (userRole === ROLES.EXAM_CENTER_MANAGER) {
      // مسئول مرکز آزمون تیکت‌های مرکز خودش را می‌بیند
      // و همچنین تیکت‌هایی که خودش ایجاد کرده است
      try {
        const conditions = [];

        // Check if user.id is valid and log a detailed message for debugging
        console.log(
          `EXAM_CENTER_MANAGER user.id: ${user.id}, type: ${typeof user.id}`
        );

        // شرط اول: تیکت‌هایی که توسط این کاربر ایجاد شده‌اند
        if (user.id) {
          try {
            // Validate user.id is a proper ObjectId
            const userIdIsValid = mongoose.Types.ObjectId.isValid(user.id);
            console.log(
              `Is user.id (${user.id}) a valid ObjectId? ${userIdIsValid}`
            );

            if (userIdIsValid) {
              const createdById = new mongoose.Types.ObjectId(user.id);
              conditions.push({ createdBy: createdById });
              console.log(
                `Added createdBy condition with ObjectId: ${createdById}`
              );
            } else {
              console.log(
                `User ID is not a valid ObjectId: ${user.id}. Will use string comparison.`
              );
              // For backward compatibility, also try string matching
              conditions.push({ createdBy: user.id.toString() });
            }
          } catch (idError) {
            console.error(`Error processing user.id (${user.id}):`, idError);
            // Adding string comparison as fallback
            conditions.push({ createdBy: user.id.toString() });
          }
        }

        // شرط دوم: تیکت‌هایی که برای مرکز آزمون این کاربر هستند
        if (user.examCenter) {
          try {
            const examCenterIdIsValid = mongoose.Types.ObjectId.isValid(
              user.examCenter
            );
            console.log(
              `Is examCenter (${user.examCenter}) a valid ObjectId? ${examCenterIdIsValid}`
            );

            if (examCenterIdIsValid) {
              const examCenterId = new mongoose.Types.ObjectId(user.examCenter);
              conditions.push({ examCenter: examCenterId });
              console.log(
                `Added examCenter condition with ObjectId: ${examCenterId}`
              );
            } else {
              console.log(
                `Exam Center ID is not a valid ObjectId: ${user.examCenter}. Will use string comparison.`
              );
              // For backward compatibility, also try string matching
              conditions.push({ examCenter: user.examCenter.toString() });
            }
          } catch (ecError) {
            console.error(
              `Error processing examCenter ID (${user.examCenter}):`,
              ecError
            );
            // Adding string comparison as fallback
            conditions.push({ examCenter: user.examCenter.toString() });
          }
        }

        // استفاده از $or برای ترکیب شرط‌ها - اگر هریک از شرط‌ها صحیح باشد تیکت‌ها نمایش داده می‌شوند
        if (conditions.length > 0) {
          query.$or = conditions;
          console.log(
            `Set $or conditions with ${conditions.length} clauses:`,
            JSON.stringify(conditions)
          );
        } else {
          // اگر هیچ شرطی نداشتیم، یک شرط غیرممکن اضافه کنیم تا هیچ نتیجه‌ای برنگرداند
          query._id = new mongoose.Types.ObjectId(); // یک ObjectId که وجود ندارد
          console.log(
            `No valid conditions found, setting impossible _id filter`
          );
        }
      } catch (error) {
        console.error("Error setting up exam center manager filter:", error);
        // در صورت خطا یک شرط غیرممکن اضافه کنیم تا هیچ نتیجه‌ای برنگرداند
        query._id = new mongoose.Types.ObjectId(); // یک ObjectId که وجود ندارد
      }

      // افزودن لاگ کامل برای دیباگ
      console.log(
        "GET /api/tickets - complete exam center manager filter:",
        JSON.stringify(query, null, 2)
      );
    } else if (userRole === ROLES.DISTRICT_EDUCATION_EXPERT) {
      // کارشناس آموزش منطقه تیکت‌های آموزشی منطقه خود را می‌بیند
      try {
        if (user.district) {
          const districtId = mongoose.Types.ObjectId.isValid(user.district)
            ? new mongoose.Types.ObjectId(user.district)
            : user.district;

          query.district = districtId;
          // جستجو بر اساس نوع آموزشی یا گیرنده آموزشی
          query.$or = [{ type: "EDUCATION" }, { receiver: "education" }];
        } else {
          // اگر منطقه مشخص نشده، هیچ تیکتی نشان نده
          query._id = new mongoose.Types.ObjectId();
        }
      } catch (error) {
        console.error(
          "Error setting up district education expert filter:",
          error
        );
        query._id = new mongoose.Types.ObjectId();
      }
      console.log(
        "GET /api/tickets - district education expert filter:",
        query
      );
    } else if (userRole === ROLES.DISTRICT_TECH_EXPERT) {
      // کارشناس فنی منطقه تیکت‌های فنی منطقه خود را می‌بیند
      try {
        if (user.district) {
          const districtId = mongoose.Types.ObjectId.isValid(user.district)
            ? new mongoose.Types.ObjectId(user.district)
            : user.district;

          query.district = districtId;
          // جستجو بر اساس نوع فنی یا گیرنده فنی
          query.$or = [{ type: "TECH" }, { receiver: "tech" }];
        } else {
          query._id = new mongoose.Types.ObjectId();
        }
      } catch (error) {
        console.error("Error setting up district tech expert filter:", error);
        query._id = new mongoose.Types.ObjectId();
      }
      console.log("GET /api/tickets - district tech expert filter:", query);
    } else if (userRole === ROLES.SYSTEM_ADMIN) {
      // مدیر سیستم تمام تیکت‌ها را می‌بیند (فیلتر اضافی نیاز نیست)
      console.log("GET /api/tickets - system admin role, no filters applied");
    } else {
      console.log("GET /api/tickets - unknown role:", userRole);
    }

    console.log("GET /api/tickets - final query:", JSON.stringify(query));

    // برای دیباگ، ابتدا بدون فیلتر کوئری بزنیم و ببینیم آیا تیکت‌ها وجود دارند
    let allTickets = 0;
    try {
      allTickets = await Ticket.countDocuments({});
      console.log(
        "GET /api/tickets - total tickets in database (no filter):",
        allTickets
      );
    } catch (countError) {
      console.error("Error counting all tickets:", countError);
      return NextResponse.json(
        { error: "Error counting tickets", details: countError.message },
        { status: 500 }
      );
    }

    if (allTickets === 0) {
      console.log("GET /api/tickets - No tickets in database at all!");
      return NextResponse.json({
        tickets: [],
        totalPages: 0,
        currentPage: page,
        totalTickets: 0,
        message: "No tickets found in the database",
      });
    }

    // Count total tickets matching the query
    let totalTickets = 0;
    try {
      totalTickets = await Ticket.countDocuments(query);
      console.log("GET /api/tickets - totalTickets with filter:", totalTickets);
    } catch (queryCountError) {
      console.error("Error counting filtered tickets:", queryCountError);
      return NextResponse.json(
        {
          error: "Error counting filtered tickets",
          details: queryCountError.message,
        },
        { status: 500 }
      );
    }

    const totalPages = Math.ceil(totalTickets / limit);

    // Fetch tickets
    let tickets = [];
    try {
      console.log("GET /api/tickets - executing query:", JSON.stringify(query));
      tickets = await Ticket.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "fullName")
        .populate("examCenter", "name")
        .populate("district", "name")
        .populate("province", "name")
        .lean();

      console.log("GET /api/tickets - tickets found:", tickets.length);

      // Log the first few tickets for debugging
      if (tickets.length > 0) {
        const sampleTicket = tickets[0];
        console.log("Sample ticket found:", {
          _id: sampleTicket._id,
          createdBy:
            typeof sampleTicket.createdBy === "object"
              ? {
                  _id: sampleTicket.createdBy._id,
                  fullName: sampleTicket.createdBy.fullName,
                }
              : sampleTicket.createdBy,
          examCenter:
            typeof sampleTicket.examCenter === "object"
              ? {
                  _id: sampleTicket.examCenter._id,
                  name: sampleTicket.examCenter.name,
                }
              : sampleTicket.examCenter,
          title: sampleTicket.title,
        });
      } else {
        console.log("No tickets found for query criteria.");
      }
    } catch (fetchError) {
      console.error("Error fetching tickets:", fetchError);
      return NextResponse.json(
        { error: "Error fetching tickets", details: fetchError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      tickets,
      totalPages,
      currentPage: page,
      totalTickets,
    });
  } catch (error) {
    console.error("Error in GET tickets:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
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
    const user = userFromToken || userFromCookie || userFromQuery;

    console.log("POST /api/tickets - user from auth:", user);

    if (!user) {
      console.log(
        "POST /api/tickets - No authenticated user found, returning 401"
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // فقط مسئولین مرکز آزمون می‌توانند تیکت ایجاد کنند
    if (user.role !== ROLES.EXAM_CENTER_MANAGER) {
      console.log("POST /api/tickets - User role is not EXAM_CENTER_MANAGER");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    // پردازش داده‌های فرم
    const formData = await request.formData();
    console.log("POST /api/tickets - Form data received");

    // لاگ تمام مقادیر formData
    for (const pair of formData.entries()) {
      console.log(`Form data - ${pair[0]}: ${pair[1]}`);
    }

    // بررسی اعتبار ObjectId کاربر
    let userId = null;
    try {
      if (mongoose.Types.ObjectId.isValid(user.id)) {
        userId = new mongoose.Types.ObjectId(user.id);
      } else {
        userId = user.id; // Use as is if not a valid ObjectId
        console.log(`Using non-ObjectId user.id as-is: ${userId}`);
      }
    } catch (idError) {
      console.error(
        `Error processing user.id for ticket creation (${user.id}):`,
        idError
      );
      return NextResponse.json(
        { error: "Invalid user ID format", details: idError.message },
        { status: 400 }
      );
    }

    if (!userId) {
      console.error("POST /api/tickets - Missing user ID:", user);
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    // تبدیل سایر شناسه‌ها به ObjectId
    let examCenterObjId = null;
    if (user.examCenter) {
      try {
        examCenterObjId = mongoose.Types.ObjectId.isValid(user.examCenter)
          ? new mongoose.Types.ObjectId(user.examCenter)
          : user.examCenter;
        console.log(`Using examCenter ID: ${examCenterObjId}`);
      } catch (error) {
        console.error(
          `Error processing examCenter ID: ${user.examCenter}`,
          error
        );
      }
    }

    let districtObjId = null;
    if (user.district) {
      try {
        districtObjId = mongoose.Types.ObjectId.isValid(user.district)
          ? new mongoose.Types.ObjectId(user.district)
          : user.district;
        console.log(`Using district ID: ${districtObjId}`);
      } catch (error) {
        console.error(`Error processing district ID: ${user.district}`, error);
      }
    }

    let provinceObjId = null;
    if (user.province) {
      try {
        provinceObjId = mongoose.Types.ObjectId.isValid(user.province)
          ? new mongoose.Types.ObjectId(user.province)
          : user.province;
        console.log(`Using province ID: ${provinceObjId}`);
      } catch (error) {
        console.error(`Error processing province ID: ${user.province}`, error);
      }
    }

    // گرفتن مقادیر از فرم
    const title = formData.get("title");
    const description = formData.get("description");
    const priority = formData.get("priority");
    const receiver = formData.get("receiver");
    const status = formData.get("status") || "new";

    // تعیین نوع تیکت بر اساس receiver
    let type = "UNKNOWN";
    if (receiver === "education") {
      type = "EDUCATION";
    } else if (receiver === "tech") {
      type = "TECH";
    }

    // تنظیم سال تحصیلی - اگر در اطلاعات کاربر وجود نداشت از سال جاری استفاده می‌کنیم
    let academicYear = user.academicYear;
    if (!academicYear) {
      // تنظیم سال تحصیلی جاری (مثلا 1402-1403)
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const persianYear = currentYear - 621; // تبدیل تقریبی به سال شمسی
      academicYear = `${persianYear}-${persianYear + 1}`;
      console.log(
        "POST /api/tickets - Using default academic year:",
        academicYear
      );
    }

    const ticket = {
      title,
      description,
      priority,
      receiver,
      type, // اضافه کردن فیلد type بر اساس receiver
      createdBy: userId,
      examCenter: examCenterObjId,
      district: districtObjId,
      province: provinceObjId,
      academicYear: academicYear,
      status,
    };

    console.log("POST /api/tickets - Creating ticket with data:", ticket);

    // پردازش آپلود عکس در صورت وجود
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
        // ادامه دادن بدون تصویر در صورت خطا
        ticket.image = null;
      }
    }

    try {
      const newTicket = await Ticket.create(ticket);
      console.log("POST /api/tickets - Ticket created:", newTicket._id);
      return NextResponse.json(newTicket, { status: 201 });
    } catch (dbError) {
      console.error("POST /api/tickets - Database error:", dbError);
      return NextResponse.json(
        { error: "Database Error", message: dbError.message, details: dbError },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in POST /api/tickets:", error);
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
