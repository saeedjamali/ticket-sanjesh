import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import DropoutReason from "@/models/DropoutReason";
import { verifyToken } from "@/lib/auth";
import { authService } from "@/lib/auth/authService";

// GET - دریافت لیست علت‌های بازمانده از تحصیل
export async function GET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const tree = searchParams.get("tree") === "true";
    const parentId = searchParams.get("parent");
    const includeInactive = searchParams.get("includeInactive") === "true";

    console.log("GET dropout-reasons called with params:", {
      tree,
      parentId,
      includeInactive,
    });

    // اگر درخواست ساختار درختی باشد
    if (tree) {
      console.log("Building tree structure directly in API...");

      // دریافت تمام رکوردها
      const filter = {};
      if (!includeInactive) {
        filter.isActive = true;
      }

      const allReasons = await DropoutReason.find(filter)
        .populate("parent", "title code")
        .populate("createdBy", "firstName lastName")
        .populate("updatedBy", "firstName lastName")
        .sort({ order: 1, title: 1 });

      console.log(`Found ${allReasons.length} total reasons`);

      // تبدیل به آرایه ساده با فیلدهای کامل
      const reasonsArray = allReasons.map((reason) => ({
        _id: reason._id.toString(),
        code: reason.code,
        title: reason.title,
        parent: reason.parent ? reason.parent._id.toString() : null,
        level: reason.level || 1,
        order: reason.order || 0,
        isActive: reason.isActive !== undefined ? reason.isActive : true,
        createdBy: reason.createdBy,
        updatedBy: reason.updatedBy,
        createdAt: reason.createdAt,
        updatedAt: reason.updatedAt,
      }));

      // ساخت ساختار درختی
      const buildTreeStructure = (items, parentId = null) => {
        const children = items.filter((item) => item.parent === parentId);

        return children.map((item) => ({
          ...item,
          children: buildTreeStructure(items, item._id),
        }));
      };

      const treeStructure = buildTreeStructure(reasonsArray);

      console.log(`Built tree with ${treeStructure.length} root items`);

      return NextResponse.json({
        success: true,
        data: treeStructure,
      });
    }

    // اگر درخواست لیست ساده باشد
    const filter = {};
    if (parentId) {
      filter.parent = parentId === "null" ? null : parentId;
    }
    if (!includeInactive) {
      filter.isActive = true;
    }

    const reasons = await DropoutReason.find(filter)
      .populate("parent", "title code")
      .populate("createdBy", "firstName lastName")
      .populate("updatedBy", "firstName lastName")
      .sort({ order: 1, title: 1 });

    console.log(`Found ${reasons.length} reasons for flat list`);

    // تبدیل به فرمت استاندارد
    const reasonsWithPath = reasons.map((reason) => {
      // ساخت مسیر کامل
      let fullPath = reason.title;
      let currentParent = reason.parent;
      const pathParts = [reason.title];

      // اگر parent دارد، مسیر کامل را بساز
      if (currentParent) {
        pathParts.unshift(currentParent.title);
        fullPath = pathParts.join(" > ");
      }

      return {
        _id: reason._id.toString(),
        code: reason.code,
        title: reason.title,
        parent: reason.parent
          ? {
              _id: reason.parent._id.toString(),
              title: reason.parent.title,
              code: reason.parent.code,
            }
          : null,
        level: reason.level || 1,
        order: reason.order || 0,
        isActive: reason.isActive !== undefined ? reason.isActive : true,
        createdBy: reason.createdBy,
        updatedBy: reason.updatedBy,
        createdAt: reason.createdAt,
        updatedAt: reason.updatedAt,
        fullPath,
      };
    });

    return NextResponse.json({
      success: true,
      data: reasonsWithPath,
    });
  } catch (error) {
    console.error("Error fetching dropout reasons:", error);
    return NextResponse.json(
      { success: false, error: "خطا در دریافت علت‌های بازمانده از تحصیل" },
      { status: 500 }
    );
  }
}

