import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import connectDB from "@/lib/db";
import Ticket from "@/models/Ticket";
import { ROLES } from "@/lib/permissions";
import mongoose from "mongoose";

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

    await connectDB();

    // ساخت کوئری بر اساس نقش کاربر
    const query = {};

    if (user.role === ROLES.EXAM_CENTER_MANAGER) {
      // مدیر واحد سازمانی تیکت‌های خودش را می‌بیند
      const conditions = [];

      // تیکت‌هایی که توسط این کاربر ایجاد شده‌اند
      if (user.id) {
        try {
          const userIdIsValid = mongoose.Types.ObjectId.isValid(user.id);
          if (userIdIsValid) {
            const createdById = new mongoose.Types.ObjectId(user.id);
            conditions.push({ createdBy: createdById });
          } else {
            conditions.push({ createdBy: user.id.toString() });
          }
        } catch (error) {
          conditions.push({ createdBy: user.id.toString() });
        }
      }

      // تیکت‌هایی که برای واحد سازمانی این کاربر هستند
      if (user.examCenter) {
        try {
          const examCenterIdIsValid = mongoose.Types.ObjectId.isValid(
            user.examCenter
          );
          if (examCenterIdIsValid) {
            const examCenterId = new mongoose.Types.ObjectId(user.examCenter);
            conditions.push({ examCenter: examCenterId });
          } else {
            conditions.push({ examCenter: user.examCenter.toString() });
          }
        } catch (error) {
          conditions.push({ examCenter: user.examCenter.toString() });
        }
      }

      if (conditions.length > 0) {
        query.$or = conditions;
      } else {
        query._id = new mongoose.Types.ObjectId();
      }
    } else if (user.role === ROLES.DISTRICT_EDUCATION_EXPERT) {
      // کارشناس سنجش منطقه
      if (user.district) {
        const districtId = mongoose.Types.ObjectId.isValid(user.district)
          ? new mongoose.Types.ObjectId(user.district)
          : user.district;

        query.district = districtId;
        query.$or = [
          { type: "EDUCATION" },
          { receiver: "education" },
          { receiver: ROLES.DISTRICT_EDUCATION_EXPERT },
          { receiver: ROLES.PROVINCE_EDUCATION_EXPERT },
        ];
      } else {
        query._id = new mongoose.Types.ObjectId();
      }
    } else if (user.role === ROLES.DISTRICT_TECH_EXPERT) {
      // کارشناس فناوری منطقه
      if (user.district) {
        const districtId = mongoose.Types.ObjectId.isValid(user.district)
          ? new mongoose.Types.ObjectId(user.district)
          : user.district;

        query.district = districtId;
        query.$or = [
          { type: "TECH" },
          { receiver: "tech" },
          { receiver: ROLES.DISTRICT_TECH_EXPERT },
          { receiver: ROLES.PROVINCE_TECH_EXPERT },
        ];
      } else {
        query._id = new mongoose.Types.ObjectId();
      }
    } else if (user.role === ROLES.DISTRICT_EVAL_EXPERT) {
      // کارشناس ارزیابی منطقه
      if (user.district) {
        const districtId = mongoose.Types.ObjectId.isValid(user.district)
          ? new mongoose.Types.ObjectId(user.district)
          : user.district;

        query.district = districtId;
        query.$or = [
          { type: "EVALUATION" },
          { receiver: "evaluation" },
          { receiver: ROLES.DISTRICT_EVAL_EXPERT },
          { receiver: ROLES.PROVINCE_EVAL_EXPERT },
        ];
      } else {
        query._id = new mongoose.Types.ObjectId();
      }
    } else if (user.role === ROLES.PROVINCE_EDUCATION_EXPERT) {
      // کارشناس سنجش استان فقط تیکت‌هایی که دریافت کننده اش کارشناس سنجش استان یا کارشناس سنجش منطقه است را می‌بیند
      if (user.province) {
        const provinceId = mongoose.Types.ObjectId.isValid(user.province)
          ? new mongoose.Types.ObjectId(user.province)
          : user.province;

        query.province = provinceId;
        query.$or = [
          { type: "EDUCATION" },
          { receiver: "education" },
          { receiver: ROLES.DISTRICT_EDUCATION_EXPERT },
          { receiver: ROLES.PROVINCE_EDUCATION_EXPERT },
        ];
      } else {
        query._id = new mongoose.Types.ObjectId();
      }
    } else if (user.role === ROLES.PROVINCE_TECH_EXPERT) {
      // کارشناس فناوری استان فقط تیکت‌هایی که دریافت کننده اش کارشناس فناوری استان یا کارشناس فناوری منطقه است را می‌بیند
      if (user.province) {
        const provinceId = mongoose.Types.ObjectId.isValid(user.province)
          ? new mongoose.Types.ObjectId(user.province)
          : user.province;

        query.province = provinceId;
        query.$or = [
          { type: "TECH" },
          { receiver: "tech" },
          { receiver: ROLES.DISTRICT_TECH_EXPERT },
          { receiver: ROLES.PROVINCE_TECH_EXPERT },
        ];
      } else {
        query._id = new mongoose.Types.ObjectId();
      }
    } else if (user.role === ROLES.PROVINCE_EVAL_EXPERT) {
      // کارشناس ارزیابی استان فقط تیکت‌هایی که دریافت کننده اش کارشناس ارزیابی استان یا کارشناس ارزیابی منطقه است را می‌بیند
      if (user.province) {
        const provinceId = mongoose.Types.ObjectId.isValid(user.province)
          ? new mongoose.Types.ObjectId(user.province)
          : user.province;

        query.province = provinceId;
        query.$or = [
          { type: "EVALUATION" },
          { receiver: "evaluation" },
          { receiver: ROLES.DISTRICT_EVAL_EXPERT },
          { receiver: ROLES.PROVINCE_EVAL_EXPERT },
        ];
      } else {
        query._id = new mongoose.Types.ObjectId();
      }
    } else if (user.role === ROLES.GENERAL_MANAGER) {
      // مدیر کل همه تیکت‌های استان خودش را می‌بیند
      if (user.province) {
        const provinceId = mongoose.Types.ObjectId.isValid(user.province)
          ? new mongoose.Types.ObjectId(user.province)
          : user.province;

        query.province = provinceId;
        // مدیر کل همه تیکت‌های استان را می‌بیند - فیلتر اضافی نیاز نیست
      } else {
        query._id = new mongoose.Types.ObjectId();
      }
    } else if (user.role === ROLES.SYSTEM_ADMIN) {
      // مدیر سیستم تمام تیکت‌ها را می‌بیند (فیلتر اضافی نیاز نیست)
    } else {
      // سایر نقش‌ها دسترسی ندارند
      query._id = new mongoose.Types.ObjectId();
    }

    console.log("Tickets stats query:", JSON.stringify(query, null, 2));

    // دریافت آمار تیکت‌ها
    const [
      totalTickets,
      newTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      referenceTickets,
      highPriorityTickets,
      seenTickets,
      referredTickets,
    ] = await Promise.all([
      Ticket.countDocuments(query),
      Ticket.countDocuments({ ...query, status: "new" }),
      Ticket.countDocuments({ ...query, status: "inProgress" }),
      Ticket.countDocuments({ ...query, status: "resolved" }),
      Ticket.countDocuments({ ...query, status: "closed" }),
      Ticket.countDocuments({ ...query, status: "reference-ticket" }),
      Ticket.countDocuments({ ...query, priority: "high" }),
      Ticket.countDocuments({ ...query, status: "seen" }),
      Ticket.countDocuments({ ...query, status: "referred_province" }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalTickets,
        newTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        referenceTickets,
        highPriorityTickets,
        seenTickets,
        referredTickets,
      },
    });
  } catch (error) {
    console.error("Error in ticket stats:", error);
    return NextResponse.json(
      { success: false, message: "خطا در دریافت آمار تیکت‌ها" },
      { status: 500 }
    );
  }
}
