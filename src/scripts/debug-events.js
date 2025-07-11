const mongoose = require("mongoose");
const Event = require("../models/Event").default;
const User = require("../models/User").default;

async function debugEvents() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/ticket"
    );
    console.log("Connected to MongoDB");

    // دریافت تمام رویدادها
    const allEvents = await Event.find().lean();
    console.log("\n=== همه رویدادها ===");
    console.log(`تعداد کل رویدادها: ${allEvents.length}`);

    allEvents.forEach((event, index) => {
      console.log(`\n--- رویداد ${index + 1} ---`);
      console.log(`عنوان: ${event.title}`);
      console.log(`targetRoles: ${JSON.stringify(event.targetRoles)}`);
      console.log(`targetProvinces: ${JSON.stringify(event.targetProvinces)}`);
      console.log(`targetDistricts: ${JSON.stringify(event.targetDistricts)}`);
      console.log(
        `targetExamCenters: ${JSON.stringify(event.targetExamCenters)}`
      );
      console.log(`تاریخ شروع: ${event.startDate}`);
      console.log(`تاریخ پایان: ${event.endDate}`);
      console.log(`وضعیت: ${event.isActive}`);
    });

    // پیدا کردن کاربران examCenterManager
    const examCenterManagers = await User.find({ role: "examCenterManager" })
      .populate("province")
      .populate("district")
      .populate("examCenter")
      .lean();

    console.log(`\n=== کاربران examCenterManager ===`);
    console.log(`تعداد: ${examCenterManagers.length}`);

    examCenterManagers.forEach((user, index) => {
      console.log(`\n--- کاربر ${index + 1} ---`);
      console.log(`نام: ${user.firstName} ${user.lastName}`);
      console.log(`ایمیل: ${user.email}`);
      console.log(
        `استان: ${user.province?.name || "تعیین نشده"} (${
          user.province?._id || "ندارد"
        })`
      );
      console.log(
        `منطقه: ${user.district?.name || "تعیین نشده"} (${
          user.district?._id || "ندارد"
        })`
      );
      console.log(
        `واحد: ${user.examCenter?.name || "تعیین نشده"} (${
          user.examCenter?._id || "ندارد"
        })`
      );
    });

    // تست فیلتریگ برای اولین examCenterManager
    if (examCenterManagers.length > 0) {
      const testUser = examCenterManagers[0];
      console.log(
        `\n=== تست فیلتریگ برای ${testUser.firstName} ${testUser.lastName} ===`
      );

      const filteredEvents = await Event.getActiveEvents(
        testUser.role,
        testUser.province?._id,
        testUser.district?._id,
        testUser.examCenter?._id
      );

      console.log(`تعداد رویدادهای فیلتر شده: ${filteredEvents.length}`);
      filteredEvents.forEach((event, index) => {
        console.log(`${index + 1}. ${event.title}`);
      });
    }

    // بررسی فیلتر برای رویدادهای مخصوص examCenterManager
    console.log("\n=== رویدادهای مخصوص examCenterManager ===");
    const examCenterEvents = await Event.find({
      targetRoles: "examCenterManager",
    }).lean();

    console.log(`تعداد: ${examCenterEvents.length}`);
    examCenterEvents.forEach((event, index) => {
      console.log(`\n--- رویداد examCenterManager ${index + 1} ---`);
      console.log(`عنوان: ${event.title}`);
      console.log(`targetRoles: ${JSON.stringify(event.targetRoles)}`);
      console.log(`targetProvinces: ${JSON.stringify(event.targetProvinces)}`);
      console.log(`targetDistricts: ${JSON.stringify(event.targetDistricts)}`);
      console.log(
        `targetExamCenters: ${JSON.stringify(event.targetExamCenters)}`
      );
      console.log(`isActive: ${event.isActive}`);
      console.log(`تاریخ پایان: ${event.endDate}`);

      // محاسبه 10 روز قبل
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      console.log(`آیا بعد از 10 روز قبل است؟ ${event.endDate >= tenDaysAgo}`);
    });
  } catch (error) {
    console.error("خطا در debug:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nاتصال به MongoDB قطع شد");
  }
}

debugEvents();
