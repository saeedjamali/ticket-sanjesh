import OtpModel from "@/models/Otp";
import UserModel from "@/models/User";

export async function POST(req) {
  const body = await req.json();
  const { phone, code } = body;

  console.log("phone----->", phone);
  if (!phone) {
    throw new Error("phone is not corrected...");
  }
  try {
    const { isConnected } = await dbConnect();
    if (!isConnected) {
      return Response.json({ message: "خطا در اتصال به پایگاه", status: 500 });
    }
    const otp = await OtpModel.findOne({ phone, code });

    if (otp) {
      const date = new Date();
      const now = date.getTime();

      if (otp.expTime > now) {
        const fonuded = await UserModel.findOneAndUpdate(
          { phone },
          { $set: { phoneVerified: true } }
        );
        return Response.json({
          message: "کد صحیح می باشد",
          status: 200,
        });
      } else {
        return Response.json({ message: "کد منقضی شده است", status: 410 });
      }
    } else {
      return Response.json({ message: "کد اشتباه است", status: 409 });
    }
  } catch (error) {
    console.log(error);
    return Response.json({ message: "Unknown Error" }, { status: 500 });
  }
}
