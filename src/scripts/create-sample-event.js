const mongoose = require("mongoose");
const path = require("path");

// Import models - باید path را درست تنظیم کنیم
require("../models/Event");
require("../models/User");

const Event = mongoose.model("Event");
const User = mongoose.model("User");

// اتصال به دیتابیس
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/sabzlearn";

async function createSampleEvent() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // پیدا کردن یک مدیر سیستم
    const systemAdmin = await User.findOne({ role: "systemAdmin" });

    if (!systemAdmin) {
      console.error("No system admin found!");
      return;
    }

    console.log(
      "Found system admin:",
      systemAdmin.firstName,
      systemAdmin.lastName
    );

    // ایجاد رویداد نمونه
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // فردا
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // یک هفته بعد

    const sampleEvent = new Event({
      title: "رویداد آزمایشی - امتحانات نهایی",
      description:
        "این یک رویداد آزمایشی برای تست سیستم است. شامل اطلاعاتی درباره برگزاری امتحانات نهایی و مراحل مربوطه.",
      startDate: startDate,
      endDate: endDate,
      organizationScope: "سازمان سنجش آموزش کشور",
      targetRoles: ["all"], // برای همه کاربران
      targetProvinces: [], // بدون محدودیت استانی
      targetDistricts: [], // بدون محدودیت منطقه‌ای
      targetExamCenters: [], // بدون محدودیت واحد سازمانی
      priority: "medium",
      isActive: true,
      createdBy: systemAdmin._id,
    });

    await sampleEvent.save();
    console.log("Sample event created successfully!");
    console.log("Event details:", {
      id: sampleEvent._id,
      title: sampleEvent.title,
      startDate: sampleEvent.startDate,
      endDate: sampleEvent.endDate,
      targetRoles: sampleEvent.targetRoles,
    });

    // ایجاد رویداد دوم برای مدیران واحد سازمانی
    const examCenterEvent = new Event({
      title: "اطلاعیه ویژه مدیران واحدهای سازمانی",
      description:
        "این اطلاعیه مخصوص مدیران واحدهای سازمانی است و شامل دستورالعمل‌های مهم اجرایی می‌باشد.",
      startDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // پس‌فردا
      endDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 روز بعد
      organizationScope: "معاونت سنجش و ارزیابی",
      targetRoles: ["examCenterManager"], // فقط مدیران واحد سازمانی
      targetProvinces: [],
      targetDistricts: [],
      targetExamCenters: [],
      priority: "high",
      isActive: true,
      createdBy: systemAdmin._id,
    });

    await examCenterEvent.save();
    console.log("Exam center event created successfully!");

    await mongoose.disconnect();
    console.log("Script completed successfully!");
  } catch (error) {
    console.error("Error creating sample event:", error);
    await mongoose.disconnect();
  }
}

createSampleEvent();
