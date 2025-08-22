import dbConnect from "@/lib/dbConnect";
import OtpModel from "@/models/Otp";
import axios from "axios";
import { authService } from "@/lib/auth/authService";

export async function POST(req) {
  try {
    if (req.method !== "POST") {
      return Response.json({ message: "Method not allowed", status: 405 });
    }

    // احراز هویت کاربر
    const user = await authService.validateToken(req);
    if (!user) {
      return Response.json(
        { message: "لطفا وارد شوید", status: 401 }
      );
    }

    // بررسی دسترسی - کاربران transferApplicant نمی‌توانند کد تأیید درخواست کنند
    if (user.role === "transferApplicant") {
      return Response.json(
        { message: "کاربران متقاضی انتقال نمی‌توانند شماره موبایل خود را ویرایش کنند", status: 403 }
      );
    }

    await dbConnect();
    const body = await req.json();
    const { phone } = body;
    console.log("phone----->", phone);
    if (!phone) {
      throw new Error("This api protected and you can't access it !!");
    }
    const now = new Date();
    const expTime = now.getTime() + 300_000; // 5 Mins
    const code = Math.floor(Math.random() * 99999)
      .toString()
      .padEnd(5, "0");

    try {
      // ارسال پیامک با استفاده از axios
      await axios.post("https://sms.3300.ir/api/wsSend.ashx", {
        username: "Esari",
        password: "Saeed@435",
        line: "9830007206",
        mobile: phone,
        message: `کد اعتبارسنجی سامانه رصد : ${code}  `,
        type: 0,
        template: 0,
      });

      await dbConnect();

      const otp = await OtpModel.findOneAndUpdate({ phone }, { code, expTime });

      console.log("otp----->", otp);
      if (otp) {
        return Response.json({
          message: "کد با موفقیت ارسال شد :))",
          status: 200,
        });
      } else {
        const opt = await OtpModel.create({ code, phone, expTime });
        return Response.json({
          message: "User Create and Code Sent Successfully :))",
          status: 201,
        });
      }
    } catch (error) {
      console.log("Error sending SMS:", error);

      // حتی اگر ارسال پیامک با مشکل مواجه شد، کد را در دیتابیس ذخیره می‌کنیم
      const { isConnected } = await dbConnect();
      if (!isConnected) {
        return Response.json({
          message: "Error in connect to db :))",
          status: 500,
        });
      }

      const otp = await OtpModel.findOneAndUpdate({ phone }, { code, expTime });

      if (otp) {
        return Response.json({
          message: "کد با موفقیت ارسال شد :))",
          status: 200,
        });
      } else {
        const opt = await OtpModel.create({ code, phone, expTime });
        return Response.json({
          message: "User Create and Code Sent Successfully :))",
          status: 201,
        });
      }
    }
  } catch (error) {
    console.log("Catch error ---->", error);
    return Response.json({ message: "Sent error :))", status: 401 });
  }
}
