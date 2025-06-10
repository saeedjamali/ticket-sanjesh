import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Form from "@/models/Form";
import FormSubmission from "@/models/FormSubmission";
import District from "@/models/District";
import ExamCenter from "@/models/ExamCenter";
import { authService } from "@/lib/auth/authService";

// GET - دریافت submissions یک فرم
export async function GET(request, { params }) {
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

    const form = await Form.findById(params.id);

    if (!form) {
      return NextResponse.json(
        { success: false, message: "فرم یافت نشد" },
        { status: 404 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const status = searchParams.get("status");
    const skip = (page - 1) * limit;

    // Check permissions
    const canManageForms = [
      "generalManager",
      "provinceEducationExpert",
      "provinceTechExpert",
      "provinceEvalExpert",
    ].includes(user.role);

    let query = { form: params.id };

    if (canManageForms) {
      // Check if user can view this form's submissions
      let canViewSubmissions = false;
      if (user.role === "generalManager") {
        // General Manager can view submissions of all forms from province roles
        canViewSubmissions = [
          "generalManager",
          "provinceEducationExpert",
          "provinceTechExpert",
          "provinceEvalExpert",
        ].includes(form.createdByRole);
      } else {
        // Other managers can only view submissions of forms they created
        canViewSubmissions = form.createdByRole === user.role;
      }

      if (!canViewSubmissions) {
        return NextResponse.json(
          {
            success: false,
            message: "شما مجاز به مشاهده submissions این فرم نیستید",
          },
          { status: 403 }
        );
      }

      // Apply status filter if provided
      if (status) {
        query.status = status;
      }
    } else {
      // Regular users can only see their own submissions
      query.submittedBy = user.id;
    }

    // Count total documents for pagination
    const totalCount = await FormSubmission.countDocuments(query);

    // Fetch submissions
    const submissions = await FormSubmission.find(query)
      .populate("submittedBy", "fullName email")
      .populate("submittedByDistrict", "name")
      .populate("submittedByExamCenter", "name")
      .populate("reviewedBy", "fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      success: true,
      submissions,
      form: {
        _id: form._id,
        title: form.title,
        description: form.description,
        fields: form.fields,
        createdByRole: form.createdByRole,
      },
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching form submissions:", error);
    return NextResponse.json(
      {
        success: false,
        message: "خطا در دریافت submissions",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
