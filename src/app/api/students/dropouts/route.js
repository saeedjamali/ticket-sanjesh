import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Student from "@/models/Student";
import StudentDropout from "@/models/StudentDropout";
import AcademicYear from "@/models/AcademicYear";
import { authService } from "@/lib/auth/authService";
import CourseGrade from "@/models/CourseGrade";
import CourseBranchField from "@/models/CourseBranchField";

// GET - دریافت لیست دانش‌آموزان بازمانده از تحصیل
export async function GET(request) {
  try {
    await dbConnect();

    const userValid = await authService.validateToken(request);
    if (!userValid) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    // فقط مدیران واحد سازمانی دسترسی دارند
    if (userValid.role !== "examCenterManager") {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    // دریافت سال تحصیلی فعال و قبلی
    const currentAcademicYear = await AcademicYear.findOne({ isActive: true });
    if (!currentAcademicYear) {
      return NextResponse.json(
        { success: false, error: "سال تحصیلی فعال یافت نشد" },
        { status: 400 }
      );
    }

    // پیدا کردن سال قبلی
    const allAcademicYears = await AcademicYear.find({}).sort({ name: -1 });
    const currentIndex = allAcademicYears.findIndex((year) => year.isActive);
    const previousAcademicYear = allAcademicYears[currentIndex + 1];

    if (!previousAcademicYear) {
      return NextResponse.json(
        { success: false, error: "سال تحصیلی قبلی یافت نشد" },
        { status: 400 }
      );
    }

    console.log("Current year:", currentAcademicYear.name);
    console.log("Previous year:", previousAcademicYear.name);
    console.log("User exam center ID:", userValid.examCenter);

    // دریافت اطلاعات مرکز امتحانات کاربر
    const ExamCenter = (await import("@/models/ExamCenter")).default;
    const examCenter = await ExamCenter.findById(userValid.examCenter);

    if (!examCenter) {
      return NextResponse.json(
        { success: false, error: "واحد سازمانی یافت نشد" },
        { status: 404 }
      );
    }

    console.log("Exam center code:", examCenter.code);

    // دریافت دانش‌آموزان سال قبل این واحد سازمانی
    const previousYearStudents = await Student.find({
      organizationalUnitCode: examCenter.code,
      academicYear: previousAcademicYear.name,
    }).select(
      "nationalId firstName lastName fatherName grade gradeCode field academicYear examCenter"
    );

    console.log(
      `Found ${previousYearStudents.length} students in previous year`
    );

    if (previousYearStudents.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "هیچ دانش‌آموزی در سال قبل یافت نشد",
      });
    }

    // استخراج کدهای ملی دانش‌آموزان سال قبل
    const previousYearNationalIds = previousYearStudents.map(
      (student) => student.nationalId
    );

    // دریافت دانش‌آموزانی که در سال جاری در هیچ جا ثبت نام نکرده‌اند
    const currentYearStudents = await Student.find({
      nationalId: { $in: previousYearNationalIds },
      academicYear: currentAcademicYear.name,
    }).select("nationalId");

    const currentYearNationalIds = currentYearStudents.map(
      (student) => student.nationalId
    );

    console.log(
      `Found ${currentYearStudents.length} students who registered in current year`
    );

    // دانش‌آموزان بازمانده = کسانی که در سال قبل بودند اما در سال جاری نیستند
    const dropoutStudents = previousYearStudents.filter(
      (student) => !currentYearNationalIds.includes(student.nationalId)
    );

    console.log(`Found ${dropoutStudents.length} dropout students`);

    // دریافت علت‌های ثبت شده برای این دانش‌آموزان
    const existingDropouts = await StudentDropout.find({
      studentId: { $in: dropoutStudents.map((s) => s._id) },
      previousAcademicYear: previousAcademicYear.name,
    }).populate("dropoutReason", "code title");

    // ایجاد map برای دسترسی سریع به علت‌های ثبت شده
    const dropoutReasonsMap = {};
    existingDropouts.forEach((dropout) => {
      dropoutReasonsMap[dropout.studentId.toString()] = {
        reason: dropout.dropoutReason,
        description: dropout.description,
        status: dropout.status,
        registeredAt: dropout.registeredAt,
      };
    });

    // دریافت عناوین پایه و رشته
    const gradeCodes = [...new Set(dropoutStudents.map((s) => s.gradeCode))];
    const fieldCodes = [...new Set(dropoutStudents.map((s) => s.fieldCode))];

    const [grades, fields] = await Promise.all([
      CourseGrade.find({ gradeCode: { $in: gradeCodes } })
        .select("gradeCode gradeName")
        .lean(),
      CourseBranchField.find({ fieldCode: { $in: fieldCodes } })
        .select("fieldCode fieldTitle")
        .lean(),
    ]);

    // ایجاد نقشه برای دسترسی سریع به عناوین
    const gradeMap = grades.reduce((acc, grade) => {
      acc[grade.gradeCode] = grade.gradeName;
      return acc;
    }, {});

    const fieldMap = fields.reduce((acc, field) => {
      acc[field.fieldCode] = field.fieldTitle;
      return acc;
    }, {});

    // تبدیل به فرمت مناسب برای نمایش
    const result = dropoutStudents.map((student) => ({
      _id: student._id.toString(),
      nationalId: student.nationalId,
      firstName: student.firstName,
      lastName: student.lastName,
      fatherName: student.fatherName,
      previousGrade: student.gradeCode || "نامشخص",
      previousGradeTitle: gradeMap[student.gradeCode] || "نامشخص",
      previousField: student.fieldCode || "نامشخص",
      previousFieldTitle: fieldMap[student.fieldCode] || "نامشخص",
      previousAcademicYear: student.academicYear,
      dropoutInfo: dropoutReasonsMap[student._id.toString()] || null,
    }));

    return NextResponse.json({
      success: true,
      data: result,
      summary: {
        previousYearTotal: previousYearStudents.length,
        currentYearRegistered: currentYearStudents.length,
        dropoutCount: dropoutStudents.length,
        withReasonCount: existingDropouts.length,
      },
    });
  } catch (error) {
    console.error("Error fetching dropout students:", error);
    return NextResponse.json(
      { success: false, error: "خطا در دریافت دانش‌آموزان بازمانده از تحصیل" },
      { status: 500 }
    );
  }
}

