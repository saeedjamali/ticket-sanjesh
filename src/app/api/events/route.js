import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Event from "@/models/Event";
import User from "@/models/User";
import Province from "@/models/Province";
import District from "@/models/District";
import ExamCenter from "@/models/ExamCenter";
import { authService } from "@/lib/auth/authService";

// GET - دریافت فهرست رویدادها
export async function GET(request) {
  try {
    await dbConnect();

    const userValid = await authService.validateToken(request);
    if (!userValid) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    const user = await User.findById(userValid.id)
      .populate("province")
      .populate("district")
      .populate("examCenter");

    if (!user) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    }

    console.log("User info for events:", {
      id: user._id,
      role: user.role,
      province: user.province?._id || null,
      district: user.district?._id || null,
      examCenter: user.examCenter?._id || null,
    });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const isAdmin = searchParams.get("admin") === "true";

    let filter = {};

    if (user.role === "systemAdmin" && isAdmin) {
      // مدیر سیستم می‌تواند همه رویدادها را ببیند
      if (search) {
        filter = {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { organizationScope: { $regex: search, $options: "i" } },
          ],
        };
      }

      const skip = (page - 1) * limit;

      const [events, total] = await Promise.all([
        Event.find(filter)
          .populate("createdBy", "firstName lastName")
          .populate("updatedBy", "firstName lastName")
          .populate("targetProvinces", "name code")
          .populate("targetDistricts", "name code")
          .populate("targetExamCenters", "name code")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Event.countDocuments(filter),
      ]);

      // اضافه کردن وضعیت به هر رویداد
      const eventsWithStatus = events.map((event) => {
        const eventDoc = new Event(event);
        const status = eventDoc.getStatus();
        return {
          ...event,
          statusInfo: status,
        };
      });

      return NextResponse.json({
        events: eventsWithStatus,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      });
    } else {
      // کاربران عادی فقط رویدادهای مربوط به خودشان را می‌بینند
      console.log("Calling Event.getActiveEvents for user:", user.role);

      try {
        const events = await Event.getActiveEvents(
          user.role,
          user.province?._id,
          user.district?._id,
          user.examCenter?._id
        );

        console.log(`Returning ${events.length} events for dashboard`);
        return NextResponse.json({ events });
      } catch (error) {
        console.error("Error in getActiveEvents:", error);
        return NextResponse.json(
          { error: "خطا در دریافت رویدادها: " + error.message },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "خطا در دریافت رویدادها" },
      { status: 500 }
    );
  }
}

// POST - ایجاد رویداد جدید
export async function POST(request) {
  try {
    await dbConnect();

    const userValid = await authService.validateToken(request);
    if (!userValid) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    const user = await User.findById(userValid.id);
    if (!user || user.role !== "systemAdmin") {
      return NextResponse.json(
        { error: "فقط مدیر سیستم مجاز به ایجاد رویداد است" },
        { status: 403 }
      );
    }

    const data = await request.json();
    console.log("Creating event with data:", data);

    // اعتبارسنجی فیلدهای الزامی
    const requiredFields = [
      "title",
      "startDate",
      "endDate",
      "organizationScope",
      "targetRoles",
    ];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `فیلد ${field} الزامی است` },
          { status: 400 }
        );
      }
    }

    // اعتبارسنجی تاریخ
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "تاریخ پایان باید بعد از تاریخ شروع باشد" },
        { status: 400 }
      );
    }

    // اعتبارسنجی نقش‌ها
    if (!Array.isArray(data.targetRoles) || data.targetRoles.length === 0) {
      return NextResponse.json(
        { error: "حداقل یک نقش هدف باید انتخاب شود" },
        { status: 400 }
      );
    }

    const validRoles = [
      "systemAdmin",
      "generalManager",
      "examCenterManager",
      "all",
    ];
    if (!data.targetRoles.every((role) => validRoles.includes(role))) {
      return NextResponse.json(
        { error: "نقش‌های انتخاب شده معتبر نیستند" },
        { status: 400 }
      );
    }

    // اعتبارسنجی فیلدهای جغرافیایی برای مدیر واحد سازمانی
    if (data.targetRoles.includes("examCenterManager")) {
      if (
        !data.targetProvinces?.length &&
        !data.targetDistricts?.length &&
        !data.targetExamCenters?.length
      ) {
        return NextResponse.json(
          {
            error:
              "برای مدیر واحد سازمانی باید حداقل یک استان، منطقه یا واحد سازمانی انتخاب شود",
          },
          { status: 400 }
        );
      }
    }

    // ایجاد رویداد جدید
    const eventData = {
      title: data.title,
      description: data.description || "",
      startDate,
      endDate,
      organizationScope: data.organizationScope,
      targetRoles: data.targetRoles,
      targetProvinces: data.targetProvinces || [],
      targetDistricts: data.targetDistricts || [],
      targetExamCenters: data.targetExamCenters || [],
      priority: data.priority || "medium",
      isActive: data.isActive !== false,
      createdBy: user._id,
    };

    console.log("Final event data:", eventData);

    const event = new Event(eventData);
    await event.save();

    // Populate references for response
    await event.populate([
      { path: "createdBy", select: "firstName lastName" },
      { path: "targetProvinces", select: "name code" },
      { path: "targetDistricts", select: "name code" },
      { path: "targetExamCenters", select: "name code" },
    ]);

    return NextResponse.json(
      { message: "رویداد با موفقیت ایجاد شد", event },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "خطا در ایجاد رویداد: " + error.message },
      { status: 500 }
    );
  }
}

