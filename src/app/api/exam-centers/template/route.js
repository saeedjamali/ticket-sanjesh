import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import Province from "@/models/Province";
import District from "@/models/District";
import Gender from "@/models/Gender";
import CourseGrade from "@/models/CourseGrade";
import CourseBranchField from "@/models/CourseBranchField";
import OrganizationalUnitType from "@/models/OrganizationalUnitType";
import connectDB from "@/lib/db";

export async function GET(request) {
  try {
    await connectDB();

    // اعتبارسنجی کاربر و بررسی دسترسی
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "لطفا وارد شوید" },
        { status: 401 }
      );
    }

    // بررسی دسترسی مدیر سیستم
    if (user.role !== ROLES.SYSTEM_ADMIN) {
      return NextResponse.json(
        { success: false, message: "شما دسترسی به این قسمت ندارید" },
        { status: 403 }
      );
    }

    // دریافت مناطق و استان‌ها برای درج در فایل نمونه
    const districts = await District.find()
      .populate("province")
      .select("_id name code province");

    // دریافت داده‌های مرجع
    const genders = await Gender.find({ isActive: true }).select(
      "genderCode genderTitle"
    );
    const courses = await CourseGrade.find({ isActive: true }).select(
      "courseCode courseName"
    );
    const branches = await CourseBranchField.find({ isActive: true }).select(
      "branchCode branchTitle"
    );
    const organizationTypes = await OrganizationalUnitType.find({
      isActive: true,
    }).select("unitTypeCode unitTypeTitle");

    // ایجاد فایل اکسل نمونه
    const workbook = XLSX.utils.book_new();

    // تعریف ستون‌های فایل
    const data = [
      [
        "نام واحد سازمانی",
        "کد واحد سازمانی",
        "شناسه منطقه",
        "ظرفیت",
        "آدرس",
        "تلفن",
        "کد جنسیت",
        "کد دوره",
        "کد شاخه",
        "تعداد دانش آموز",
        "کد نوع واحد سازمانی",
      ],
      [
        "واحد سازمانی 1",
        "EC001",
        districts.length > 0
          ? districts[0]._id.toString()
          : "6123456789abcdef12345678",
        "30",
        "آدرس واحد سازمانی 1",
        "021-12345678",
        genders.length > 0 ? genders[0].genderCode : "MIXED",
        courses.length > 0 ? courses[0].courseCode : "SECONDARY1",
        branches.length > 0 ? branches[0].branchCode : "SCIENCE",
        "150",
        organizationTypes.length > 0
          ? organizationTypes[0].unitTypeCode
          : "PUBLIC",
      ],
      [
        "واحد سازمانی 2",
        "EC002",
        districts.length > 0
          ? districts[0]._id.toString()
          : "6123456789abcdef12345678",
        "50",
        "آدرس واحد سازمانی 2",
        "021-87654321",
        genders.length > 1 ? genders[1].genderCode : "FEMALE",
        courses.length > 1 ? courses[1].courseCode : "PRIMARY",
        branches.length > 1 ? branches[1].branchCode : "MATH",
        "200",
        organizationTypes.length > 1
          ? organizationTypes[1].unitTypeCode
          : "PRIVATE",
      ],
      [
        "راهنما:",
        "کد مرکز باید منحصربفرد باشد",
        "شناسه منطقه باید از لیست مناطق انتخاب شود",
        "عدد صحیح",
        "اختیاری",
        "اختیاری",
        "کد جنسیت از شیت جنسیت‌ها",
        "کد دوره از شیت دوره‌ها",
        "کد شاخه از شیت شاخه‌ها",
        "عدد صحیح",
        "کد نوع واحد از شیت انواع واحد",
      ],
    ];

    // ایجاد و تنظیم ورک‌شیت اصلی
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // ایجاد ورک‌شیت مناطق
    const districtsData = [
      ["شناسه منطقه", "نام منطقه", "کد منطقه", "استان"],
      ...districts.map((district) => [
        district._id.toString(),
        district.name,
        district.code,
        district.province?.name || "-",
      ]),
    ];
    const districtsWorksheet = XLSX.utils.aoa_to_sheet(districtsData);

    // ایجاد ورک‌شیت جنسیت‌ها
    const gendersData = [
      ["کد جنسیت", "عنوان جنسیت"],
      ...genders.map((gender) => [gender.genderCode, gender.genderTitle]),
    ];
    const gendersWorksheet = XLSX.utils.aoa_to_sheet(gendersData);

    // ایجاد ورک‌شیت دوره‌ها
    const coursesData = [
      ["کد دوره", "نام دوره"],
      ...courses.map((course) => [course.courseCode, course.courseName]),
    ];
    const coursesWorksheet = XLSX.utils.aoa_to_sheet(coursesData);

    // ایجاد ورک‌شیت شاخه‌ها
    const branchesData = [
      ["کد شاخه", "عنوان شاخه"],
      ...branches.map((branch) => [branch.branchCode, branch.branchTitle]),
    ];
    const branchesWorksheet = XLSX.utils.aoa_to_sheet(branchesData);

    // ایجاد ورک‌شیت انواع واحد سازمانی
    const orgTypesData = [
      ["کد نوع واحد", "عنوان نوع واحد"],
      ...organizationTypes.map((orgType) => [
        orgType.unitTypeCode,
        orgType.unitTypeTitle,
      ]),
    ];
    const orgTypesWorksheet = XLSX.utils.aoa_to_sheet(orgTypesData);

    // تنظیم عرض ستون‌ها
    const cols = [
      { wch: 25 }, // نام واحد سازمانی
      { wch: 15 }, // کد واحد سازمانی
      { wch: 30 }, // شناسه منطقه
      { wch: 10 }, // ظرفیت
      { wch: 30 }, // آدرس
      { wch: 15 }, // تلفن
      { wch: 15 }, // کد جنسیت
      { wch: 15 }, // کد دوره
      { wch: 15 }, // کد شاخه
      { wch: 15 }, // تعداد دانش آموز
      { wch: 20 }, // کد نوع واحد سازمانی
    ];

    const districtsCols = [
      { wch: 30 }, // شناسه منطقه
      { wch: 25 }, // نام منطقه
      { wch: 15 }, // کد منطقه
      { wch: 20 }, // استان
    ];

    const gendersCols = [
      { wch: 15 }, // کد جنسیت
      { wch: 25 }, // عنوان جنسیت
    ];

    const coursesCols = [
      { wch: 15 }, // کد دوره
      { wch: 25 }, // نام دوره
    ];

    const branchesCols = [
      { wch: 15 }, // کد شاخه
      { wch: 25 }, // عنوان شاخه
    ];

    const orgTypesCols = [
      { wch: 20 }, // کد نوع واحد
      { wch: 30 }, // عنوان نوع واحد
    ];

    worksheet["!cols"] = cols;
    districtsWorksheet["!cols"] = districtsCols;
    gendersWorksheet["!cols"] = gendersCols;
    coursesWorksheet["!cols"] = coursesCols;
    branchesWorksheet["!cols"] = branchesCols;
    orgTypesWorksheet["!cols"] = orgTypesCols;

    // اضافه کردن ورک‌شیت‌ها به کتاب
    XLSX.utils.book_append_sheet(workbook, worksheet, "واحدهای سازمانی");
    XLSX.utils.book_append_sheet(workbook, districtsWorksheet, "مناطق");
    XLSX.utils.book_append_sheet(workbook, gendersWorksheet, "جنسیت‌ها");
    XLSX.utils.book_append_sheet(workbook, coursesWorksheet, "دوره‌ها");
    XLSX.utils.book_append_sheet(workbook, branchesWorksheet, "شاخه‌ها");
    XLSX.utils.book_append_sheet(workbook, orgTypesWorksheet, "انواع واحد");

    // تبدیل به بافر
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // ایجاد پاسخ با فایل اکسل
    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="template_import_exam_centers.xlsx"',
      },
    });

    return response;
  } catch (error) {
    console.error("Error generating template:", error);
    return NextResponse.json(
      { success: false, message: "خطا در تولید فایل نمونه: " + error.message },
      { status: 500 }
    );
  }
}
