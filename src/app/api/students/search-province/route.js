import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Student from "@/models/Student";
import ExamCenter from "@/models/ExamCenter";
import District from "@/models/District";
import Province from "@/models/Province";
import CourseGrade from "@/models/CourseGrade";
import CourseBranchField from "@/models/CourseBranchField";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    const user = await authService.validateToken(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "احراز هویت نشده" },
        { status: 401 }
      );
    }

    // فقط کارشناس فناوری استان مجاز است
    if (user.role !== ROLES.PROVINCE_TECH_EXPERT) {
      return NextResponse.json(
        { success: false, error: "شما مجاز به دسترسی این بخش نیستید" },
        { status: 403 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const nationalId = searchParams.get("nationalId");

    if (!nationalId || nationalId.trim().length < 3) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "لطفاً حداقل 3 کاراکتر وارد کنید",
      });
    }

    // تشخیص کد استان کاربر
    let userProvinceCode = user.province?.code || user.province;

    // اگر province یک ObjectId است، کد آن را از دیتابیس بگیریم
    if (mongoose.Types.ObjectId.isValid(userProvinceCode)) {
      try {
        const province = await Province.findById(userProvinceCode)
          .select("code")
          .lean();
        if (province) {
          userProvinceCode = province.code;
        }
      } catch (error) {
        console.error("Error fetching province code:", error);
      }
    }

    if (!userProvinceCode) {
      return NextResponse.json(
        { success: false, error: "اطلاعات استان شما یافت نشد" },
        { status: 400 }
      );
    }

    // جستجوی دانش‌آموزان بر اساس کد ملی در کل استان
    const students = await Student.find({
      nationalId: { $regex: nationalId.trim(), $options: "i" },
      provinceCode: userProvinceCode,
    })
      .limit(50) // محدود کردن به 50 نتیجه
      .lean();

    // تکمیل اطلاعات دانش‌آموزان
    const enrichedStudents = await Promise.all(
      students.map(async (student) => {
        try {
          // دریافت اطلاعات مدرسه بر اساس organizationalUnitCode
          let examCenter = null;
          if (student.organizationalUnitCode) {
            const center = await ExamCenter.findOne({
              code: student.organizationalUnitCode,
            })
              .populate({
                path: "district",
                select: "name code",
              })
              .select("name code district")
              .lean();

            if (center) {
              examCenter = {
                name: center.name,
                code: center.code,
                district: center.district,
              };
            }
          }

          // دریافت نام پایه تحصیلی
          let gradeName = student.gradeCode;
          if (student.gradeCode) {
            const grade = await CourseGrade.findOne({
              gradeCode: student.gradeCode,
            })
              .select("gradeName")
              .lean();
            if (grade) {
              gradeName = grade.gradeName;
            }
          }

          // دریافت نام رشته
          let fieldName = student.fieldCode;
          if (student.fieldCode) {
            const field = await CourseBranchField.findOne({
              fieldCode: student.fieldCode,
            })
              .select("fieldTitle")
              .lean();
            if (field) {
              fieldName = field.fieldTitle;
            }
          }

          return {
            _id: student._id,
            nationalId: student.nationalId,
            firstName: student.firstName,
            lastName: student.lastName,
            fatherName: student.fatherName,
            birthDate: student.birthDate,
            gender: student.gender,
            academicYear: student.academicYear,
            academicCourse: student.academicCourse,
            gradeCode: student.gradeCode,
            gradeName: gradeName,
            fieldCode: student.fieldCode,
            fieldName: fieldName,
            studentType: student.studentType,
            isActive: student.isActive,
            organizationalUnitCode: student.organizationalUnitCode,
            examCenter: examCenter,
            createdAt: student.createdAt,
            updatedAt: student.updatedAt,
          };
        } catch (error) {
          console.error("Error enriching student data:", error);
          return student;
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: enrichedStudents,
      total: enrichedStudents.length,
      searchTerm: nationalId,
    });
  } catch (error) {
    console.error("Error searching students:", error);
    return NextResponse.json(
      { success: false, error: "خطا در جستجوی دانش‌آموزان" },
      { status: 500 }
    );
  }
}
