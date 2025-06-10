import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Form from "@/models/Form";
import FormSubmission from "@/models/FormSubmission";
import { authService } from "@/lib/auth/authService";

// POST - ارسال فرم
export async function POST(request, { params }) {
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

    // Check if form is active
    if (form.status !== "active") {
      return NextResponse.json(
        { success: false, message: "این فرم غیرفعال است" },
        { status: 400 }
      );
    }

    // Check if user is in target roles
    if (!form.targetRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "شما مجاز به تکمیل این فرم نیستید" },
        { status: 403 }
      );
    }

    // Check if user already submitted (if multiple submissions not allowed)
    if (!form.settings.allowMultipleSubmissions) {
      const existingSubmission = await FormSubmission.findOne({
        form: params.id,
        submittedBy: user.id,
      });

      if (existingSubmission) {
        return NextResponse.json(
          { success: false, message: "شما قبلاً این فرم را تکمیل کرده‌اید" },
          { status: 400 }
        );
      }
    }

    const body = await request.json();
    const { responses } = body;

    // Validate required fields
    const requiredFields = form.fields.filter((field) => field.required);
    for (const field of requiredFields) {
      const response = responses.find((r) => r.fieldId === field.id);
      if (
        !response ||
        !response.value ||
        response.value === "" ||
        (Array.isArray(response.value) && response.value.length === 0)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `فیلد "${field.label}" الزامی است`,
          },
          { status: 400 }
        );
      }
    }

    // Validate field types and values
    for (const response of responses) {
      const field = form.fields.find((f) => f.id === response.fieldId);
      if (!field) continue;

      // Validate based on field type
      switch (field.type) {
        case "email":
          if (response.value && !/\S+@\S+\.\S+/.test(response.value)) {
            return NextResponse.json(
              {
                success: false,
                message: `فرمت ایمیل در فیلد "${field.label}" صحیح نیست`,
              },
              { status: 400 }
            );
          }
          break;

        case "number":
          if (response.value && isNaN(response.value)) {
            return NextResponse.json(
              {
                success: false,
                message: `مقدار فیلد "${field.label}" باید عدد باشد`,
              },
              { status: 400 }
            );
          }
          // Check min/max validation
          if (field.validation) {
            const numValue = parseFloat(response.value);
            if (field.validation.min && numValue < field.validation.min) {
              return NextResponse.json(
                {
                  success: false,
                  message: `مقدار فیلد "${field.label}" نباید کمتر از ${field.validation.min} باشد`,
                },
                { status: 400 }
              );
            }
            if (field.validation.max && numValue > field.validation.max) {
              return NextResponse.json(
                {
                  success: false,
                  message: `مقدار فیلد "${field.label}" نباید بیشتر از ${field.validation.max} باشد`,
                },
                { status: 400 }
              );
            }
          }
          break;

        case "text":
        case "textarea":
          if (response.value && field.validation) {
            if (
              field.validation.minLength &&
              response.value.length < field.validation.minLength
            ) {
              return NextResponse.json(
                {
                  success: false,
                  message: `طول فیلد "${field.label}" نباید کمتر از ${field.validation.minLength} کاراکتر باشد`,
                },
                { status: 400 }
              );
            }
            if (
              field.validation.maxLength &&
              response.value.length > field.validation.maxLength
            ) {
              return NextResponse.json(
                {
                  success: false,
                  message: `طول فیلد "${field.label}" نباید بیشتر از ${field.validation.maxLength} کاراکتر باشد`,
                },
                { status: 400 }
              );
            }
          }
          break;
      }
    }

    // Create submission
    const submission = new FormSubmission({
      form: params.id,
      submittedBy: user.id,
      submittedByRole: user.role,
      submittedByDistrict: user.district || null,
      submittedByExamCenter: user.examCenter || null,
      responses: responses.map((response) => {
        const field = form.fields.find((f) => f.id === response.fieldId);
        return {
          fieldId: response.fieldId,
          fieldType: field?.type || "unknown",
          fieldLabel: field?.label || "نامشخص",
          value: response.value,
          files: response.files || [],
        };
      }),
      submissionIP: request.headers.get("x-forwarded-for") || "unknown",
      submissionUserAgent: request.headers.get("user-agent") || "unknown",
    });

    await submission.save();

    // Update form statistics
    await Form.findByIdAndUpdate(params.id, {
      $inc: { "stats.totalSubmissions": 1 },
      $set: { "stats.lastSubmissionAt": new Date() },
    });

    return NextResponse.json({
      success: true,
      message: form.settings.successMessage || "فرم با موفقیت ارسال شد",
      submissionId: submission._id,
    });
  } catch (error) {
    console.error("Error submitting form:", error);
    return NextResponse.json(
      { success: false, message: "خطا در ارسال فرم" },
      { status: 500 }
    );
  }
}
