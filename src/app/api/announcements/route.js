import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import connectDB from "@/lib/db";
import Announcement from "@/models/Announcement";
import ExamCenter from "@/models/ExamCenter";
import { ROLES } from "@/lib/permissions";

// GET API endpoint - fetch announcements
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "active";
    const limit = parseInt(searchParams.get("limit") || "100");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    // Build query based on user role
    const query = { status };

    if (user.role === "generalManager") {
      // General Manager can see all announcements from province roles
      query.createdByRole = {
        $in: [
          "generalManager",
          "provinceEducationExpert",
          "provinceTechExpert",
          "provinceEvalExpert",
        ],
      };
      if (user.province) {
        query.province = user.province;
      }
    } else if (
      [
        "provinceEducationExpert",
        "provinceTechExpert",
        "provinceEvalExpert",
      ].includes(user.role)
    ) {
      // For other province roles - see only announcements they created (by their role)
      query.createdByRole = user.role;
      if (user.province) {
        query.province = user.province;
      }
    } else if (
      [
        "districtEducationExpert",
        "districtTechExpert",
        "districtEvalExpert",
      ].includes(user.role)
    ) {
      // For district experts - see announcements targeted at their role and district
      query.targetRoles = user.role;
      query.targetDistricts = user.district;
    } else if (user.role === "examCenterManager") {
      // For exam center managers - see announcements targeted at their role
      query.targetRoles = user.role;
      if (user.district) {
        query.targetDistricts = user.district;
      }

      // Additional filtering for exam center managers based on their exam center properties
      if (user.examCenter) {
        try {
          const examCenter = await ExamCenter.findById(user.examCenter);
          if (examCenter) {
            // Build additional query conditions for exam center specific filters
            const examCenterQuery = { $and: [] };

            // Gender filter
            examCenterQuery.$and.push({
              $or: [
                { targetGender: { $exists: false } },
                { targetGender: null },
                { targetGender: examCenter.gender },
              ],
            });

            // Period filter
            examCenterQuery.$and.push({
              $or: [
                { targetPeriod: { $exists: false } },
                { targetPeriod: null },
                { targetPeriod: examCenter.period },
              ],
            });

            // Organization type filter
            examCenterQuery.$and.push({
              $or: [
                { targetOrganizationType: { $exists: false } },
                { targetOrganizationType: null },
                { targetOrganizationType: examCenter.organizationType },
              ],
            });

            // Combine with existing query
            query.$and = query.$and
              ? [...query.$and, ...examCenterQuery.$and]
              : examCenterQuery.$and;
          }
        } catch (error) {
          console.error("Error fetching exam center for filtering:", error);
        }
      }
    }

    // Count total documents for pagination
    const totalCount = await Announcement.countDocuments(query);

    // Fetch announcements
    const announcements = await Announcement.find(query)
      .populate("createdBy", "fullName")
      .populate("province", "name")
      .populate("targetDistricts", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Mark announcements as viewed if user is a target
    if (
      [
        "districtEducationExpert",
        "districtTechExpert",
        "districtEvalExpert",
        "examCenterManager",
      ].includes(user.role)
    ) {
      const announcementIds = announcements.map((a) => a._id);

      // Update viewed status for any unviewed announcements
      await Announcement.updateMany(
        {
          _id: { $in: announcementIds },
          "viewedBy.user": { $ne: user.id },
        },
        {
          $addToSet: {
            viewedBy: {
              user: user.id,
              viewedAt: new Date(),
            },
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      announcements,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json(
      {
        success: false,
        message: "خطا در دریافت اطلاعیه‌ها",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// POST API endpoint - create a new announcement
export async function POST(request) {
  try {
    // Authenticate user
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "لطفا وارد شوید" },
        { status: 401 }
      );
    }

    // Check permissions - only province roles can create announcements
    const allowedRoles = [
      ROLES.GENERAL_MANAGER,
      ROLES.PROVINCE_EDUCATION_EXPERT,
      ROLES.PROVINCE_TECH_EXPERT,
      ROLES.PROVINCE_EVAL_EXPERT,
    ];

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "شما دسترسی به ایجاد اطلاعیه ندارید" },
        { status: 403 }
      );
    }

    await connectDB();

    // Check if this is a multipart/form-data request
    const contentType = request.headers.get("content-type") || "";

    let data;
    let imageUrl = null;

    if (contentType.includes("multipart/form-data")) {
      // Handle form data request
      const formData = await request.formData();

      // console.log("formData--------------->", formData);
      // Process the form data fields
      const title = formData.get("title");
      const content = formData.get("content");
      const priority = formData.get("priority");
      const targetRoles = formData.getAll("targetRoles");
      const targetDistricts = formData.getAll("targetDistricts");

      // Get exam center specific filters
      const targetGender = formData.get("targetGender");
      const targetPeriod = formData.get("targetPeriod");
      const targetOrganizationType = formData.get("targetOrganizationType");

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

      // Check if there is an image
      const image = formData.get("image");
      if (image && image.size > 0) {
        // Import required modules for file handling
        const path = await import("path");
        const fs = await import("fs");

        // Process the image
        const bytes = await image.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate a unique filename
        const fileName = `announcement_${new Date().getTime()}.${
          image.type.split("/")[1] || "jpg"
        }`;

        // Define the path to save the image
        const uploadDir = path.default.join(
          process.cwd(),
          "/uploads",
          "announcements"
        );
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.default.join(uploadDir, fileName);

        // Write the file to the server
        await fs.promises.writeFile(filePath, buffer);

        // Set the image URL to be saved
        imageUrl = `/uploads/announcements/${fileName}`;
      }

      // Set the data object for creating the announcement
      data = {
        title,
        content,
        imageUrl,
        priority,
        targetRoles,
        targetDistricts: targetDistricts.length > 0 ? targetDistricts : [],
        targetGender: targetGender || null,
        targetPeriod: targetPeriod || null,
        targetOrganizationType: targetOrganizationType || null,
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

    // Create announcement
    const newAnnouncement = new Announcement({
      title: data.title,
      content: data.content,
      imageUrl: data.imageUrl || null,
      priority: data.priority || "low",
      targetRoles: data.targetRoles,
      targetDistricts: data.targetDistricts || [],
      targetGender: data.targetGender,
      targetPeriod: data.targetPeriod,
      targetOrganizationType: data.targetOrganizationType,
      province: user.province,
      createdBy: user.id,
      createdByRole: user.role,
      status: "active",
    });

    await newAnnouncement.save();

    return NextResponse.json({
      success: true,
      message: "اطلاعیه با موفقیت ایجاد شد",
      announcement: newAnnouncement,
    });
  } catch (error) {
    console.error("Error creating announcement:", error);
    return NextResponse.json(
      { success: false, message: "خطا در ایجاد اطلاعیه", error: error.message },
      { status: 500 }
    );
  }
}
