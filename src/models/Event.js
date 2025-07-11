import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "عنوان رویداد الزامی است"],
      trim: true,
      maxlength: [200, "عنوان رویداد نمی‌تواند بیشتر از 200 کاراکتر باشد"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "توضیحات نمی‌تواند بیشتر از 1000 کاراکتر باشد"],
    },
    startDate: {
      type: Date,
      required: [true, "تاریخ شروع الزامی است"],
    },
    endDate: {
      type: Date,
      required: [true, "تاریخ پایان الزامی است"],
      validate: {
        validator: function (value) {
          return value > this.startDate;
        },
        message: "تاریخ پایان باید بعد از تاریخ شروع باشد",
      },
    },
    organizationScope: {
      type: String,
      required: [true, "حوزه مجری الزامی است"],
      trim: true,
    },
    targetRoles: {
      type: [String],
      required: [true, "حداقل یک نقش هدف باید انتخاب شود"],
      validate: {
        validator: function (roles) {
          const validRoles = [
            "systemAdmin",
            "generalManager",
            "examCenterManager",
            "all",
          ];
          return roles.every((role) => validRoles.includes(role));
        },
        message: "نقش‌های انتخاب شده معتبر نیستند",
      },
      default: [],
    },
    targetProvinces: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Province",
      },
    ],
    targetDistricts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "District",
      },
    ],
    targetExamCenters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExamCenter",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// ایندکس‌ها برای بهبود عملکرد
eventSchema.index({ startDate: 1, endDate: 1 });
eventSchema.index({ targetRoles: 1 });
eventSchema.index({ isActive: 1 });
eventSchema.index({ createdAt: -1 });

// متد استاتیک برای دریافت رویدادهای فعال
eventSchema.statics.getActiveEvents = function (
  userRole,
  userProvince,
  userDistrict,
  userExamCenter
) {
  const now = new Date();
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

  console.log("getActiveEvents called with:", {
    userRole,
    userProvince,
    userDistrict,
    userExamCenter,
  });

  // فیلتر پایه: رویدادهای فعال که هنوز 10 روز از پایانشان نگذشته
  let filter = {
    isActive: true,
    endDate: { $gte: tenDaysAgo },
  };

  // فیلتر نقش - باید رویداد برای این نقش یا همه باشد
  filter.$or = [{ targetRoles: userRole }, { targetRoles: "all" }];

  // فیلتر جغرافیایی براساس نقش کاربر
  if (userRole === "examCenterManager" && userExamCenter) {
    // مدیران واحد سازمانی: رویدادهای مخصوص واحدشان، منطقه‌شان، استانشان، یا عمومی
    filter.$or.push(
      { targetExamCenters: userExamCenter },
      { targetDistricts: userDistrict },
      { targetProvinces: userProvince },
      {
        $and: [
          { targetExamCenters: { $size: 0 } },
          { targetDistricts: { $size: 0 } },
          { targetProvinces: { $size: 0 } },
        ],
      }
    );
  } else if (userRole === "generalManager" && userProvince) {
    // مدیران کل: رویدادهای مخصوص استانشان یا عمومی
    filter.$or.push(
      { targetProvinces: userProvince },
      { targetProvinces: { $size: 0 } }
    );
  }

  console.log("Final filter:", JSON.stringify(filter, null, 2));

  return this.find(filter)
    .populate("createdBy", "firstName lastName")
    .populate("targetProvinces", "name code")
    .populate("targetDistricts", "name code")
    .populate("targetExamCenters", "name code")
    .sort({ priority: -1, startDate: 1 })
    .lean()
    .then((events) => {
      console.log(`Found ${events.length} events for user role: ${userRole}`);
      return events.map((event) => {
        const eventDoc = new this(event);
        const status = eventDoc.getStatus();
        return {
          ...event,
          statusInfo: status,
        };
      });
    });
};

// متد instance برای تعیین وضعیت رنگ
eventSchema.methods.getStatus = function () {
  const now = new Date();
  const oneDayInMs = 24 * 60 * 60 * 1000;
  const oneDayBeforeEnd = new Date(this.endDate.getTime() - oneDayInMs);

  if (now < this.startDate) {
    return { status: "upcoming", color: "blue", label: "آینده" };
  } else if (now >= this.startDate && now <= this.endDate) {
    if (now >= oneDayBeforeEnd) {
      return { status: "ending_soon", color: "orange", label: "در حال پایان" };
    }
    return { status: "active", color: "green", label: "در حال انجام" };
  } else {
    return { status: "expired", color: "red", label: "پایان یافته" };
  }
};

const Event = mongoose.models.Event || mongoose.model("Event", eventSchema);

export default Event;
