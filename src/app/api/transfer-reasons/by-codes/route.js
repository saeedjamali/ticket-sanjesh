import { NextResponse } from "next/server";
import TransferReason from "@/models/TransferReason";
import { authService } from "@/lib/auth/authService";
import dbConnect from "@/lib/dbConnect";

// GET /api/transfer-reasons/by-codes?codes=1,2,9,16
export async function GET(req) {
  try {
    const userAuth = await authService.validateToken(req);

    if (!userAuth || !userAuth.role) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // اتصال به دیتابیس
    await dbConnect();

    // گرفتن کدهای بند از query parameter
    const { searchParams } = new URL(req.url);
    const codesParam = searchParams.get("codes");

    if (!codesParam) {
      return NextResponse.json(
        { success: false, error: "کدهای بند ارسال نشده است" },
        { status: 400 }
      );
    }

    // تبدیل رشته کدها به آرایه
    const codes = codesParam
      .split(",")
      .map((code) => code.trim())
      .filter((code) => code);

    if (codes.length === 0) {
      return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }

    console.log("Fetching transfer reasons for codes:", codes);

    // جستجوی بندهای انتقال براساس کدها
    const transferReasons = await TransferReason.find({
      code: { $in: codes },
      isActive: true,
    })
      .select("code title reasonTitle description order")
      .sort({ order: 1 });

    console.log("Found transfer reasons:", transferReasons.length);

    // ساخت نقشه برای ترتیب صحیح نتایج براساس ترتیب کدهای ورودی
    const reasonsMap = {};
    transferReasons.forEach((reason) => {
      reasonsMap[reason.code] = reason;
    });

    // مرتب‌سازی نتایج براساس ترتیب کدهای ورودی
    const orderedReasons = codes
      .map((code) => reasonsMap[code])
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      data: orderedReasons,
      total: orderedReasons.length,
    });
  } catch (error) {
    console.error("Error fetching transfer reasons by codes:", error);
    return NextResponse.json(
      { success: false, error: "خطا در دریافت اطلاعات بندهای انتقال" },
      { status: 500 }
    );
  }
}
