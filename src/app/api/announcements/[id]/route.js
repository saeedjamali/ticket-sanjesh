import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import connectDB from "@/lib/db";
import Announcement from "@/models/Announcement";
import { ROLES } from "@/lib/permissions";
import path from "path";
import fs from "fs";

// GET API endpoint - fetch a single announcement
export async function GET(request, { params }) {
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

    // Get the announcement ID from the URL
    const id = await params.id;

    // Fetch the announcement
    const announcement = await Announcement.findById(id)
      .populate("createdBy", "fullName")
      .populate("province", "name")
      .populate("targetDistricts", "name");

    if (!announcement) {
      return NextResponse.json(
        { success: false, message: "اطلاعیه یافت نشد" },
        { status: 404 }
      );
    }

    // Check permissions - creators can see their announcements, targets can see announcements for them
    const isCreator =
      user.id === announcement.createdBy._id.toString() ||
      (user.province &&
        user.province.toString() === announcement.province._id.toString() &&
        [
          "generalManager",
          "provinceEducationExpert",
          "provinceTechExpert",
        ].includes(user.role));

    const isTarget =
      [
        "districtEducationExpert",
        "districtTechExpert",
        "examCenterManager",
      ].includes(user.role) &&
      announcement.targetRoles.includes(user.role) &&
      (!announcement.targetDistricts.length ||
        announcement.targetDistricts.some(
          (d) => d._id.toString() === user.district?.toString()
        ));

    if (!isCreator && !isTarget) {
      return NextResponse.json(
        { success: false, message: "شما دسترسی به این اطلاعیه ندارید" },
        { status: 403 }
      );
    }

    // Mark as viewed if user is a target
    if (isTarget) {
      const hasViewed = announcement.viewedBy.some(
        (view) => view.user.toString() === user.id
      );

      if (!hasViewed) {
        announcement.viewedBy.push({
          user: user.id,
          viewedAt: new Date(),
        });
        await announcement.save();
      }
    }

    return NextResponse.json({
      success: true,
      announcement,
    });
  } catch (error) {
    console.error("Error fetching announcement:", error);
    return NextResponse.json(
      {
        success: false,
        message: "خطا در دریافت اطلاعیه",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT API endpoint - update an announcement
export async function PUT(request, { params }) {
  try {
    // Authenticate user
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "لطفا وارد شوید" },
        { status: 401 }
      );
    }

    // Check permissions - only province roles can update announcements
    const allowedRoles = [
      ROLES.GENERAL_MANAGER,
      ROLES.PROVINCE_EDUCATION_EXPERT,
      ROLES.PROVINCE_TECH_EXPERT,
    ];

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "شما دسترسی به ویرایش اطلاعیه ندارید" },
        { status: 403 }
      );
    }

    await connectDB();

    // Get the announcement ID from the URL
    const id = params.id;

    // Find the announcement
    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return NextResponse.json(
        { success: false, message: "اطلاعیه یافت نشد" },
        { status: 404 }
      );
    }

    // Check if user is the creator or has appropriate province-level permission
    const isCreator = user.id === announcement.createdBy.toString();
    const sameProvince =
      user.province &&
      user.province.toString() === announcement.province.toString();

    if (!isCreator && !sameProvince) {
      return NextResponse.json(
        { success: false, message: "شما دسترسی به ویرایش این اطلاعیه ندارید" },
        { status: 403 }
      );
    }

    // Check if this is a multipart/form-data request
    const contentType = request.headers.get("content-type") || "";

    let data;
    let imageUrl = announcement.imageUrl;

    if (contentType.includes("multipart/form-data")) {
      // Handle form data request
      const formData = await request.formData();

      // Process the form data fields
      const title = formData.get("title");
      const content = formData.get("content");
      const priority = formData.get("priority");
      const status = formData.get("status");
      const targetRoles = formData.getAll("targetRoles");
      const targetDistricts = formData.getAll("targetDistricts");

      // Basic validation
      if (!title || !content || !targetRoles || targetRoles.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "عنوان، محتوا و نقش‌های هدف الزامی هستند",
          },
          { status: 400 }
        );
      }

      // Check if there is a new image
      const image = formData.get("image");
      if (image && image.size > 0) {
        // Process the image
        const bytes = await image.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate a unique filename
        const fileName = `announcement_${id}_${Date.now()}.${
          image.type.split("/")[1] || "jpg"
        }`;

        // Define the path to save the image
        const uploadDir = path.join(process.cwd(), "/uploads", "announcements");
        console.log("uploadDir----->", uploadDir);
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);

        // Write the file to the server
        await fs.promises.writeFile(filePath, buffer);

        // Set the image URL to be saved
        imageUrl = `${fileName}`;
      } else if (formData.has("imageUrl")) {
        // Use the existing imageUrl if provided
        imageUrl = formData.get("imageUrl");
      }

      // Update the data object to be saved
      data = {
        title,
        content,
        imageUrl,
        priority,
        status,
        targetRoles,
        targetDistricts: targetDistricts.length > 0 ? targetDistricts : [],
        updatedAt: new Date(),
      };
    } else {
      // Handle JSON request (backwards compatibility)
      data = await request.json();

      // Basic validation
      if (
        !data.title ||
        !data.content ||
        !data.targetRoles ||
        data.targetRoles.length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "عنوان، محتوا و نقش‌های هدف الزامی هستند",
          },
          { status: 400 }
        );
      }
    }

    // Update the announcement
    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: "اطلاعیه با موفقیت بروزرسانی شد",
      announcement: updatedAnnouncement,
    });
  } catch (error) {
    console.error("Error updating announcement:", error);
    return NextResponse.json(
      {
        success: false,
        message: "خطا در بروزرسانی اطلاعیه",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE API endpoint - delete an announcement
export async function DELETE(request, { params }) {
  try {
    // Authenticate user
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "لطفا وارد شوید" },
        { status: 401 }
      );
    }

    // Check permissions - only province roles can delete announcements
    const allowedRoles = [
      ROLES.GENERAL_MANAGER,
      ROLES.PROVINCE_EDUCATION_EXPERT,
      ROLES.PROVINCE_TECH_EXPERT,
    ];

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "شما دسترسی به حذف اطلاعیه ندارید" },
        { status: 403 }
      );
    }

    await connectDB();

    // Get the announcement ID from the URL
    const id = params.id;

    // Find the announcement
    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return NextResponse.json(
        { success: false, message: "اطلاعیه یافت نشد" },
        { status: 404 }
      );
    }

    // Check if user is the creator or has appropriate province-level permission
    const isCreator = user.id === announcement.createdBy.toString();
    const sameProvince =
      user.province &&
      user.province.toString() === announcement.province.toString();

    if (!isCreator && !sameProvince) {
      return NextResponse.json(
        { success: false, message: "شما دسترسی به حذف این اطلاعیه ندارید" },
        { status: 403 }
      );
    }

    // Delete the announcement
    await Announcement.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "اطلاعیه با موفقیت حذف شد",
    });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return NextResponse.json(
      { success: false, message: "خطا در حذف اطلاعیه", error: error.message },
      { status: 500 }
    );
  }
}
