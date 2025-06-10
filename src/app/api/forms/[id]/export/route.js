import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Form from "@/models/Form";
import FormSubmission from "@/models/FormSubmission";
import { authService } from "@/lib/auth/authService";
import * as XLSX from "xlsx";

// GET - دانلود گزارش‌های فرم در فرمت اکسل
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
        { success: false, message: "شما مجاز به دانلود گزارش این فرم نیستید" },
        { status: 403 }
      );
    }

    // Get all submissions for this form
    const submissions = await FormSubmission.find({ form: params.id })
      .populate({
        path: "submittedBy",
        select: "fullName email role district examCenter",
        populate: [
          { path: "district", select: "name" },
          { path: "examCenter", select: "name" },
        ],
      })
      .populate("reviewedBy", "fullName")
      .sort({ createdAt: -1 });

    // Prepare data for Excel
    const excelData = [];

    // Add header row
    const headers = [
      "ردیف",
      "نام ارسال‌کننده",
      "ایمیل",
      "نقش",
      "منطقه",
      "واحد سازمانی",
      "تاریخ ارسال",
      "وضعیت",
      "بررسی‌کننده",
      "تاریخ بررسی",
      "یادداشت بررسی",
    ];

    // Add field headers
    if (form.fields && form.fields.length > 0) {
      form.fields.forEach((field) => {
        headers.push(field.label);
      });
    }

    excelData.push(headers);

    // Add data rows
    submissions.forEach((submission, index) => {
      const row = [
        index + 1,
        submission.submittedBy?.fullName || "نامشخص",
        submission.submittedBy?.email || "",
        getRoleText(submission.submittedBy?.role),
        submission.submittedBy?.district?.name || "",
        submission.submittedBy?.examCenter?.name || "",
        formatDate(submission.createdAt),
        getStatusText(submission.status),
        submission.reviewedBy?.fullName || "",
        submission.reviewedAt ? formatDate(submission.reviewedAt) : "",
        submission.reviewNotes || "",
      ];

      // Add field responses
      if (form.fields && form.fields.length > 0) {
        form.fields.forEach((field) => {
          const response = submission.responses?.find(
            (r) => r.fieldId === field.id
          );
          let value = "";

          if (
            response &&
            response.value !== undefined &&
            response.value !== null
          ) {
            if (Array.isArray(response.value)) {
              // For checkbox - convert values to labels
              if (field.type === "checkbox") {
                const labels = response.value.map((val) => {
                  const option = field.options?.find(
                    (opt) => opt.value === val
                  );
                  return option ? option.label : val;
                });
                value = labels.join(", ");
              } else {
                value = response.value.join(", ");
              }
            } else {
              // For select/radio - convert value to label
              if (
                (field.type === "select" || field.type === "radio") &&
                field.options
              ) {
                const option = field.options.find(
                  (opt) => opt.value === response.value
                );
                value = option ? option.label : response.value.toString();
              } else {
                value = response.value.toString();
              }
            }
          }

          row.push(value);
        });
      }

      excelData.push(row);
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 5 }, // ردیف
      { wch: 20 }, // نام
      { wch: 25 }, // ایمیل
      { wch: 15 }, // نقش
      { wch: 15 }, // منطقه
      { wch: 25 }, // واحد سازمانی
      { wch: 15 }, // تاریخ ارسال
      { wch: 12 }, // وضعیت
      { wch: 20 }, // بررسی‌کننده
      { wch: 15 }, // تاریخ بررسی
      { wch: 30 }, // یادداشت
    ];

    // Add field column widths
    if (form.fields && form.fields.length > 0) {
      form.fields.forEach(() => {
        columnWidths.push({ wch: 20 });
      });
    }

    worksheet["!cols"] = columnWidths;

    // Style header row
    const headerRange = XLSX.utils.decode_range(worksheet["!ref"]);
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;

      worksheet[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "366092" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "گزارش‌های ارسالی");

    // Create analytics sheet
    if (submissions.length > 0) {
      const analyticsData = [];

      // Overview statistics
      analyticsData.push(["آمار کلی"]);
      analyticsData.push(["تعداد کل ارسال‌ها", submissions.length]);
      analyticsData.push([
        "تعداد تایید شده",
        submissions.filter((s) => s.status === "approved").length,
      ]);
      analyticsData.push([
        "تعداد رد شده",
        submissions.filter((s) => s.status === "rejected").length,
      ]);
      analyticsData.push([
        "تعداد در انتظار بررسی",
        submissions.filter((s) => s.status === "submitted").length,
      ]);
      analyticsData.push([]);

      // District statistics
      const districtStats = {};
      submissions.forEach((submission) => {
        const district = submission.submittedBy?.district?.name;
        if (district) {
          districtStats[district] = (districtStats[district] || 0) + 1;
        }
      });

      if (Object.keys(districtStats).length > 0) {
        analyticsData.push(["آمار مناطق"]);
        analyticsData.push(["منطقه", "تعداد ارسال"]);
        Object.entries(districtStats)
          .sort(([, a], [, b]) => b - a)
          .forEach(([district, count]) => {
            analyticsData.push([district, count]);
          });
        analyticsData.push([]);
      }

      // Field analysis
      if (form.fields && form.fields.length > 0) {
        analyticsData.push(["تحلیل فیلدها"]);

        form.fields.forEach((field) => {
          const responses = [];
          submissions.forEach((submission) => {
            const response = submission.responses?.find(
              (r) => r.fieldId === field.id
            );
            if (
              response &&
              response.value !== undefined &&
              response.value !== null &&
              response.value !== ""
            ) {
              responses.push(response.value);
            }
          });

          analyticsData.push([]);
          analyticsData.push([`فیلد: ${field.label}`]);
          analyticsData.push(["تعداد پاسخ", responses.length]);
          analyticsData.push([
            "درصد پاسخ‌دهی",
            `${((responses.length / submissions.length) * 100).toFixed(1)}%`,
          ]);

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

            analyticsData.push(["گزینه", "تعداد", "درصد"]);
            Object.entries(optionCounts)
              .sort(([, a], [, b]) => b - a)
              .forEach(([option, count]) => {
                const percentage = ((count / responses.length) * 100).toFixed(
                  1
                );
                analyticsData.push([option, count, `${percentage}%`]);
              });
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

            analyticsData.push(["گزینه", "تعداد"]);
            Object.entries(optionCounts)
              .sort(([, a], [, b]) => b - a)
              .forEach(([option, count]) => {
                analyticsData.push([option, count]);
              });
          } else if (field.type === "number") {
            const numericResponses = responses
              .map((r) => parseFloat(r))
              .filter((r) => !isNaN(r));

            if (numericResponses.length > 0) {
              const sum = numericResponses.reduce((a, b) => a + b, 0);
              const average = sum / numericResponses.length;
              const min = Math.min(...numericResponses);
              const max = Math.max(...numericResponses);
              const sorted = numericResponses.sort((a, b) => a - b);
              const median = sorted[Math.floor(sorted.length / 2)];

              analyticsData.push(["میانگین", average.toFixed(2)]);
              analyticsData.push(["میانه", median]);
              analyticsData.push(["حداقل", min]);
              analyticsData.push(["حداکثر", max]);
            }
          }
        });
      }

      const analyticsWorksheet = XLSX.utils.aoa_to_sheet(analyticsData);
      analyticsWorksheet["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(
        workbook,
        analyticsWorksheet,
        "آمار و تحلیل"
      );
    }

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Create filename
    const filename = `گزارش-${form.title
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.xlsx`;

    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
          filename
        )}`,
        "Content-Length": excelBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error exporting form submissions:", error);
    return NextResponse.json(
      {
        success: false,
        message: "خطا در دانلود گزارش",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper functions
function getRoleText(role) {
  const roleMap = {
    generalManager: "مدیر کل",
    provinceEducationExpert: "کارشناس آموزش استان",
    provinceTechExpert: "کارشناس فناوری استان",
    provinceEvalExpert: "کارشناس سنجش استان",
    districtEducationExpert: "کارشناس آموزش منطقه",
    districtTechExpert: "کارشناس فناوری منطقه",
    districtEvalExpert: "کارشناس سنجش منطقه",
    examCenterManager: "مدیر واحد سازمانی",
  };
  return roleMap[role] || role || "نامشخص";
}

function getStatusText(status) {
  const statusMap = {
    submitted: "ارسال شده",
    reviewed: "بررسی شده",
    approved: "تایید شده",
    rejected: "رد شده",
  };
  return statusMap[status] || status || "نامشخص";
}

function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return dateString;
  }
}
