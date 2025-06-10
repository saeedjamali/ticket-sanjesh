import mongoose from "mongoose";

const FormFieldSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      "text",
      "number",
      "checkbox",
      "radio",
      "file",
      "textarea",
      "select",
      "date",
      "email",
      "tel",
    ],
  },
  label: {
    type: String,
    required: true,
  },
  placeholder: {
    type: String,
    default: "",
  },
  required: {
    type: Boolean,
    default: false,
  },
  options: [
    {
      label: String,
      value: String,
    },
  ], // For radio, checkbox, select fields
  validation: {
    min: Number,
    max: Number,
    minLength: Number,
    maxLength: Number,
    pattern: String,
  },
  defaultValue: mongoose.Schema.Types.Mixed,
  description: String,
  order: {
    type: Number,
    default: 0,
  },
});

const FormSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "draft",
    },
    targetRoles: [
      {
        type: String,
        enum: [
          "districtEducationExpert",
          "districtTechExpert",
          "districtEvalExpert",
          "examCenterManager",
        ],
        required: true,
      },
    ],
    targetDistricts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "District",
      },
    ],
    // Exam center specific filters (similar to announcements)
    targetGender: {
      type: String,
      enum: ["male", "female"],
      default: null,
    },
    targetPeriod: {
      type: String,
      enum: ["morning", "evening"],
      default: null,
    },
    targetOrganizationType: {
      type: String,
      enum: ["school", "university", "institute"],
      default: null,
    },
    fields: [FormFieldSchema],
    province: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Province",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByRole: {
      type: String,
      required: true,
      enum: [
        "generalManager",
        "provinceEducationExpert",
        "provinceTechExpert",
        "provinceEvalExpert",
      ],
    },
    // Form settings
    settings: {
      allowMultipleSubmissions: {
        type: Boolean,
        default: false,
      },
      showProgressBar: {
        type: Boolean,
        default: true,
      },
      submitButtonText: {
        type: String,
        default: "ارسال فرم",
      },
      successMessage: {
        type: String,
        default: "فرم با موفقیت ارسال شد",
      },
      requireLogin: {
        type: Boolean,
        default: true,
      },
    },
    // Statistics
    stats: {
      totalSubmissions: {
        type: Number,
        default: 0,
      },
      lastSubmissionAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
FormSchema.index({ createdBy: 1, status: 1 });
FormSchema.index({ targetRoles: 1, status: 1 });
FormSchema.index({ province: 1, status: 1 });
FormSchema.index({ createdByRole: 1 });

export default mongoose.models.Form || mongoose.model("Form", FormSchema);
