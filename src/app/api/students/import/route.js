import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/dbConnect";
import Student from "@/models/Student";
import User from "@/models/User";
import District from "@/models/District";
import AcademicYear from "@/models/AcademicYear";
import CourseGrade from "@/models/CourseGrade";
import CourseBranchField from "@/models/CourseBranchField";
import ExamCenterStats from "@/models/ExamCenterStats";

import { verifyJWT } from "@/lib/auth/tokenService";
import { authService } from "@/lib/auth/authService";

// Helper function to update ExamCenterStats for current year
async function updateExamCenterStats(
  organizationalUnitCode,
  academicYear,
  userId,
  districtCode = null,
  provinceCode = null
) {
  try {
    // فقط برای سال جاری به‌روزرسانی کن
    const activeAcademicYear = await AcademicYear.findOne({ isActive: true });
    if (!activeAcademicYear || academicYear !== activeAcademicYear.name) {
      return; // اگر سال جاری نیست، هیچ کاری نکن
    }

    // شمارش تعداد دانش‌آموزان ثبت شده در سال جاری
    const [totalStudents, maleStudents, femaleStudents] = await Promise.all([
      Student.countDocuments({
        organizationalUnitCode,
        academicYear,
      }),
      Student.countDocuments({
        organizationalUnitCode,
        academicYear,
        gender: "male",
      }),
      Student.countDocuments({
        organizationalUnitCode,
        academicYear,
        gender: "female",
      }),
    ]);

    // بررسی وجود رکورد آماری
    let stats = await ExamCenterStats.findOne({
      organizationalUnitCode,
      academicYear,
    });

    if (!stats) {
      // اگر کدهای استان و منطقه ارسال نشده، از روی دانش‌آموزان موجود دریافت کن
      if (!districtCode || !provinceCode) {
        const sampleStudent = await Student.findOne({
          organizationalUnitCode,
          academicYear,
        }).select("districtCode provinceCode");

        if (sampleStudent) {
          districtCode = districtCode || sampleStudent.districtCode;
          provinceCode = provinceCode || sampleStudent.provinceCode;
        }
      }

      // اگر رکورد وجود ندارد، آن را ایجاد کن
      console.log("Creating new ExamCenterStats with data:", {
        organizationalUnitCode,
        provinceCode,
        districtCode,
        academicYear,
        totalStudents,
        maleStudents,
        femaleStudents,
        classifiedStudents: 0,
        totalClasses: 0,
        createdBy: userId,
      });

      stats = new ExamCenterStats({
        organizationalUnitCode,
        provinceCode,
        districtCode,
        academicYear,
        totalStudents,
        maleStudents,
        femaleStudents,
        classifiedStudents: 0,
        totalClasses: 0,
        createdBy: userId,
      });
      await stats.save();
      console.log(
        `Created new ExamCenterStats for ${organizationalUnitCode} - ${academicYear}: ${totalStudents} students (${maleStudents} male, ${femaleStudents} female)`
      );
    } else {
      // اگر رکورد وجود دارد، آمار دانش‌آموزان را به‌روزرسانی کن
      stats.totalStudents = totalStudents;
      stats.maleStudents = maleStudents;
      stats.femaleStudents = femaleStudents;
      stats.updatedBy = userId;
      await stats.save();
      console.log(
        `Updated ExamCenterStats for ${organizationalUnitCode} - ${academicYear}: ${totalStudents} students (${maleStudents} male, ${femaleStudents} female)`
      );
    }
  } catch (error) {
    console.error("Error updating ExamCenterStats:", error);
  }
}