// POST - ثبت علت بازمانده برای دانش‌آموز
export async function POST(request) {
  try {
    await dbConnect();

    const userValid = await authService.validateToken(request);
    if (!userValid) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    // فقط مدیران واحد سازمانی دسترسی دارند
    if (userValid.role !== "examCenterManager") {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    const { studentId, dropoutReasonId, description } = await request.json();

    if (!studentId || !dropoutReasonId) {
      return NextResponse.json(
        { success: false, error: "شناسه دانش‌آموز و علت بازمانده الزامی است" },
        { status: 400 }
      );
    }

    // دریافت اطلاعات دانش‌آموز
    const student = await Student.findById(studentId);
    if (!student) {
      return NextResponse.json(
        { success: false, error: "دانش‌آموز یافت نشد" },
        { status: 404 }
      );
    }

    // دریافت اطلاعات مرکز امتحانات کاربر
    const ExamCenter = (await import("@/models/ExamCenter")).default;
    const examCenter = await ExamCenter.findById(userValid.examCenter);

    if (!examCenter) {
      return NextResponse.json(
        { success: false, error: "واحد سازمانی یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی اینکه دانش‌آموز متعلق به همین واحد سازمانی باشد
    const studentExamCenterCode = student.organizationalUnitCode || null;
    const userExamCenterCode = examCenter.code || null;

    if (studentExamCenterCode !== userExamCenterCode) {
      return NextResponse.json(
        {
          success: false,
          error: "این دانش‌آموز متعلق به واحد سازمانی شما نیست",
        },
        { status: 403 }
      );
    }

    // دریافت سال تحصیلی قبلی
    const allAcademicYears = await AcademicYear.find({}).sort({ name: -1 });
    const currentIndex = allAcademicYears.findIndex((year) => year.isActive);
    const previousAcademicYear = allAcademicYears[currentIndex + 1];

    if (!previousAcademicYear) {
      return NextResponse.json(
        { success: false, error: "سال تحصیلی قبلی یافت نشد" },
        { status: 400 }
      );
    }

    // بررسی وجود ثبت قبلی
    const existingDropout = await StudentDropout.findOne({
      studentId: studentId,
      previousAcademicYear: previousAcademicYear.name,
    });

    if (existingDropout) {
      // به‌روزرسانی ثبت موجود
      existingDropout.dropoutReason = dropoutReasonId;
      existingDropout.description = description || "";
      existingDropout.registeredBy = userValid.id;
      existingDropout.registeredAt = new Date();

      await existingDropout.save();

      const updatedDropout = await StudentDropout.findById(existingDropout._id)
        .populate("dropoutReason", "code title")
        .populate("registeredBy", "firstName lastName");

      return NextResponse.json({
        success: true,
        message: "علت بازمانده با موفقیت به‌روزرسانی شد",
        data: updatedDropout,
      });
    } else {
      // ایجاد ثبت جدید
      const newDropout = new StudentDropout({
        studentId: studentId,
        nationalId: student.nationalId,
        firstName: student.firstName,
        lastName: student.lastName,
        fatherName: student.fatherName,
        previousAcademicYear: previousAcademicYear.name,
        previousExamCenter: student.examCenter || userValid.examCenter,
        previousGrade: student.gradeCode || "نامشخص",
        previousField: student.fieldCode || "نامشخص",
        dropoutReason: dropoutReasonId,
        description: description || "",
        registeredBy: userValid.id,
      });

      await newDropout.save();

      const savedDropout = await StudentDropout.findById(newDropout._id)
        .populate("dropoutReason", "code title")
        .populate("registeredBy", "firstName lastName");

      return NextResponse.json({
        success: true,
        message: "علت بازمانده با موفقیت ثبت شد",
        data: savedDropout,
      });
    }
  } catch (error) {
    console.error("Error saving dropout reason:", error);
    return NextResponse.json(
      { success: false, error: "خطا در ثبت علت بازمانده از تحصیل" },
      { status: 500 }
    );
  }
}
