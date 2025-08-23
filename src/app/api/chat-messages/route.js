import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import AppealRequest from "@/models/AppealRequest";
import TransferApplicantSpec from "@/models/TransferApplicantSpec";
import District from "@/models/District";
import Province from "@/models/Province";
import { authService } from "@/lib/auth/authService";
import { ROLES } from "@/lib/permissions";

// دریافت پیام‌های گفتگو
export async function GET(request) {
  try {
    const userAuth = await authService.validateToken(request);
    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const appealRequestId = searchParams.get("appealRequestId");

    // Debug: چک کردن تعداد کل AppealRequest ها
    const totalCount = await AppealRequest.countDocuments();
    console.log(
      "GET /api/chat-messages - Total AppealRequests in database:",
      totalCount
    );

    console.log("GET /api/chat-messages - appealRequestId:", appealRequestId);
    console.log("GET /api/chat-messages - userAuth:", {
      id: userAuth.id,
      role: userAuth.role,
      district: userAuth.district,
    });

    if (!appealRequestId) {
      return NextResponse.json(
        { success: false, error: "شناسه درخواست الزامی است" },
        { status: 400 }
      );
    }

    // بررسی فرمت ObjectId
    if (!appealRequestId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log(
        "GET /api/chat-messages - Invalid ObjectId format:",
        appealRequestId
      );
      return NextResponse.json(
        { success: false, error: "فرمت شناسه درخواست نامعتبر است" },
        { status: 400 }
      );
    }

    // یافتن درخواست
    console.log(
      "GET /api/chat-messages - Searching for AppealRequest with ID:",
      appealRequestId
    );
    const appealRequest = await AppealRequest.findById(appealRequestId)
      .populate("chatMessages.senderId", "firstName lastName")
      .populate("chatAssignedExpert", "firstName lastName");

    console.log(
      "GET /api/chat-messages - AppealRequest found:",
      !!appealRequest
    );
    if (appealRequest) {
      console.log(
        "GET /api/chat-messages - AppealRequest userId:",
        appealRequest.userId
      );
    }

    if (!appealRequest) {
      console.log(
        "GET /api/chat-messages - AppealRequest not found with ID:",
        appealRequestId
      );
      return NextResponse.json(
        { success: false, error: "درخواست یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی دسترسی بر اساس منطقه صحیح
    let canAccess = false;

    console.log(
      "GET /api/chat-messages - Checking access for role:",
      userAuth.role
    );

    if (
      userAuth.role === ROLES.TRANSFER_APPLICANT &&
      appealRequest.userId.toString() === userAuth.id
    ) {
      // متقاضی می‌تواند پیام‌های خودش را ببیند
      console.log(
        "GET /api/chat-messages - Access granted: Transfer applicant owns this request"
      );
      canAccess = true;
    } else if (userAuth.role === ROLES.DISTRICT_TRANSFER_EXPERT) {
      // کارشناس منطقه: مقایسه districtCode درخواست با district کارشناس
      console.log("GET /api/chat-messages - Checking district expert access");
      console.log(
        "GET /api/chat-messages - appealRequest.districtCode:",
        appealRequest.districtCode
      );

      // تعیین کد منطقه کارشناس
      let userDistrictCode;
      if (typeof userAuth.district === "object" && userAuth.district?.code) {
        userDistrictCode = userAuth.district.code;
      } else if (typeof userAuth.district === "string") {
        const district = await District.findById(userAuth.district);
        userDistrictCode = district?.code;
      }

      console.log(
        "GET /api/chat-messages - userDistrictCode resolved:",
        userDistrictCode
      );

      if (appealRequest.districtCode === userDistrictCode) {
        console.log(
          "GET /api/chat-messages - Access granted: District matches"
        );
        canAccess = true;
      } else {
        console.log(
          "GET /api/chat-messages - Access denied: District mismatch",
          appealRequest.districtCode,
          "vs",
          userDistrictCode
        );
      }
    } else if (userAuth.role === ROLES.PROVINCE_TRANSFER_EXPERT) {
      // کارشناس استان: مقایسه provinceCode درخواست با province کارشناس
      console.log("GET /api/chat-messages - Checking province expert access");
      console.log(
        "GET /api/chat-messages - appealRequest.provinceCode:",
        appealRequest.provinceCode
      );

      // تعیین کد استان کارشناس
      let userProvinceCode;
      if (typeof userAuth.province === "object" && userAuth.province?.code) {
        userProvinceCode = userAuth.province.code;
      } else if (typeof userAuth.province === "string") {
        const province = await Province.findById(userAuth.province);
        userProvinceCode = province?.code;
      }

      console.log(
        "GET /api/chat-messages - userProvinceCode resolved:",
        userProvinceCode
      );

      if (appealRequest.provinceCode === userProvinceCode) {
        console.log(
          "GET /api/chat-messages - Access granted: Province matches"
        );
        canAccess = true;
      } else {
        console.log(
          "GET /api/chat-messages - Access denied: Province mismatch",
          appealRequest.provinceCode,
          "vs",
          userProvinceCode
        );
      }
    }

    console.log("GET /api/chat-messages - Final access result:", canAccess);

    if (!canAccess) {
      return NextResponse.json(
        {
          success: false,
          error:
            "عدم دسترسی - شما فقط می‌تونید پیام‌های منطقه خودتان را ببینید",
        },
        { status: 403 }
      );
    }

    // علامت‌گذاری پیام‌ها به عنوان خوانده شده (فقط پیام‌هایی که برای کاربر فعلی ارسال شده)
    if (appealRequest.chatMessages.length > 0) {
      let shouldSave = false;

      appealRequest.chatMessages.forEach((msg) => {
        // فقط پیام‌هایی که برای کاربر فعلی ارسال شده و هنوز خوانده نشده‌اند
        if (!msg.isRead && msg.senderId.toString() !== userAuth.id) {
          // اگر کاربر فعلی کارشناس است، پیام‌های متقاضی را خوانده علامت‌گذاری کن
          if (
            userAuth.role === ROLES.DISTRICT_TRANSFER_EXPERT &&
            msg.senderRole === "transferApplicant"
          ) {
            msg.isRead = true;
            shouldSave = true;
            console.log(
              "GET /api/chat-messages - Marking message as read for expert:",
              msg.messageId
            );
          }
          // اگر کاربر فعلی متقاضی است، پیام‌های کارشناس را خوانده علامت‌گذاری کن
          else if (
            userAuth.role === ROLES.TRANSFER_APPLICANT &&
            msg.senderRole === "districtTransferExpert"
          ) {
            msg.isRead = true;
            shouldSave = true;
            console.log(
              "GET /api/chat-messages - Marking message as read for applicant:",
              msg.messageId
            );
          }
        }
      });

      if (shouldSave) {
        await appealRequest.save();
        console.log("GET /api/chat-messages - Saved read status updates");
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        messages: appealRequest.chatMessages,
        chatStatus: appealRequest.chatStatus,
        lastActivity: appealRequest.lastChatActivity,
        assignedExpert: appealRequest.chatAssignedExpert,
      },
    });
  } catch (error) {
    console.error("خطا در دریافت پیام‌ها:", error);
    return NextResponse.json(
      { success: false, error: "خطای سرور داخلی" },
      { status: 500 }
    );
  }
}

// ارسال پیام جدید
export async function POST(request) {
  try {
    const userAuth = await authService.validateToken(request);
    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    await connectDB();

    const { appealRequestId, message, image } = await request.json();

    console.log("POST /api/chat-messages - appealRequestId:", appealRequestId);
    console.log("POST /api/chat-messages - userAuth:", {
      id: userAuth.id,
      role: userAuth.role,
      district: userAuth.district,
    });

    if (!appealRequestId || !message?.trim()) {
      return NextResponse.json(
        { success: false, error: "شناسه درخواست و متن پیام الزامی است" },
        { status: 400 }
      );
    }

    // یافتن درخواست
    console.log(
      "POST /api/chat-messages - Searching for AppealRequest with ID:",
      appealRequestId
    );
    const appealRequest = await AppealRequest.findById(appealRequestId);

    console.log(
      "POST /api/chat-messages - AppealRequest found:",
      !!appealRequest
    );
    if (appealRequest) {
      console.log(
        "POST /api/chat-messages - AppealRequest userId:",
        appealRequest.userId
      );
    }

    if (!appealRequest) {
      console.log(
        "POST /api/chat-messages - AppealRequest not found with ID:",
        appealRequestId
      );
      return NextResponse.json(
        { success: false, error: "درخواست یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی دسترسی ارسال پیام بر اساس منطقه صحیح
    let canSend = false;

    if (
      userAuth.role === ROLES.TRANSFER_APPLICANT &&
      appealRequest.userId.toString() === userAuth.id
    ) {
      // متقاضی می‌تواند برای درخواست خودش پیام بفرستد
      canSend = true;
    } else if (userAuth.role === ROLES.DISTRICT_TRANSFER_EXPERT) {
      // کارشناس منطقه: مقایسه districtCode درخواست با district کارشناس
      let userDistrictCode;
      if (typeof userAuth.district === "object" && userAuth.district?.code) {
        userDistrictCode = userAuth.district.code;
      } else if (typeof userAuth.district === "string") {
        const district = await District.findById(userAuth.district);
        userDistrictCode = district?.code;
      }

      if (appealRequest.districtCode === userDistrictCode) {
        canSend = true;
      }
    } else if (userAuth.role === ROLES.PROVINCE_TRANSFER_EXPERT) {
      // کارشناس استان: مقایسه provinceCode درخواست با province کارشناس
      let userProvinceCode;
      if (typeof userAuth.province === "object" && userAuth.province?.code) {
        userProvinceCode = userAuth.province.code;
      } else if (typeof userAuth.province === "string") {
        const province = await Province.findById(userAuth.province);
        userProvinceCode = province?.code;
      }

      if (appealRequest.provinceCode === userProvinceCode) {
        canSend = true;
      }
    }

    if (!canSend) {
      return NextResponse.json(
        {
          success: false,
          error:
            "عدم دسترسی - شما فقط می‌تونید با متقاضیان منطقه خودتان پیام تبادل کنید",
        },
        { status: 403 }
      );
    }

    // بررسی وضعیت گفتگو
    if (
      appealRequest.chatStatus === "closed" &&
      userAuth.role === ROLES.TRANSFER_APPLICANT
    ) {
      return NextResponse.json(
        { success: false, error: "گفتگو توسط کارشناس بسته شده است" },
        { status: 400 }
      );
    }

    // ایجاد پیام جدید
    const newMessage = {
      senderId: userAuth.id,
      senderRole: userAuth.role,
      message: message.trim(),
      image: image || undefined,
      sentAt: new Date(),
      isRead: false,
    };

    // اضافه کردن پیام
    appealRequest.chatMessages.push(newMessage);
    appealRequest.lastChatActivity = new Date();

    // اگر گفتگو بسته بود و کارشناس پیام فرستاد، باز کن
    if (
      appealRequest.chatStatus === "closed" &&
      userAuth.role === ROLES.DISTRICT_TRANSFER_EXPERT
    ) {
      appealRequest.chatStatus = "open";
    }

    // تعیین کارشناس مسئول اگر هنوز تعیین نشده
    if (
      !appealRequest.chatAssignedExpert &&
      userAuth.role === ROLES.DISTRICT_TRANSFER_EXPERT
    ) {
      appealRequest.chatAssignedExpert = userAuth.id;
    }

    await appealRequest.save();

    return NextResponse.json({
      success: true,
      message: "پیام با موفقیت ارسال شد",
      data: newMessage,
    });
  } catch (error) {
    console.error("خطا در ارسال پیام:", error);
    return NextResponse.json(
      { success: false, error: "خطای سرور داخلی" },
      { status: 500 }
    );
  }
}

// بستن/بازکردن گفتگو (فقط کارشناس)
export async function PATCH(request) {
  try {
    const userAuth = await authService.validateToken(request);
    if (!userAuth) {
      return NextResponse.json(
        { success: false, error: "عدم احراز هویت" },
        { status: 401 }
      );
    }

    // فقط کارشناس منطقه یا کارشناس استان می‌تواند وضعیت گفتگو را تغییر دهد
    if (
      userAuth.role !== ROLES.DISTRICT_TRANSFER_EXPERT &&
      userAuth.role !== ROLES.PROVINCE_TRANSFER_EXPERT
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "فقط کارشناس منطقه یا کارشناس استان می‌تواند وضعیت گفتگو را تغییر دهد",
        },
        { status: 403 }
      );
    }

    await connectDB();

    const { appealRequestId, action } = await request.json();

    if (!appealRequestId || !["close", "open"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "شناسه درخواست و عملیات معتبر الزامی است" },
        { status: 400 }
      );
    }

    // یافتن درخواست
    const appealRequest = await AppealRequest.findById(appealRequestId);

    if (!appealRequest) {
      return NextResponse.json(
        { success: false, error: "درخواست یافت نشد" },
        { status: 404 }
      );
    }

    // بررسی دسترسی بر اساس منطقه یا استان
    let hasAccess = false;

    if (userAuth.role === ROLES.DISTRICT_TRANSFER_EXPERT) {
      // کارشناس منطقه: بررسی districtCode
      let userDistrictCode;
      if (typeof userAuth.district === "object" && userAuth.district?.code) {
        userDistrictCode = userAuth.district.code;
      } else if (typeof userAuth.district === "string") {
        const district = await District.findById(userAuth.district);
        userDistrictCode = district?.code;
      }

      if (appealRequest.districtCode === userDistrictCode) {
        hasAccess = true;
      }
    } else if (userAuth.role === ROLES.PROVINCE_TRANSFER_EXPERT) {
      // کارشناس استان: بررسی provinceCode
      let userProvinceCode;
      if (typeof userAuth.province === "object" && userAuth.province?.code) {
        userProvinceCode = userAuth.province.code;
      } else if (typeof userAuth.province === "string") {
        const province = await Province.findById(userAuth.province);
        userProvinceCode = province?.code;
      }

      if (appealRequest.provinceCode === userProvinceCode) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: "عدم دسترسی - این درخواست متعلق به منطقه/استان شما نیست",
        },
        { status: 403 }
      );
    }

    // تغییر وضعیت گفتگو
    appealRequest.chatStatus = action === "close" ? "closed" : "open";
    appealRequest.lastChatActivity = new Date();

    await appealRequest.save();

    return NextResponse.json({
      success: true,
      message: `گفتگو با موفقیت ${action === "close" ? "بسته" : "باز"} شد`,
      data: { chatStatus: appealRequest.chatStatus },
    });
  } catch (error) {
    console.error("خطا در تغییر وضعیت گفتگو:", error);
    return NextResponse.json(
      { success: false, error: "خطای سرور داخلی" },
      { status: 500 }
    );
  }
}
