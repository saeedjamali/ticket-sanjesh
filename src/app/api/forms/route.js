import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import connectDB from "@/lib/db";
import Form from "@/models/Form";
import ExamCenter from "@/models/ExamCenter";

// GET API endpoint - fetch forms
export async function GET(request) {
  try {
    await connectDB();

    // Authenticate user
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "لطفا وارد شوید" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const status = searchParams.get("status");
    const skip = (page - 1) * limit;

    // Build query based on user role
    let query = {};

    // Check if user can manage forms
    const canManageForms = [
      "generalManager",
      "provinceEducationExpert",
      "provinceTechExpert",
      "provinceEvalExpert",
    ].includes(user.role);

    if (canManageForms) {
      // For form managers - show forms they can manage
      if (user.role === "generalManager") {
        // General Manager can see all forms created by province roles in their province
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
        // For other province roles - see only forms they created (by their role)
        query.createdByRole = user.role;
        if (user.province) {
          query.province = user.province;
        }
      }
    } else {
      // For target users - show forms they can submit
      query.targetRoles = user.role;
      query.status = "active"; // Only show active forms to target users

      if (
        [
          "districtEducationExpert",
          "districtTechExpert",
          "districtEvalExpert",
        ].includes(user.role)
      ) {
        // For district experts - see forms targeted at their role and district
        if (user.district) {
          query.$or = [
            { targetDistricts: { $exists: false } },
            { targetDistricts: { $size: 0 } },
            { targetDistricts: user.district },
          ];
        }
      } else if (user.role === "examCenterManager") {
        // For exam center managers - see forms targeted at their role
        if (user.district) {
          query.$or = [
            { targetDistricts: { $exists: false } },
            { targetDistricts: { $size: 0 } },
            { targetDistricts: user.district },
          ];
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
    }

    // Apply status filter if provided (only for managers)
    if (status && canManageForms) {
      query.status = status;
    }

    // Count total documents for pagination
    const totalCount = await Form.countDocuments(query);

    // Fetch forms
    const forms = await Form.find(query)
      .populate("createdBy", "fullName role")
      .populate("province", "name")
      .populate("targetDistricts", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // For target users, check submission status for each form
    let formsWithSubmissionStatus = forms;
    if (!canManageForms) {
      const FormSubmission = (await import("@/models/FormSubmission")).default;

      formsWithSubmissionStatus = await Promise.all(
        forms.map(async (form) => {
          const formObj = form.toObject();

          // Check if user has submitted this form
          const existingSubmission = await FormSubmission.findOne({
            form: form._id,
            submittedBy: user.id,
          });

          formObj.hasSubmitted = !!existingSubmission;
          formObj.submissionStatus = existingSubmission?.status || null;
          formObj.submissionId = existingSubmission?._id || null;

          return formObj;
        })
      );
    }

    return NextResponse.json({
      success: true,
      forms: formsWithSubmissionStatus,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching forms:", error);
    return NextResponse.json(
      {
        success: false,
        message: "خطا در دریافت فرم‌ها",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// POST API endpoint - create a new form
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

    // Check permissions - only province roles can create forms
    const allowedRoles = [
      "generalManager",
      "provinceEducationExpert",
      "provinceTechExpert",
      "provinceEvalExpert",
    ];

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "شما دسترسی به ایجاد فرم ندارید" },
        { status: 403 }
      );
    }

    await connectDB();

    const data = await request.json();

    // Basic validation
    if (
      !data.title ||
      !data.targetRoles ||
      data.targetRoles.length === 0 ||
      !data.fields ||
      data.fields.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "عنوان، نقش‌های هدف و فیلدهای فرم الزامی هستند",
        },
        { status: 400 }
      );
    }

    // Create form
    const newForm = new Form({
      title: data.title,
      description: data.description || "",
      status: data.status || "draft",
      targetRoles: data.targetRoles,
      targetDistricts: data.targetDistricts || [],
      targetGender: data.targetGender,
      targetPeriod: data.targetPeriod,
      targetOrganizationType: data.targetOrganizationType,
      fields: data.fields,
      settings: data.settings || {},
      province: user.province,
      createdBy: user.id,
      createdByRole: user.role,
    });

    await newForm.save();

    return NextResponse.json({
      success: true,
      message: "فرم با موفقیت ایجاد شد",
      form: newForm,
    });
  } catch (error) {
    console.error("Error creating form:", error);
    return NextResponse.json(
      { success: false, message: "خطا در ایجاد فرم", error: error.message },
      { status: 500 }
    );
  }
}
