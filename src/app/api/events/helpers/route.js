import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Province from "@/models/Province";
import District from "@/models/District";
import ExamCenter from "@/models/ExamCenter";
import { authService } from "@/lib/auth/authService";

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

    // دریافت همه استان‌ها
    const provinces = await Province.find().select("name code").lean();

    // دریافت همه مناطق و گروه‌بندی بر اساس استان
    const districts = await District.find()
      .populate("province", "name code")
      .select("name code province")
      .lean();

    // دریافت همه واحدهای سازمانی و گروه‌بندی بر اساس منطقه
    const examCenters = await ExamCenter.find()
      .populate("district", "name code")
      .select("name code district")
      .lean();

    // ساختار داده‌ها برای استفاده راحت‌تر در فرانت‌اند
    const districtsByProvince = {};
    const examCentersByDistrict = {};

    // گروه‌بندی مناطق بر اساس استان
    districts.forEach((district) => {
      if (district.province) {
        if (!districtsByProvince[district.province._id]) {
          districtsByProvince[district.province._id] = [];
        }
        districtsByProvince[district.province._id].push({
          _id: district._id,
          name: district.name,
          code: district.code,
        });
      }
    });

    // گروه‌بندی واحدهای سازمانی بر اساس منطقه
    examCenters.forEach((examCenter) => {
      if (examCenter.district) {
        if (!examCentersByDistrict[examCenter.district._id]) {
          examCentersByDistrict[examCenter.district._id] = [];
        }
        examCentersByDistrict[examCenter.district._id].push({
          _id: examCenter._id,
          name: examCenter.name,
          code: examCenter.code,
        });
      }
    });

    return NextResponse.json({
      provinces,
      districts,
      examCenters,
      districtsByProvince,
      examCentersByDistrict,
      targetRoles: [
        { value: "all", label: "همه کاربران" },
        { value: "systemAdmin", label: "مدیر سیستم" },
        { value: "generalManager", label: "مدیر کل" },
        { value: "examCenterManager", label: "مدیر واحد سازمانی" },
      ],
      priorities: [
        { value: "low", label: "کم", color: "gray" },
        { value: "medium", label: "متوسط", color: "blue" },
        { value: "high", label: "بالا", color: "orange" },
        { value: "critical", label: "حیاتی", color: "red" },
      ],
    });
  } catch (error) {
    console.error("Error fetching helpers:", error);
    return NextResponse.json(
      { error: "خطا در دریافت اطلاعات کمکی" },
      { status: 500 }
    );
  }
}
