import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/authService";
import connectDB from "@/lib/db";
import Form from "@/models/Form";
import ExamCenter from "@/models/ExamCenter";

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

    // Check if user can manage forms
    const canManageForms = [
      "generalManager",
      "provinceEducationExpert",
      "provinceTechExpert",
      "provinceEvalExpert",
    ].includes(user.role);

    // If user can manage forms, return 0 (they don't have pending forms to submit)
    if (canManageForms) {
      return NextResponse.json({
        success: true,
        count: 0,
      });
    }

    // Build query for target users
    let query = {
      targetRoles: user.role,
      status: "active", // Only active forms
    };

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

    // Get all forms that match the criteria
    const allForms = await Form.find(query).select("_id");

    // Check which forms haven't been submitted by this user
    const FormSubmission = (await import("@/models/FormSubmission")).default;

    const submittedFormIds = await FormSubmission.find({
      submittedBy: user.id,
      form: { $in: allForms.map((f) => f._id) },
    }).distinct("form");

    // Count pending forms (forms that haven't been submitted)
    const pendingCount = allForms.length - submittedFormIds.length;

    return NextResponse.json({
      success: true,
      count: pendingCount,
    });
  } catch (error) {
    console.error("Error counting pending forms:", error);
    return NextResponse.json(
      {
        success: false,
        message: "خطا در شمارش فرم‌های در انتظار",
      },
      { status: 500 }
    );
  }
}
