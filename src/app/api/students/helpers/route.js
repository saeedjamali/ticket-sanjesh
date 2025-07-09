import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import CourseGrade from "@/models/CourseGrade";
import CourseBranchField from "@/models/CourseBranchField";
import AcademicYear from "@/models/AcademicYear";
import { verifyJWT } from "@/lib/auth/tokenService";
import { authService } from "@/lib/auth/authService";

// GET - دریافت اطلاعات کمکی برای فرم دانش‌آموز
export async function GET(request) {
  try {
    await dbConnect();
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }
    // دریافت اطلاعات کاربر همراه با واحد سازمانی و منطقه
    const users = await User.findById(user.id)
      .populate({
        path: "examCenter",
        populate: [{ path: "course" }, { path: "branch" }],
      })
      .populate("district");

    console.log("User found:", !!users);

    if (!users) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    }

    // بررسی اینکه کاربر مدیر واحد سازمانی باشد
    if (users.role !== "examCenterManager") {
      return NextResponse.json(
        { error: "شما مدیر واحد سازمانی نیستید" },
        { status: 403 }
      );
    }

    if (!users.examCenter) {
      return NextResponse.json(
        { error: "شما به واحد سازمانی متصل نیستید" },
        { status: 403 }
      );
    }

    if (!users.district) {
      return NextResponse.json(
        { error: "شما به منطقه متصل نیستید" },
        { status: 403 }
      );
    }

    const examCenter = users.examCenter;
    console.log("ExamCenter raw:", examCenter);
    console.log("ExamCenter details:", {
      name: examCenter.name,
      code: examCenter.code,
      course: examCenter.course ? examCenter.course.courseCode : "null",
      branch: examCenter.branch ? examCenter.branch.branchCode : "null",
      userDistrict: users.district ? users.district.code : "null",
    });

    if (!examCenter.course || !examCenter.branch) {
      return NextResponse.json(
        {
          error:
            "واحد سازمانی شما اطلاعات کاملی ندارد (دوره یا شاخه تعین نشده)",
        },
        { status: 400 }
      );
    }

    // دریافت پایه‌های تحصیلی مربوط به دوره واحد سازمانی
    const grades = await CourseGrade.find({
      courseCode: examCenter.course.courseCode,
      isActive: true,
    })
      .select("gradeCode gradeName courseCode courseName")
      .sort({ gradeCode: 1 })
      .lean();

    console.log("Grades found:", grades.length);

    // دریافت رشته‌های تحصیلی مربوط به دوره و شاخه واحد سازمانی
    const fields = await CourseBranchField.find({
      courseCode: examCenter.course.courseCode,
      branchCode: examCenter.branch.branchCode,
      isActive: true,
    })
      .select(
        "fieldCode fieldTitle branchCode branchTitle courseCode courseTitle"
      )
      .sort({ fieldCode: 1 })
      .lean();

    console.log("Fields found:", fields.length);

    // دریافت سال تحصیلی فعال
    const activeAcademicYear = await AcademicYear.findOne({ isActive: true })
      .select("name")
      .lean();

    console.log("Active academic year:", activeAcademicYear?.name);

    // دریافت همه سال‌های تحصیلی برای فیلتر
    const academicYears = await AcademicYear.find({})
      .select("name isActive")
      .sort({ name: -1 })
      .lean();

    // نوع‌های دانش‌آموز
    const studentTypes = [
      { value: "normal", label: "عادی" },
      { value: "adult", label: "بزرگسال" },
    ];

    // جنسیت‌ها (hardcode شده)
    const genders = [
      { value: "male", label: "پسر" },
      { value: "female", label: "دختر" },
    ];

    console.log("Genders hardcoded:", genders.length);

    const response = {
      examCenterInfo: {
        name: examCenter.name || "نامشخص",
        code: examCenter.code || "نامشخص",
        districtCode: users.district?.code || "نامشخص",
        course: {
          courseCode: examCenter.course?.courseCode || "نامشخص",
          courseName: examCenter.course?.courseName || "نامشخص",
        },
        branch: {
          branchCode: examCenter.branch?.branchCode || "نامشخص",
          branchTitle: examCenter.branch?.branchTitle || "نامشخص",
        },
      },
      grades,
      fields,
      genders,
      studentTypes,
      activeAcademicYear: activeAcademicYear?.name || null,
      academicYears,
    };

    console.log("Final response - genders count:", response.genders.length);
    console.log("Final response - grades count:", response.grades.length);
    console.log("Final response - fields count:", response.fields.length);
    console.log("Final response - examCenterInfo:", response.examCenterInfo);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in students helpers API:", error);
    return NextResponse.json(
      { error: "خطا در دریافت اطلاعات کمکی: " + error.message },
      { status: 500 }
    );
  }
}
