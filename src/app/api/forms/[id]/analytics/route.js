import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Form from "@/models/Form";
import FormSubmission from "@/models/FormSubmission";
import District from "@/models/District";
import ExamCenter from "@/models/ExamCenter";
import { authService } from "@/lib/auth/authService";

// GET - دریافت آمار تحلیلی submissions فرم
export async function GET(request, { params }) {
  try {
    await connectDB();

    // Authenticate user
    const user = await authService.validateToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "لطفا وارد شوید" },
        { status: 401 }
      );
    }

    // Check permissions
    const canManageForms = [
      "generalManager",
      "provinceEducationExpert",
      "provinceTechExpert",
      "provinceEvalExpert",
    ].includes(user.role);

    if (!canManageForms) {
      return NextResponse.json(
        { success: false, message: "شما اجازه دسترسی به این بخش را ندارید" },
        { status: 403 }
      );
    }

    const form = await Form.findById(params.id);

    if (!form) {
      return NextResponse.json(
        { success: false, message: "فرم یافت نشد" },
        { status: 404 }
      );
    }

    // Check if user can view this form's submissions
    let canViewSubmissions = false;
    if (user.role === "generalManager") {
      canViewSubmissions = [
        "generalManager",
        "provinceEducationExpert",
        "provinceTechExpert",
        "provinceEvalExpert",
      ].includes(form.createdByRole);
    } else {
      canViewSubmissions = form.createdByRole === user.role;
    }

    if (!canViewSubmissions) {
      return NextResponse.json(
        { success: false, message: "شما مجاز به مشاهده آمار این فرم نیستید" },
        { status: 403 }
      );
    }

    // Get all submissions for this form
    const submissions = await FormSubmission.find({ form: params.id })
      .populate("submittedBy", "fullName email role")
      .populate("submittedByDistrict", "name")
      .populate("submittedByExamCenter", "name");

    // Calculate basic statistics
    const totalSubmissions = submissions.length;
    const statusCounts = {
      submitted: 0,
      reviewed: 0,
      approved: 0,
      rejected: 0,
    };

    submissions.forEach((submission) => {
      if (statusCounts.hasOwnProperty(submission.status)) {
        statusCounts[submission.status]++;
      }
    });

    // Calculate district statistics
    const districtStats = {};
    const examCenterStats = {};

    submissions.forEach((submission) => {
      if (submission.submittedByDistrict?.name) {
        const districtName = submission.submittedByDistrict.name;
        if (!districtStats[districtName]) {
          districtStats[districtName] = { name: districtName, count: 0 };
        }
        districtStats[districtName].count++;
      }

      if (submission.submittedByExamCenter?.name) {
        const examCenterName = submission.submittedByExamCenter.name;
        if (!examCenterStats[examCenterName]) {
          examCenterStats[examCenterName] = { name: examCenterName, count: 0 };
        }
        examCenterStats[examCenterName].count++;
      }
    });

    // Analyze form field responses
    const fieldAnalysis = {};

    if (form.fields && form.fields.length > 0) {
      form.fields.forEach((field) => {
        const responses = [];
        submissions.forEach((submission) => {
          if (submission.responses && submission.responses.length > 0) {
            const fieldResponse = submission.responses.find(
              (r) => r.fieldId === field.id
            );
            if (
              fieldResponse &&
              fieldResponse.value !== undefined &&
              fieldResponse.value !== null &&
              fieldResponse.value !== ""
            ) {
              responses.push(fieldResponse.value);
            }
          }
        });

        let statistics = {
          totalResponses: responses.length,
          responseRate:
            totalSubmissions > 0
              ? ((responses.length / totalSubmissions) * 100).toFixed(1)
              : 0,
        };

        if (field.type === "select" || field.type === "radio") {
          const optionCounts = {};
          responses.forEach((response) => {
            if (response) {
              // Convert value to label
              const option = field.options?.find(
                (opt) => opt.value === response
              );
              const label = option ? option.label : response;
              optionCounts[label] = (optionCounts[label] || 0) + 1;
            }
          });
          statistics.optionCounts = optionCounts;
          statistics.chartData = {
            labels: Object.keys(optionCounts),
            data: Object.values(optionCounts),
            type: "pie",
          };
        } else if (field.type === "checkbox") {
          const optionCounts = {};
          responses.forEach((response) => {
            if (Array.isArray(response)) {
              response.forEach((optionValue) => {
                // Convert value to label
                const option = field.options?.find(
                  (opt) => opt.value === optionValue
                );
                const label = option ? option.label : optionValue;
                optionCounts[label] = (optionCounts[label] || 0) + 1;
              });
            }
          });
          statistics.optionCounts = optionCounts;
          statistics.chartData = {
            labels: Object.keys(optionCounts),
            data: Object.values(optionCounts),
            type: "bar",
          };
        } else if (field.type === "number") {
          const numericResponses = responses
            .map((r) => parseFloat(r))
            .filter((r) => !isNaN(r));

          if (numericResponses.length > 0) {
            const sum = numericResponses.reduce((a, b) => a + b, 0);
            const average = sum / numericResponses.length;
            const min = Math.min(...numericResponses);
            const max = Math.max(...numericResponses);

            // Create histogram data
            const range = max - min;
            const binCount = Math.min(
              10,
              Math.max(3, Math.ceil(Math.sqrt(numericResponses.length)))
            );
            const binSize = range / binCount;
            const bins = Array(binCount).fill(0);
            const binLabels = [];

            for (let i = 0; i < binCount; i++) {
              const binStart = min + i * binSize;
              const binEnd = min + (i + 1) * binSize;
              binLabels.push(`${binStart.toFixed(1)}-${binEnd.toFixed(1)}`);
            }

            numericResponses.forEach((value) => {
              const binIndex = Math.min(
                Math.floor((value - min) / binSize),
                binCount - 1
              );
              bins[binIndex]++;
            });

            statistics.average = average.toFixed(2);
            statistics.min = min;
            statistics.max = max;
            statistics.median = numericResponses.sort((a, b) => a - b)[
              Math.floor(numericResponses.length / 2)
            ];
            statistics.chartData = {
              labels: binLabels,
              data: bins,
              type: "histogram",
              stats: {
                average: average.toFixed(2),
                min,
                max,
                median: statistics.median,
              },
            };
          }
        }

        fieldAnalysis[field.id] = {
          fieldId: field.id,
          label: field.label,
          type: field.type,
          statistics,
        };
      });
    }

    // Convert objects to arrays for easier frontend consumption
    const districtStatsArray = Object.values(districtStats).sort(
      (a, b) => b.count - a.count
    );
    const examCenterStatsArray = Object.values(examCenterStats).sort(
      (a, b) => b.count - a.count
    );

    return NextResponse.json({
      success: true,
      analytics: {
        overview: {
          totalSubmissions,
          statusCounts,
          uniqueDistricts: districtStatsArray.length,
          uniqueExamCenters: examCenterStatsArray.length,
        },
        districtStats: districtStatsArray,
        examCenterStats: examCenterStatsArray,
        fieldAnalysis: Object.values(fieldAnalysis),
      },
      form: {
        _id: form._id,
        title: form.title,
        description: form.description,
        createdByRole: form.createdByRole,
      },
    });
  } catch (error) {
    console.error("Error fetching form analytics:", error);
    return NextResponse.json(
      {
        success: false,
        message: "خطا در دریافت آمار فرم",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
