import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Form from "@/models/Form";
import ExamCenter from "@/models/ExamCenter";
import { verifyToken } from "@/lib/auth";
import { authService } from "@/lib/auth/authService";

// GET - دریافت جزئیات فرم
export async function GET(request, { params }) {
  try {
    await connectDB();

    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { success: false, message: "توکن احراز هویت یافت نشد" },
        { status: 401 }
      );
    }

    const user = await authService.validateToken(request);
    console.log("user-------------->", user);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "توکن نامعتبر است" },
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

    // Check if user can manage forms (for management interface)
    const canManageForms = [
      "generalManager",
      "provinceEducationExpert",
      "provinceTechExpert",
      "provinceEvalExpert",
    ].includes(user.role);

    // Check if user is in target roles (for form submission)
    const isTargetUser = form.targetRoles.includes(user.role);

    // Check if user can view this form
    let canViewForm = false;

    if (canManageForms) {
      // For form managers - check if they can manage this specific form
      if (user.role === "generalManager") {
        // General Manager can view all forms from province roles
        canViewForm = [
          "generalManager",
          "provinceEducationExpert",
          "provinceTechExpert",
          "provinceEvalExpert",
        ].includes(form.createdByRole);
      } else {
        // Other managers can only view forms created by their own role
        canViewForm = form.createdByRole === user.role;
      }
    } else if (isTargetUser) {
      // For target users - check if they meet the form criteria
      canViewForm = true;

      // Additional checks for exam center managers
      if (user.role === "examCenterManager" && user.examCenter) {
        try {
          const examCenter = await ExamCenter.findById(user.examCenter);
          if (examCenter) {
            // Check gender filter
            if (form.targetGender && form.targetGender !== examCenter.gender) {
              canViewForm = false;
            }
            // Check period filter
            if (form.targetPeriod && form.targetPeriod !== examCenter.period) {
              canViewForm = false;
            }
            // Check organization type filter
            if (
              form.targetOrganizationType &&
              form.targetOrganizationType !== examCenter.organizationType
            ) {
              canViewForm = false;
            }
          }
        } catch (error) {
          console.error("Error fetching exam center for validation:", error);
          canViewForm = false;
        }
      }

      // Check district filter for district users
      if (
        [
          "districtEducationExpert",
          "districtTechExpert",
          "districtEvalExpert",
          "examCenterManager",
        ].includes(user.role)
      ) {
        if (form.targetDistricts && form.targetDistricts.length > 0) {
          const userDistrictId = user.district?.toString();
          const targetDistrictIds = form.targetDistricts.map((d) =>
            d.toString()
          );
          if (!targetDistrictIds.includes(userDistrictId)) {
            canViewForm = false;
          }
        }
      }
    }

    if (!canViewForm) {
      return NextResponse.json(
        { success: false, message: "شما اجازه مشاهده این فرم را ندارید" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      form,
    });
  } catch (error) {
    console.error("Error fetching form:", error);
    return NextResponse.json(
      { success: false, message: "خطا در دریافت فرم" },
      { status: 500 }
    );
  }
}

// PUT - ویرایش فرم
export async function PUT(request, { params }) {
  try {
    await connectDB();

    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { success: false, message: "توکن احراز هویت یافت نشد" },
        { status: 401 }
      );
    }

    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "توکن نامعتبر است" },
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

    if (!canManageForms) {
      return NextResponse.json(
        { success: false, message: "شما اجازه دسترسی به این بخش را ندارید" },
        { status: 403 }
      );
    }

    const form = await Form.findById(params.id);

    if (!form) {
      return NextResponse.json(
        { success: false, message: "فرم یافت نشد" },
        { status: 404 }
      );
    }

    // Check if user can edit this form
    let canEditForm = false;
    if (user.role === "generalManager") {
      // General Manager can edit all forms from province roles in their province
      canEditForm = [
        "generalManager",
        "provinceEducationExpert",
        "provinceTechExpert",
        "provinceEvalExpert",
      ].includes(form.createdByRole);
    } else {
      // Other managers can only edit forms they created
      canEditForm = form.createdByRole === user.role;
    }

    if (!canEditForm) {
      return NextResponse.json(
        { success: false, message: "شما اجازه ویرایش این فرم را ندارید" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { success: false, message: "عنوان فرم الزامی است" },
        { status: 400 }
      );
    }

    if (!body.fields || body.fields.length === 0) {
      return NextResponse.json(
        { success: false, message: "حداقل یک فیلد برای فرم الزامی است" },
        { status: 400 }
      );
    }

    if (!body.targetRoles || body.targetRoles.length === 0) {
      return NextResponse.json(
        { success: false, message: "انتخاب گروه هدف الزامی است" },
        { status: 400 }
      );
    }

    // Update form
    const updatedForm = await Form.findByIdAndUpdate(
      params.id,
      {
        title: body.title.trim(),
        description: body.description?.trim() || "",
        status: body.status || "draft",
        targetRoles: body.targetRoles,
        targetDistricts: body.targetDistricts || [],
        targetGender: body.targetGender || null,
        targetPeriod: body.targetPeriod || null,
        targetOrganizationType: body.targetOrganizationType || null,
        fields: body.fields,
        settings: {
          allowMultipleSubmissions:
            body.settings?.allowMultipleSubmissions || false,
          showProgressBar: body.settings?.showProgressBar !== false,
          submitButtonText: body.settings?.submitButtonText || "ارسال فرم",
          successMessage:
            body.settings?.successMessage || "فرم با موفقیت ارسال شد",
          requireLogin: body.settings?.requireLogin !== false,
        },
        updatedAt: new Date(),
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: "فرم با موفقیت بروزرسانی شد",
      form: updatedForm,
    });
  } catch (error) {
    console.error("Error updating form:", error);
    return NextResponse.json(
      { success: false, message: "خطا در بروزرسانی فرم" },
      { status: 500 }
    );
  }
}

// DELETE - حذف فرم
export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { success: false, message: "توکن احراز هویت یافت نشد" },
        { status: 401 }
      );
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "توکن نامعتبر است" },
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

    if (!canManageForms) {
      return NextResponse.json(
        { success: false, message: "شما اجازه دسترسی به این بخش را ندارید" },
        { status: 403 }
      );
    }

    const form = await Form.findById(params.id);

    if (!form) {
      return NextResponse.json(
        { success: false, message: "فرم یافت نشد" },
        { status: 404 }
      );
    }

    // Check if user can delete this form
    let canDeleteForm = false;
    if (user.role === "generalManager") {
      // General Manager can delete all forms from province roles in their province
      canDeleteForm = [
        "generalManager",
        "provinceEducationExpert",
        "provinceTechExpert",
        "provinceEvalExpert",
      ].includes(form.createdByRole);
    } else {
      // Other managers can only delete forms they created
      canDeleteForm = form.createdByRole === user.role;
    }

    if (!canDeleteForm) {
      return NextResponse.json(
        { success: false, message: "شما اجازه حذف این فرم را ندارید" },
        { status: 403 }
      );
    }

    await Form.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: "فرم با موفقیت حذف شد",
    });
  } catch (error) {
    console.error("Error deleting form:", error);
    return NextResponse.json(
      { success: false, message: "خطا در حذف فرم" },
      { status: 500 }
    );
  }
}
