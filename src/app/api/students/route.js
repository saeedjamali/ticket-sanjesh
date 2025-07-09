import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Student from "@/models/Student";
import User from "@/models/User";
import AcademicYear from "@/models/AcademicYear";
import CourseGrade from "@/models/CourseGrade";
import CourseBranchField from "@/models/CourseBranchField";
import { verifyJWT } from "@/lib/auth/tokenService";
import { authService } from "@/lib/auth/authService";

// GET - دریافت فهرست دانش‌آموزان
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

    const user = await User.findById(userValid.id).populate("examCenter");

    if (!user || user.role !== "examCenterManager" || !user.examCenter) {
      return NextResponse.json({ error: "دسترسی محدود" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const grade =
      searchParams.get("grade") || searchParams.get("gradeCode") || "";
    const field =
      searchParams.get("field") || searchParams.get("fieldCode") || "";
    const gender = searchParams.get("gender") || "";
    const academicYear = searchParams.get("academicYear") || "";

    // ساخت فیلتر
    const filter = {
      organizationalUnitCode: user.examCenter.code,
    };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { nationalId: { $regex: search, $options: "i" } },
      ];
    }

    if (grade) {
      filter.gradeCode = grade;
    }

    if (field) {
      filter.fieldCode = field;
    }

    if (gender) {
      filter.gender = gender;
    }

    if (academicYear) {
      filter.academicYear = academicYear;
    }

    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      Student.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Student.countDocuments(filter),
    ]);

    // دریافت نام‌های پایه و رشته برای نمایش در لیست
    const gradeCodes = [...new Set(students.map((s) => s.gradeCode))];
    const fieldCodes = [...new Set(students.map((s) => s.fieldCode))];

    const [grades, fields] = await Promise.all([
      CourseGrade.find({ gradeCode: { $in: gradeCodes } })
        .select("gradeCode gradeName")
        .lean(),
      CourseBranchField.find({ fieldCode: { $in: fieldCodes } })
        .select("fieldCode fieldTitle")
        .lean(),
    ]);

    // ایجاد نقشه برای جستجوی سریع
    const gradeMap = grades.reduce((acc, grade) => {
      acc[grade.gradeCode] = grade.gradeName;
      return acc;
    }, {});

    const fieldMap = fields.reduce((acc, field) => {
      acc[field.fieldCode] = field.fieldTitle;
      return acc;
    }, {});

    // اضافه کردن نام‌ها به داده‌های دانش‌آموزان
    const studentsWithNames = students.map((student) => ({
      ...student,
      gradeName: gradeMap[student.gradeCode] || student.gradeCode,
      fieldName: fieldMap[student.fieldCode] || student.fieldCode,
      genderName: student.gender === "male" ? "پسر" : "دختر",
      studentTypeName: student.studentType === "normal" ? "عادی" : "بزرگسال",
    }));

    return NextResponse.json({
      students: studentsWithNames,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { error: "خطا در دریافت دانش‌آموزان" },
      { status: 500 }
    );
  }
}

// POST - ایجاد دانش‌آموز جدید
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

    const user = await User.findById(userValid.id)
      .populate({
        path: "examCenter",
        populate: [{ path: "course" }],
      })
      .populate("district");

    if (!user || user.role !== "examCenterManager" || !user.examCenter) {
      return NextResponse.json({ error: "دسترسی محدود" }, { status: 403 });
    }

    const data = await request.json();

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

    // دریافت سال تحصیلی فعال
    const activeAcademicYear = await AcademicYear.findOne({ isActive: true });
    if (!activeAcademicYear) {
      return NextResponse.json(
        { error: "سال تحصیلی فعالی یافت نشد" },
        { status: 400 }
      );
    }

    // بررسی تکراری بودن کد ملی در همان سال تحصیلی
    const existingStudent = await Student.findOne({
      nationalId: data.nationalId,
      academicYear: activeAcademicYear.name,
    });

    if (existingStudent) {
      return NextResponse.json(
        { error: "دانش‌آموزی با این کد ملی در سال تحصیلی جاری وجود دارد" },
        { status: 400 }
      );
    }

    // ایجاد دانش‌آموز جدید
    const studentData = {
      nationalId: data.nationalId,
      firstName: data.firstName,
      lastName: data.lastName,
      fatherName: data.fatherName,
      birthDate: data.birthDate,
      gender: data.gender, // "male" یا "female"
      nationality: data.nationality || "ایرانی",
      mobile: data.mobile || "",
      address: data.address || "",
      academicCourse: user.examCenter.course.courseName,
      gradeCode: data.gradeCode,
      fieldCode: data.fieldCode,
      studentType: data.studentType || "normal",
      districtCode: user.district.code,
      organizationalUnitCode: user.examCenter.code,
      academicYear: activeAcademicYear.name,
      createdBy: user._id,
    };

    const student = new Student(studentData);
    await student.save();

    return NextResponse.json(
      { message: "دانش‌آموز با موفقیت ایجاد شد", student },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating student:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: "دانش‌آموزی با این کد ملی قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "خطا در ایجاد دانش‌آموز: " + error.message },
      { status: 500 }
    );
  }
}

// DELETE - حذف دانش‌آموز
export async function DELETE(request) {
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

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("id");

    if (!studentId) {
      return NextResponse.json(
        { error: "شناسه دانش‌آموز الزامی است" },
        { status: 400 }
      );
    }

    // یافتن دانش‌آموز و بررسی تعلق آن به واحد سازمانی کاربر
    const student = await Student.findOne({
      _id: studentId,
      organizationalUnitCode: user.examCenter.code,
    });

    if (!student) {
      return NextResponse.json(
        { error: "دانش‌آموز یافت نشد یا دسترسی ندارید" },
        { status: 404 }
      );
    }

    // حذف دانش‌آموز
    await Student.findByIdAndDelete(studentId);

    return NextResponse.json({
      message: "دانش‌آموز با موفقیت حذف شد",
    });
  } catch (error) {
    console.error("Error deleting student:", error);
    return NextResponse.json(
      { error: "خطا در حذف دانش‌آموز: " + error.message },
      { status: 500 }
    );
  }
}
