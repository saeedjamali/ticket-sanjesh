import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import FormSubmission from "@/models/FormSubmission";
import District from "@/models/District";
import ExamCenter from "@/models/ExamCenter";
import { authService } from "@/lib/auth/authService";

// GET - دریافت تمام submissions کاربر
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

    // Build query - users can only see their own submissions
    let query = { submittedBy: user.id };

    // Apply status filter if provided
    if (status) {
      query.status = status;
    }

    // Count total documents for pagination
    const totalCount = await FormSubmission.countDocuments(query);

    // Fetch submissions
    const submissions = await FormSubmission.find(query)
      .populate("form", "title description")
      .populate("submittedByDistrict", "name")
      .populate("submittedByExamCenter", "name")
      .populate("reviewedBy", "fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      success: true,
      submissions,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching user submissions:", error);
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
