import mongoose from "mongoose";

const FormSubmissionSchema = new mongoose.Schema(
  {
    form: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form",
      required: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    submittedByRole: {
      type: String,
      required: true,
    },
    // Additional submitter information
    submittedByDistrict: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "District",
    },
    submittedByExamCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamCenter",
    },
    responses: [
      {
        fieldId: {
          type: String,
          required: true,
        },
        fieldType: {
          type: String,
          required: true,
        },
        fieldLabel: {
          type: String,
          required: true,
        },
        value: mongoose.Schema.Types.Mixed, // Can store any type of value
        files: [
          {
            // For file uploads
            originalName: String,
            filename: String,
            path: String,
            size: Number,
            mimetype: String,
          },
        ],
      },
    ],
    status: {
      type: String,
      enum: ["submitted", "reviewed", "approved", "rejected"],
      default: "submitted",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: Date,
    reviewNotes: String,
    submissionIP: String,
    submissionUserAgent: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
FormSubmissionSchema.index({ form: 1, submittedBy: 1 });
FormSubmissionSchema.index({ form: 1, status: 1 });
FormSubmissionSchema.index({ submittedBy: 1, createdAt: -1 });

export default mongoose.models.FormSubmission ||
  mongoose.model("FormSubmission", FormSubmissionSchema);
