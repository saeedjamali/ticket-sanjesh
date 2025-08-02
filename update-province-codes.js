const mongoose = require("mongoose");

// اتصال به دیتابیس
const connectDB = async () => {
  try {
    // آدرس MongoDB خود را وارد کنید
    const mongoURI = "mongodb://localhost:27017/your-database-name"; // تغییر دهید

    await mongoose.connect(mongoURI);
    console.log("✅ اتصال به دیتابیس برقرار شد");
  } catch (error) {
    console.error("❌ خطا در اتصال به دیتابیس:", error);
    process.exit(1);
  }
};

// تعریف Schema ساده برای Student
const studentSchema = new mongoose.Schema({}, { strict: false });
const Student = mongoose.model("Student", studentSchema);

// تابع به‌روزرسانی provinceCode
const updateProvinceCodes = async () => {
  try {
    console.log("🔍 جستجو برای رکوردهای بدون provinceCode...");

    // شمارش رکوردهای بدون provinceCode
    const countWithoutProvince = await Student.countDocuments({
      $or: [
        { provinceCode: { $exists: false } },
        { provinceCode: null },
        { provinceCode: "" },
      ],
    });

    console.log(`📊 تعداد رکوردهای بدون provinceCode: ${countWithoutProvince}`);

    if (countWithoutProvince === 0) {
      console.log("✅ تمام رکوردها دارای provinceCode هستند");
      return;
    }

    // به‌روزرسانی رکوردها
    const result = await Student.updateMany(
      {
        $or: [
          { provinceCode: { $exists: false } },
          { provinceCode: null },
          { provinceCode: "" },
        ],
      },
      {
        $set: { provinceCode: "16" },
      }
    );

    console.log(`✅ ${result.modifiedCount} رکورد به‌روزرسانی شد`);
    console.log(`📊 آمار کامل:`, {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged,
    });

    // تایید نهایی
    const remainingWithoutProvince = await Student.countDocuments({
      $or: [
        { provinceCode: { $exists: false } },
        { provinceCode: null },
        { provinceCode: "" },
      ],
    });

    console.log(
      `🔍 رکوردهای باقی مانده بدون provinceCode: ${remainingWithoutProvince}`
    );
  } catch (error) {
    console.error("❌ خطا در به‌روزرسانی:", error);
  }
};

// تابع نمایش نمونه رکوردها (اختیاری)
const showSamples = async () => {
  try {
    console.log("\n📋 نمونه رکوردهای به‌روزرسانی شده:");
    const samples = await Student.find(
      { provinceCode: "16" },
      {
        nationalId: 1,
        firstName: 1,
        lastName: 1,
        provinceCode: 1,
        districtCode: 1,
      }
    ).limit(5);

    samples.forEach((student, index) => {
      console.log(
        `${index + 1}. ${student.firstName} ${student.lastName} - کد ملی: ${
          student.nationalId
        } - استان: ${student.provinceCode} - منطقه: ${student.districtCode}`
      );
    });
  } catch (error) {
    console.error("❌ خطا در نمایش نمونه‌ها:", error);
  }
};

// اجرای اصلی
const main = async () => {
  await connectDB();

  console.log("🚀 شروع فرآیند به‌روزرسانی provinceCode...\n");

  await updateProvinceCodes();
  await showSamples();

  console.log("\n✨ فرآیند به‌روزرسانی کامل شد");

  // بستن اتصال
  await mongoose.connection.close();
  console.log("🔐 اتصال دیتابیس بسته شد");
  process.exit(0);
};

// اجرای script
main().catch((error) => {
  console.error("❌ خطای کلی:", error);
  process.exit(1);
});
