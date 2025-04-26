import mongoose from "mongoose";

const districtSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "نام منطقه الزامی است"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "کد منطقه الزامی است"],
      trim: true,
      unique: true,
    },
    province: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Province",
      required: [true, "استان الزامی است"],
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
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// افزودن ایندکس ترکیبی برای نام منطقه و استان
districtSchema.index({ name: 1, province: 1 }, { unique: true });

// قبل از حذف منطقه، تعداد مناطق استان را کاهش می‌دهیم
districtSchema.pre("remove", async function (next) {
  try {
    const Province = mongoose.model("Province");
    const province = await Province.findById(this.province);
    if (province) {
      await province.decrementDistrictsCount();
    }
    next();
  } catch (error) {
    next(error);
  }
});

// بعد از ایجاد منطقه، تعداد مناطق استان را افزایش می‌دهیم
districtSchema.post("save", async function () {
  try {
    const Province = mongoose.model("Province");
    const province = await Province.findById(this.province);
    if (province) {
      await province.incrementDistrictsCount();
    }
  } catch (error) {
    console.error("Error updating province districts count:", error);
  }
});

const District =
  mongoose.models.District || mongoose.model("District", districtSchema);

export default District;