// POST - ایجاد علت جدید
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

    // بررسی دسترسی مدیر سیستم
    if (userValid.role !== "systemAdmin") {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    const { code, title, parent, order } = await request.json();

    if (!code || !title) {
      return NextResponse.json(
        { success: false, error: "کد و عنوان الزامی است" },
        { status: 400 }
      );
    }

    // بررسی تکراری نبودن کد
    const existingCode = await DropoutReason.findOne({
      code: code.trim(),
    });

    if (existingCode) {
      return NextResponse.json(
        { success: false, error: "این کد قبلاً استفاده شده است" },
        { status: 400 }
      );
    }

    // بررسی تکراری نبودن عنوان در همان سطح
    const existingReason = await DropoutReason.findOne({
      title: title.trim(),
      parent: parent || null,
    });

    if (existingReason) {
      return NextResponse.json(
        { success: false, error: "این عنوان در همین سطح قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    // اگر parent مشخص شده، بررسی وجود آن
    if (parent) {
      const parentReason = await DropoutReason.findById(parent);
      if (!parentReason) {
        return NextResponse.json(
          { success: false, error: "علت والد یافت نشد" },
          { status: 400 }
        );
      }
    }

    const newReason = new DropoutReason({
      code: code.trim(),
      title: title.trim(),
      parent: parent || null,
      order: order || 0,
      createdBy: userValid.id,
    });

    await newReason.save();

    // بازگرداندن داده کامل
    const populatedReason = await DropoutReason.findById(newReason._id)
      .populate("parent", "title")
      .populate("createdBy", "firstName lastName");

    const fullPath = await populatedReason.getFullPath();

    return NextResponse.json({
      success: true,
      data: {
        ...populatedReason.toObject(),
        fullPath,
      },
    });
  } catch (error) {
    console.error("Error creating dropout reason:", error);
    return NextResponse.json(
      { success: false, error: "خطا در ایجاد علت بازمانده از تحصیل" },
      { status: 500 }
    );
  }
}

// PUT - ویرایش علت
export async function PUT(request) {
  try {
    await dbConnect();

    const userValid = await authService.validateToken(request);
    if (!userValid) {
      return NextResponse.json(
        { success: false, error: "لطفا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    // بررسی دسترسی مدیر سیستم
    if (userValid.role !== "systemAdmin") {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "شناسه الزامی است" },
        { status: 400 }
      );
    }

    const { code, title, parent, order, isActive } = await request.json();

    if (!code || !title) {
      return NextResponse.json(
        { success: false, error: "کد و عنوان الزامی است" },
        { status: 400 }
      );
    }

    const reason = await DropoutReason.findById(id);
    if (!reason) {
      return NextResponse.json(
        { success: false, error: "علت یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی تکراری نبودن کد (به جز خودش)
    const existingCode = await DropoutReason.findOne({
      code: code.trim(),
      _id: { $ne: id },
    });

    if (existingCode) {
      return NextResponse.json(
        { success: false, error: "این کد قبلاً استفاده شده است" },
        { status: 400 }
      );
    }

    // بررسی تکراری نبودن عنوان در همان سطح (به جز خودش)
    const existingReason = await DropoutReason.findOne({
      title: title.trim(),
      parent: parent || null,
      _id: { $ne: id },
    });

    if (existingReason) {
      return NextResponse.json(
        { success: false, error: "این عنوان در همین سطح قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    // بررسی عدم ایجاد حلقه (نمی‌توان parent را به یکی از فرزندان تغییر داد)
    if (parent && parent !== reason.parent?.toString()) {
      const children = await reason.getAllChildren();
      const childrenIds = children.map((child) => child._id.toString());

      if (childrenIds.includes(parent)) {
        return NextResponse.json(
          {
            success: false,
            error: "نمی‌توان علت را به یکی از فرزندان خود تبدیل کرد",
          },
          { status: 400 }
        );
      }
    }

    // به‌روزرسانی
    console.log("Before update - reason.isActive:", reason.isActive);
    console.log("Received isActive value:", isActive, "type:", typeof isActive);

    reason.code = code.trim();
    reason.title = title.trim();
    reason.parent = parent || null;
    reason.order = order !== undefined ? order : reason.order;
    reason.isActive = isActive !== undefined ? isActive : reason.isActive;

    // مشخص کردن اینکه فیلد تغییر کرده
    reason.markModified("isActive");

    // فقط اگر userValid.id موجود باشد updatedBy را تنظیم کن
    if (userValid.id) {
      reason.updatedBy = userValid.id;
    }

    console.log("After update - reason.isActive:", reason.isActive);

    const savedReason = await reason.save();

    console.log("After save - savedReason.isActive:", savedReason.isActive);

    // بازگرداندن داده کامل
    const populatedReason = await DropoutReason.findById(reason._id)
      .populate("parent", "title")
      .populate("createdBy", "firstName lastName")
      .populate("updatedBy", "firstName lastName");

    const fullPath = await populatedReason.getFullPath();

    return NextResponse.json({
      success: true,
      data: {
        ...populatedReason.toObject(),
        fullPath,
      },
    });
  } catch (error) {
    console.error("Error updating dropout reason:", error);
    return NextResponse.json(
      { success: false, error: "خطا در ویرایش علت بازمانده از تحصیل" },
      { status: 500 }
    );
  }
}

// DELETE - حذف علت
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

    // بررسی دسترسی مدیر سیستم
    if (userValid.role !== "systemAdmin") {
      return NextResponse.json(
        { success: false, error: "عدم دسترسی" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "شناسه الزامی است" },
        { status: 400 }
      );
    }

    const reason = await DropoutReason.findById(id);
    if (!reason) {
      return NextResponse.json(
        { success: false, error: "علت یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی وجود فرزندان
    const children = await DropoutReason.find({ parent: id });
    if (children.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "نمی‌توان علتی را حذف کرد که دارای زیرمجموعه است",
        },
        { status: 400 }
      );
    }

    // TODO: بررسی استفاده در جداول مرتبط (مثل جدول دانش‌آموزان بازمانده)

    await DropoutReason.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "علت با موفقیت حذف شد",
    });
  } catch (error) {
    console.error("Error deleting dropout reason:", error);
    return NextResponse.json(
      { success: false, error: "خطا در حذف علت بازمانده از تحصیل" },
      { status: 500 }
    );
  }
}