// POST - بارگذاری و پردازش فایل Excel دانش‌آموزان
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
      .populate("province")
      .populate("district")
      .populate({
        path: "examCenter",
        populate: [
          { path: "course" },
          { path: "branch" },
          { path: "district" },
        ],
      });

    if (!user) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    }

    // لاگ اطلاعات کاربر برای دیباگ
    console.log("User info for import:", {
      userId: user._id,
      role: user.role,
      examCenterId: user.examCenter?._id,
      examCenterCode: user.examCenter?.code,
      examCenterName: user.examCenter?.name,
      districtCode: user.examCenter?.district?.code || user.district?.code,
      courseCode: user.examCenter?.course?.courseCode,
      courseName: user.examCenter?.course?.courseName,
      branchCode: user.examCenter?.branch?.branchCode,
      branchTitle: user.examCenter?.branch?.branchTitle,
    });

    // بررسی دسترسی - فقط مدیران واحد سازمانی
    if (user.role !== "examCenterManager") {
      return NextResponse.json(
        { error: "شما دسترسی لازم را ندارید" },
        { status: 403 }
      );
    }

    // بررسی اطلاعات لازم واحد سازمانی
    if (!user.examCenter) {
      return NextResponse.json(
        { error: "واحد سازمانی شما تعریف نشده است" },
        { status: 400 }
      );
    }

    if (!user.examCenter.code) {
      return NextResponse.json(
        { error: "کد واحد سازمانی شما تعریف نشده است" },
        { status: 400 }
      );
    }

    const districtCode = user.examCenter.district?.code || user.district?.code;
    if (!districtCode) {
      return NextResponse.json(
        { error: "کد منطقه برای واحد سازمانی شما تعریف نشده است" },
        { status: 400 }
      );
    }

    // دریافت کد استان از روی منطقه
    let provinceCode = "";
    if (user.examCenter.district?._id) {
      const district = await District.findById(
        user.examCenter.district._id
      ).populate("province");
      provinceCode = district?.province?.code || "";
    } else if (user.district?._id) {
      const district = await District.findById(user.district._id).populate(
        "province"
      );
      provinceCode = district?.province?.code || "";
    }

    // دریافت سال تحصیلی از URL
    const { searchParams } = new URL(request.url);
    const yearFilter = searchParams.get("yearFilter") || "current"; // "current" or "previous"

    // دریافت اطلاعات کمکی
    const [activeAcademicYear, grades, fields] = await Promise.all([
      AcademicYear.findOne({ isActive: true }),
      CourseGrade.find({ isActive: true }).lean(),
      CourseBranchField.find({ isActive: true }).lean(),
    ]);

    console.log(
      "Available fields for this course and branch:",
      fields.filter(
        (f) =>
          f.courseCode === user.examCenter.course.courseCode &&
          f.branchCode === user.examCenter.branch.branchCode
      )
    );

    if (!activeAcademicYear) {
      return NextResponse.json(
        { error: "سال تحصیلی فعال یافت نشد" },
        { status: 400 }
      );
    }

    let targetAcademicYear = activeAcademicYear;
    if (yearFilter === "previous") {
      // دریافت سال تحصیلی قبلی
      targetAcademicYear = await AcademicYear.findOne({
        name: { $lt: activeAcademicYear.name },
      }).sort({ name: -1 });

      if (!targetAcademicYear) {
        return NextResponse.json(
          { error: "سال تحصیلی قبلی یافت نشد" },
          { status: 400 }
        );
      }
    }

    // خواندن فایل از درخواست
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "فایل انتخاب نشده است" },
        { status: 400 }
      );
    }

    // تبدیل فایل به بافر و خواندن اکسل
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: "buffer" });

      // بررسی وجود شیت اول
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return NextResponse.json(
          { error: "فایل اکسل معتبر نیست" },
          { status: 400 }
        );
      }

      // خواندن داده‌های شیت اول
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Debug: نمایش header های خوانده شده
      if (data.length > 0) {
        console.log("Headers found in Excel file:", Object.keys(data[0]));
        console.log("Sample row data:", data[0]);
      }

      // بررسی وجود داده
      if (!data || data.length === 0) {
        return NextResponse.json(
          { error: "فایل اکسل خالی است یا داده‌ای ندارد" },
          { status: 400 }
        );
      }

      // جنسیت‌های معتبر
      const validGenders = ["male", "female", "پسر", "دختر"];

      const results = {
        totalRecords: data.length,
        successCount: 0,
        errorCount: 0,
        errors: [],
      };

      // پردازش هر رکورد
      for (let index = 0; index < data.length; index++) {
        const row = data[index];
        const rowNumber = index + 2; // شروع از ردیف ۲ (بعد از header)

        try {
          // استخراج داده‌ها
          let nationalId = String(row["کد ملی"] || "").trim();
          const firstName = String(row["نام"] || "").trim();
          const lastName = String(row["نام خانوادگی"] || "").trim();
          const fatherName = String(row["نام پدر"] || "").trim();
          const birthDate = String(row["تاریخ تولد (فارسی)"] || "").trim();
          const gradeTitle = String(row["پایه"] || "").trim();
          const fieldCode = String(row["کد رشته"] || "").trim();
          const fieldTitle = String(row["رشته"] || "").trim();
          const genderInput = String(row["جنسیت"] || "")
            .trim()
            .toLowerCase();
          const studentType = String(
            row["نوع (normal/adult)"] || "normal"
          ).trim();

          const nationality = String(row["ملیت"] || "").trim();
          const mobile = String(row["موبایل"] || "").trim();
          const address = String(row["آدرس"] || "").trim();

          // اعتبارسنجی فیلدهای ضروری
          if (!nationalId) {
            results.errors.push({
              row: rowNumber,
              nationalId,
              message: "کد ملی الزامی است",
            });
            results.errorCount++;
            continue;
          }

          // تصحیح کد ملی - اگر 8 یا 9 رقمی بود، صفر به ابتدا اضافه کن
          if (/^\d{8}$/.test(nationalId)) {
            nationalId = "00" + nationalId;
          } else if (/^\d{9}$/.test(nationalId)) {
            nationalId = "0" + nationalId;
          }

          if (!/^\d{10}$/.test(nationalId) && !/^\d{11}$/.test(nationalId)) {
            results.errors.push({
              row: rowNumber,
              nationalId,
              message: "کد ملی باید 8، 9، 10 یا 11 رقم باشد",
            });
            results.errorCount++;
            continue;
          }

          // // اگر کد ملی 11 رقمی است، رقم اول را حذف می‌کنیم
          // if (/^\d{11}$/.test(nationalId)) {
          //   nationalId = nationalId.substring(1);
          // }

          if (!firstName || !lastName || !fatherName || !birthDate) {
            results.errors.push({
              row: rowNumber,
              nationalId,
              message: "نام، نام خانوادگی، نام پدر و تاریخ تولد الزامی است",
            });
            results.errorCount++;
            continue;
          }

          // بررسی پایه براساس عنوان با مقایسه رشته‌ای انعطاف‌پذیر
          console.log(
            `جستجو برای پایه "${gradeTitle}" در میان پایه‌های موجود:`,
            grades
              .filter((g) => g.courseCode === user.examCenter.course.courseCode)
              .map((g) => g.gradeName)
          );

          let grade = grades.find(
            (g) =>
              g.courseCode === user.examCenter.course.courseCode &&
              (g.gradeName === gradeTitle ||
                g.gradeName.toLowerCase().includes(gradeTitle.toLowerCase()) ||
                gradeTitle.toLowerCase().includes(g.gradeName.toLowerCase()))
          );

          let gradeCode;
          let description = "";

          if (!grade) {
            // اگر پایه پیدا نشد، با کد 501 (سایر) ثبت می‌شود
            gradeCode = "501";
            description = `پایه اصلی: ${gradeTitle}`;

            // بررسی وجود پایه با کد 501
            let otherGrade = grades.find(
              (g) =>
                g.gradeCode === "501" &&
                g.courseCode === user.examCenter.course.courseCode
            );

            if (!otherGrade) {
              // ایجاد پایه سایر با کد 501
              try {
                const newGrade = new CourseGrade({
                  courseCode: user.examCenter.course.courseCode,
                  courseName: user.examCenter.course.courseName,
                  gradeCode: "501",
                  gradeName: "سایر",
                  isActive: true,
                  createdBy: user._id,
                });

                await newGrade.save();

                // اضافه کردن پایه جدید به لیست grades
                grades.push({
                  courseCode: user.examCenter.course.courseCode,
                  courseName: user.examCenter.course.courseName,
                  gradeCode: "501",
                  gradeName: "سایر",
                  isActive: true,
                });

                console.log(
                  `پایه "سایر" با کد 501 برای دوره ${user.examCenter.course.courseCode} ایجاد شد`
                );
              } catch (gradeError) {
                console.error("خطا در ایجاد پایه سایر:", gradeError);
                results.errors.push({
                  row: rowNumber,
                  nationalId,
                  message: `پایه "${gradeTitle}" یافت نشد و خطا در ایجاد پایه "سایر"`,
                });
                results.errorCount++;
                continue;
              }
            }
          } else {
            gradeCode = grade.gradeCode;
          }

          // بررسی رشته براساس کد رشته (مقایسه با fieldCode)
          console.log(
            `جستجو برای کد رشته "${fieldCode}" در میان رشته‌های موجود:`,
            fields
              .filter(
                (f) =>
                  f.courseCode === user.examCenter.course.courseCode &&
                  f.branchCode === user.examCenter.branch.branchCode
              )
              .map((f) => ({
                fieldCode: f.fieldCode,
                fieldTitle: f.fieldTitle,
              }))
          );

          const field = fields.find(
            (f) =>
              f.fieldCode === fieldCode &&
              f.courseCode === user.examCenter.course.courseCode &&
              f.branchCode === user.examCenter.branch.branchCode
          );

          if (!field) {
            results.errors.push({
              row: rowNumber,
              nationalId,
              message: `کد رشته "${fieldCode}" یافت نشد یا متعلق به دوره "${user.examCenter.course.courseCode}" و شاخه "${user.examCenter.branch.branchCode}" شما نیست`,
            });
            results.errorCount++;
            continue;
          }

          // تبدیل جنسیت به فرمت استاندارد
          let gender = genderInput;
          if (genderInput === "پسر") gender = "male";
          if (genderInput === "دختر") gender = "female";

          if (!validGenders.includes(gender)) {
            results.errors.push({
              row: rowNumber,
              nationalId,
              message: "جنسیت باید یکی از مقادیر male/female یا پسر/دختر باشد",
            });
            results.errorCount++;
            continue;
          }

          // تبدیل نوع دانش‌آموز به فرمت استاندارد
          let normalizedStudentType = studentType.toLowerCase();
          if (normalizedStudentType === "عادی")
            normalizedStudentType = "normal";
          if (normalizedStudentType === "بزرگسال")
            normalizedStudentType = "adult";

          // Debug: نمایش مقادیر جنسیت و نوع
          console.log(
            `Row ${rowNumber}: Gender="${genderInput}", Type="${studentType}" -> Normalized: "${normalizedStudentType}"`
          );

          // بررسی نوع دانش‌آموز
          if (!["normal", "adult"].includes(normalizedStudentType)) {
            results.errors.push({
              row: rowNumber,
              nationalId,
              message: "نوع دانش‌آموز باید normal/عادی یا adult/بزرگسال باشد",
            });
            results.errorCount++;
            continue;
          }

          // تبدیل شماره موبایل - اگر 10 رقمی بود صفر اضافه کن
          let normalizedMobile = mobile;
          if (mobile && /^9\d{9}$/.test(mobile)) {
            normalizedMobile = "0" + mobile;
            console.log(
              `Row ${rowNumber}: Mobile "${mobile}" -> Normalized: "${normalizedMobile}"`
            );
          }

          // بررسی موبایل
          if (normalizedMobile && !/^09\d{9}$/.test(normalizedMobile)) {
            results.errors.push({
              row: rowNumber,
              nationalId,
              message:
                "شماره موبایل نامعتبر است (باید 11 رقمی و با 09 شروع شود)",
            });
            results.errorCount++;
            continue;
          }

          // بررسی تکراری نبودن کد ملی در سال تحصیلی مورد نظر
          const existingStudent = await Student.findOne({
            nationalId,
            academicYear: targetAcademicYear.name,
          });

          if (existingStudent) {
            results.errors.push({
              row: rowNumber,
              nationalId,
              message: "این دانش‌آموز قبلاً در این سال تحصیلی ثبت شده است",
            });
            results.errorCount++;
            continue;
          }

          // ایجاد دانش‌آموز جدید
          const newStudent = new Student({
            nationalId,
            firstName,
            lastName,
            fatherName,
            birthDate,
            gender,
            studentType: normalizedStudentType || "normal",
            nationality: nationality || "IR",
            mobile: normalizedMobile,
            address,
            gradeCode,
            gradeName: gradeTitle,
            fieldCode: field.fieldCode,
            fieldName: field.fieldTitle,
            description,
            // اطلاعات سال تحصیلی و دوره تحصیلی - ذخیره عناوین به جای شناسه‌ها
            academicYear: targetAcademicYear.name,
            academicCourse: user.examCenter.course.courseName,
            // اطلاعات واحد سازمانی
            examCenter: user.examCenter._id,
            organizationalUnitCode: user.examCenter.code,
            district: user.examCenter.district._id,
            districtCode: user.examCenter.district.code,
            province: provinceCode,
            createdBy: user._id,
            isActive: true,
          });

          // لاگ اطلاعات برای دیباگ
          console.log("Creating student with data:", {
            nationalId,
            organizationalUnitCode: user.examCenter.code,
            districtCode: user.examCenter.district.code,
            academicYear: targetAcademicYear.name,
            academicCourse: user.examCenter.course.courseName,
          });

          await newStudent.save();
          results.successCount++;
        } catch (error) {
          console.error(`Error processing row ${rowNumber}:`, error);
          results.errorCount++;
          results.errors.push({
            row: rowNumber,
            nationalId: row["کد ملی"] || "-",
            message: error.message || "خطا در پردازش رکورد",
          });
        }
      }

      // به‌روزرسانی آمار واحد سازمانی برای سال جاری
      if (results.successCount > 0) {
        await updateExamCenterStats(
          user.examCenter.code,
          targetAcademicYear.name,
          user._id,
          districtCode,
          provinceCode
        );
      }

      return NextResponse.json(results);
    } catch (error) {
      console.error("Error reading or parsing Excel file:", error);
      return NextResponse.json(
        { error: "خطا در خواندن یا پردازش فایل اکسل" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error importing students:", error);
    return NextResponse.json(
      { error: error.message || "خطا در پردازش فایل" },
      { status: 500 }
    );
  }
}
