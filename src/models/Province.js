import mongoose from "mongoose";

const provinceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "نام استان الزامی است"],
      trim: true,
      unique: true,
    },
    code: {
      type: String,
      required: [true, "کد استان الزامی است"],
      trim: true,
      unique: true,
    },
    districtsCount: {
      type: Number,
      default: 0,
    },
    academicYear: {
      type: String,
      required: false,
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

// افزایش تعداد مناطق استان
provinceSchema.methods.incrementDistrictsCount = async function () {
  this.districtsCount += 1;
  await this.save();
};

// کاهش تعداد مناطق استان
provinceSchema.methods.decrementDistrictsCount = async function () {
  if (this.districtsCount > 0) {
    this.districtsCount -= 1;
    await this.save();
  }
};

const Province =
  mongoose.models.Province || mongoose.model("Province", provinceSchema);

export default Province;
