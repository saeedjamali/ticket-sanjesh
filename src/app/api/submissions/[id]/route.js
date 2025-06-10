import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import FormSubmission from "@/models/FormSubmission";
import District from "@/models/District";
import ExamCenter from "@/models/ExamCenter";
import { authService } from "@/lib/auth/authService";

// GET - دریافت جزئیات یک submission
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

    const submission = await FormSubmission.findById(params.id)
      .populate("form", "title description fields createdByRole")
      .populate("submittedBy", "fullName email")
      .populate("submittedByDistrict", "name")
      .populate("submittedByExamCenter", "name")
      .populate("reviewedBy", "fullName");

    if (!submission) {
      return NextResponse.json(
        { success: false, message: "submission یافت نشد" },
        { status: 404 }
      );
    }

    // Check permissions
    const canManageForms = [
      "generalManager",
      "provinceEducationExpert",
      "provinceTechExpert",
      "provinceEvalExpert",
    ].includes(user.role);

    const isOwner = submission.submittedBy._id.toString() === user.id;

    if (!isOwner && !canManageForms) {
      return NextResponse.json(
        { success: false, message: "شما مجاز به مشاهده این submission نیستید" },
        { status: 403 }
      );
    }

    // If user is a form manager, check if they can manage the form
    if (canManageForms && !isOwner) {
      const form = submission.form;
      const canManageThisForm =
        (user.role === "generalManager" &&
          [
            "generalManager",
            "provinceEducationExpert",
            "provinceTechExpert",
            "provinceEvalExpert",
          ].includes(form.createdByRole)) ||
        form.createdByRole === user.role;

      if (!canManageThisForm) {
        return NextResponse.json(
          {
            success: false,
            message: "شما مجاز به مشاهده این submission نیستید",
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      submission,
    });
  } catch (error) {
    console.error("Error fetching submission:", error);
    return NextResponse.json(
      {
        success: false,
        message: "خطا در دریافت submission",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
