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
import { authService } from "@/lib/auth/authService";
import fs from "fs";
export async function GET(request, { params }) {
  try {
    await connectDB();

    // اعتبارسنجی توکن
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "لطفا وارد شوید" },
        { status: 401 }
      );
    }

    // یافتن تیکت
    const ticket = await Ticket.findById(params.id)
      .populate("createdBy", "role province district examCenter")
      .populate("province", "_id name")
      .populate("district", "_id name")
      .populate("examCenter", "_id name");

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "تیکت مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی دسترسی
    let canView = false;

  
    switch (user.role) {
      case ROLES.EXAM_CENTER_MANAGER:
        // مسئول مرکز فقط می‌تواند تیکت‌های خودش را ببیند
        canView = ticket.createdBy._id.toString() === user.id.toString();
        console.log("canView---->", canView);
        break;

      case ROLES.DISTRICT_TECH_EXPERT:
        // کارشناس منطقه می‌تواند تیکت‌های مراکز منطقه خود را ببیند
        canView = ticket.district?._id.toString() === user.district?.toString();
        break;
      case ROLES.DISTRICT_EDUCATION_EXPERT:
        canView = ticket.district?._id.toString() === user.district?.toString();

        break;
        case ROLES.DISTRICT_EVAL_EXPERT:
          canView = ticket.district?._id.toString() === user.district?.toString();
  
          break;
      case ROLES.PROVINCE_EDUCATION_EXPERT:
        // کارشناس استان می‌تواند تیکت‌های مراکز و مناطق استان خود را ببیند
        canView = ticket.province?._id.toString() === user.province?.toString();
        break;

      case ROLES.PROVINCE_TECH_EXPERT:
        canView = ticket.province?._id.toString() === user.province?.toString();
        break;
      case ROLES.PROVINCE_EVAL_EXPERT:
        canView = ticket.province?._id.toString() === user.province?.toString();
        break;
      case ROLES.GENERAL_MANAGER:
        canView = ticket.province?._id.toString() === user.province?.toString();
        break;
      case ROLES.ADMIN:
      case ROLES.SUPER_ADMIN:
      case ROLES.SYSTEM_ADMIN:
        // مدیران سیستم به همه تیکت‌ها دسترسی دارند
        canView = true;
        break;

      default:
        canView = false;
    }
    console.log("canView---->", canView);
    if (!canView) {
      return NextResponse.json(
        { success: false, message: "شما دسترسی به این تیکت ندارید" },
        { status: 403 }
      );
    }

    // بروزرسانی وضعیت تیکت به seen اگر از طرف کارشناس منطقه باشد
    const isDistrictExpert = [
      ROLES.DISTRICT_TECH_EXPERT,
      ROLES.DISTRICT_EDUCATION_EXPERT,
      ROLES.DISTRICT_EVAL_EXPERT,
    ].includes(user.role);
    if (isDistrictExpert && ticket.status === "new") {
      ticket.status = "seen";
      await ticket.save();
    }

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error("Error in ticket view:", error);
    return NextResponse.json(
      { success: false, message: "خطا در دریافت اطلاعات تیکت" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    // روش 1: تلاش برای احراز هویت با توکن
    const user = await authService.validateToken(request);
    const id = await params.id;
    console.log("user---->", user);
    console.log("id---->", id);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const ticket = await Ticket.findById(id);
    console.log("ticket---->", ticket);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // فقط مدیر واحد سازمانیی که تیکت را ایجاد کرده و تنها قبل از پاسخگویی کارشناس می‌تواند ویرایش کند
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
    if (ticket.status !== "new") {
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
    console.log("image----------->", image);
    if (image && image.size > 0) {
      try {
        // اطمینان از وجود دایرکتوری آپلود
        const uploadDir = path.join(process.cwd(), "/uploads");

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
        ticket.image = `${fileName}`;
      } catch (uploadError) {
        console.error("Error saving uploaded image:", uploadError);
        // حفظ تصویر قبلی در صورت خطا
      }
    }
    console.log("ticket-------------->", ticket);
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