// PUT - ویرایش رویداد
export async function PUT(request) {
  try {
    await dbConnect();

    const userValid = await authService.validateToken(request);
    if (!userValid) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    const user = await User.findById(userValid.id);
    if (!user || user.role !== "systemAdmin") {
      return NextResponse.json(
        { error: "فقط مدیر سیستم مجاز به ویرایش رویداد است" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("id");

    if (!eventId) {
      return NextResponse.json(
        { error: "شناسه رویداد الزامی است" },
        { status: 400 }
      );
    }

    const data = await request.json();
    console.log("Updating event with data:", data);

    // اعتبارسنجی تاریخ در صورت وجود
    if (data.startDate && data.endDate) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);

      if (endDate <= startDate) {
        return NextResponse.json(
          { error: "تاریخ پایان باید بعد از تاریخ شروع باشد" },
          { status: 400 }
        );
      }
    }

    // اعتبارسنجی نقش‌ها
    if (data.targetRoles) {
      if (!Array.isArray(data.targetRoles) || data.targetRoles.length === 0) {
        return NextResponse.json(
          { error: "حداقل یک نقش هدف باید انتخاب شود" },
          { status: 400 }
        );
      }

      const validRoles = [
        "systemAdmin",
        "generalManager",
        "examCenterManager",
        "all",
      ];
      if (!data.targetRoles.every((role) => validRoles.includes(role))) {
        return NextResponse.json(
          { error: "نقش‌های انتخاب شده معتبر نیستند" },
          { status: 400 }
        );
      }

      // اعتبارسنجی فیلدهای جغرافیایی برای مدیر واحد سازمانی
      if (data.targetRoles.includes("examCenterManager")) {
        if (
          !data.targetProvinces?.length &&
          !data.targetDistricts?.length &&
          !data.targetExamCenters?.length
        ) {
          return NextResponse.json(
            {
              error:
                "برای مدیر واحد سازمانی باید حداقل یک استان، منطقه یا واحد سازمانی انتخاب شود",
            },
            { status: 400 }
          );
        }
      }
    }

    // به‌روزرسانی رویداد
    const updateData = {
      ...data,
      updatedBy: user._id,
    };

    console.log("Final update data:", updateData);

    const event = await Event.findByIdAndUpdate(eventId, updateData, {
      new: true,
      runValidators: true,
    }).populate([
      { path: "createdBy", select: "firstName lastName" },
      { path: "updatedBy", select: "firstName lastName" },
      { path: "targetProvinces", select: "name code" },
      { path: "targetDistricts", select: "name code" },
      { path: "targetExamCenters", select: "name code" },
    ]);

    if (!event) {
      return NextResponse.json(
        { error: "رویداد مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "رویداد با موفقیت به‌روزرسانی شد",
      event,
    });
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "خطا در به‌روزرسانی رویداد: " + error.message },
      { status: 500 }
    );
  }
}

// DELETE - حذف رویداد
export async function DELETE(request) {
  try {
    await dbConnect();

    const userValid = await authService.validateToken(request);
    if (!userValid) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    const user = await User.findById(userValid.id);
    if (!user || user.role !== "systemAdmin") {
      return NextResponse.json(
        { error: "فقط مدیر سیستم مجاز به حذف رویداد است" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("id");

    if (!eventId) {
      return NextResponse.json(
        { error: "شناسه رویداد الزامی است" },
        { status: 400 }
      );
    }

    const event = await Event.findByIdAndDelete(eventId);

    if (!event) {
      return NextResponse.json(
        { error: "رویداد مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "رویداد با موفقیت حذف شد" });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { error: "خطا در حذف رویداد: " + error.message },
      { status: 500 }
    );
  }
}
