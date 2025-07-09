import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Student from "@/models/Student";
import User from "@/models/User";
import AcademicYear from "@/models/AcademicYear";
import CourseGrade from "@/models/CourseGrade";
import CourseBranchField from "@/models/CourseBranchField";
import { authService } from "@/lib/auth/authService";

// GET - دریافت اطلاعات یک دانش‌آموز خاص
export async function GET(request, { params }) {
  try {
    await dbConnect();

    const userValid = await authService.validateToken(request);
    if (!userValid) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    const user = await User.findById(userValid.id).populate("examCenter");
    if (!user || user.role !== "examCenterManager" || !user.examCenter) {
      return NextResponse.json({ error: "دسترسی محدود" }, { status: 403 });
    }

    const { id } = await params;

    // یافتن دانش‌آموز و بررسی تعلق آن به واحد سازمانی کاربر
    const student = await Student.findOne({
      _id: id,
      organizationalUnitCode: user.examCenter.code,
    }).lean();

    if (!student) {
      return NextResponse.json(
        { error: "دانش‌آموز یافت نشد یا دسترسی ندارید" },
        { status: 404 }
      );
    }

    // دریافت نام‌های کامل پایه و رشته
    const [grade, field] = await Promise.all([
      CourseGrade.findOne({ gradeCode: student.gradeCode })
        .select("gradeCode gradeName courseCode courseName")
        .lean(),
      CourseBranchField.findOne({ fieldCode: student.fieldCode })
        .select(
          "fieldCode fieldTitle branchCode branchTitle courseCode courseTitle"
        )
        .lean(),
    ]);

    // اضافه کردن نام‌ها به داده‌های دانش‌آموز
    const studentWithNames = {
      ...student,
      gradeName: grade?.gradeName || student.gradeCode,
      courseName: grade?.courseName || student.academicCourse,
      fieldName: field?.fieldTitle || student.fieldCode,
      branchName: field?.branchTitle || "",
      genderName: student.gender === "male" ? "پسر" : "دختر",
      studentTypeName: student.studentType === "normal" ? "عادی" : "بزرگسال",
    };

    return NextResponse.json({ student: studentWithNames });
  } catch (error) {
    console.error("Error fetching student:", error);
    return NextResponse.json(
      { error: "خطا در دریافت اطلاعات دانش‌آموز" },
      { status: 500 }
    );
  }
}

// PUT - بروزرسانی اطلاعات دانش‌آموز
export async function PUT(request, { params }) {
  try {
    await dbConnect();

    const userValid = await authService.validateToken(request);
    if (!userValid) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    const user = await User.findById(userValid.id).populate("examCenter");
    if (!user || user.role !== "examCenterManager" || !user.examCenter) {
      return NextResponse.json({ error: "دسترسی محدود" }, { status: 403 });
    }

    const { id } = await params;
    const data = await request.json();

    // یافتن دانش‌آموز و بررسی تعلق آن به واحد سازمانی کاربر
    const existingStudent = await Student.findOne({
      _id: id,
      organizationalUnitCode: user.examCenter.code,
    });

    if (!existingStudent) {
      return NextResponse.json(
        { error: "دانش‌آموز یافت نشد یا دسترسی ندارید" },
        { status: 404 }
      );
    }

    // اعتبارسنجی فیلدهای الزامی
    const requiredFields = [
      "nationalId",
      "firstName",
      "lastName",
      "fatherName",
      "birthDate",
      "gender",
      "gradeCode",
      "fieldCode",
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `فیلد ${field} الزامی است` },
          { status: 400 }
        );
      }
    }

    // اعتبارسنجی کد ملی
    if (!/^\d{10}$/.test(data.nationalId)) {
      return NextResponse.json(
        { error: "کد ملی باید 10 رقم باشد" },
        { status: 400 }
      );
    }

    // بررسی تکراری بودن کد ملی (اگر تغییر کرده باشد)
    if (data.nationalId !== existingStudent.nationalId) {
      const duplicateStudent = await Student.findOne({
        nationalId: data.nationalId,
        academicYear: existingStudent.academicYear,
        _id: { $ne: id },
      });

      if (duplicateStudent) {
        return NextResponse.json(
          { error: "دانش‌آموزی با این کد ملی در سال تحصیلی جاری وجود دارد" },
          { status: 400 }
        );
      }
    }

    // داده‌های قابل بروزرسانی
    const updateData = {
      nationalId: data.nationalId,
      firstName: data.firstName,
      lastName: data.lastName,
      fatherName: data.fatherName,
      birthDate: data.birthDate,
      gender: data.gender,
      nationality: data.nationality || "ایرانی",
      mobile: data.mobile || "",
      address: data.address || "",
      gradeCode: data.gradeCode,
      fieldCode: data.fieldCode,
      studentType: data.studentType || "normal",
      updatedBy: user._id,
    };

    const updatedStudent = await Student.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return NextResponse.json({
      message: "اطلاعات دانش‌آموز با موفقیت بروزرسانی شد",
      student: updatedStudent,
    });
  } catch (error) {
    console.error("Error updating student:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: "دانش‌آموزی با این کد ملی قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "خطا در بروزرسانی دانش‌آموز: " + error.message },
      { status: 500 }
    );
  }
}
