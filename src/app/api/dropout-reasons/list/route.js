import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import DropoutReason from "@/models/DropoutReason";

// GET - دریافت لیست ساده علت‌های فعال برای dropdown
export async function GET() {
  try {
    await dbConnect();

    // دریافت فقط علت‌های فعال
    const reasons = await DropoutReason.find({ isActive: true })
      .select("_id code title level parent")
      .populate("parent", "title")
      .sort({ order: 1, title: 1 });

    // تبدیل به فرمت مناسب dropdown با نمایش سلسله مراتبی
    const reasonsList = reasons.map((reason) => {
      let displayTitle = reason.title;

      // اگر parent دارد، آن را به عنوان prefix اضافه کن
      if (reason.parent) {
        displayTitle = `${reason.parent.title} > ${reason.title}`;
      }

      return {
        _id: reason._id.toString(),
        code: reason.code,
        title: reason.title,
        displayTitle: displayTitle,
        level: reason.level,
        parent: reason.parent ? reason.parent._id.toString() : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: reasonsList,
    });
  } catch (error) {
    console.error("Error fetching dropout reasons list:", error);
    return NextResponse.json(
      { success: false, error: "خطا در دریافت لیست علت‌ها" },
      { status: 500 }
    );
  }
}
