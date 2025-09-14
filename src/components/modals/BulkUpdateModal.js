"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import {
  FaTimes,
  FaUpload,
  FaDownload,
  FaInfoCircle,
  FaSpinner,
  FaFileExcel,
} from "react-icons/fa";
import * as XLSX from "xlsx";

const BulkUpdateModal = ({ isOpen, onClose, onUpdate }) => {
  const [selectedField, setSelectedField] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState([]);

  // فیلدهای قابل بروزرسانی
  const updatableFields = [
    { key: "currentRequestStatus", label: "وضعیت درخواست فعلی" },
    { key: "finalTransferDestinationCode", label: "کد منطقه مقصد نهایی" },
    { key: "finalResultReason", label: "علت/توضیحات نتیجه" },
    { key: "approvedClauses", label: "بندهای موافقت شده" },
    { key: "approvedScore", label: "امتیاز تایید شده" },
    { key: "effectiveYears", label: "سنوات موثر" },
    { key: "medicalCommissionCode", label: "کد رای کمیسیون پزشکی" },
    { key: "medicalCommissionVerdict", label: "رای کمیسیون پزشکی" },
    { key: "candidDestination", label: "منطقه پیشنهادی کاندید" },
    { key: "isActive", label: "وضعیت فعال/غیرفعال" },
    { key: "fieldCode", label: "کد رشته شغلی" },
    { key: "employmentField", label: "رشته شغلی" },
    { key: "currentWorkPlaceCode", label: "کد محل خدمت فعلی" },
    { key: "sourceDistrictCode", label: "کد منطقه مبدا" },
  ];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // بررسی نوع فایل
    if (
      !selectedFile.name.endsWith(".xlsx") &&
      !selectedFile.name.endsWith(".xls")
    ) {
      toast.error("لطفاً فقط فایل اکسل آپلود کنید");
      return;
    }

    setFile(selectedFile);

    // خواندن و نمایش پیش‌نمایش فایل
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // بررسی ساختار فایل
        if (jsonData.length < 2) {
          toast.error("فایل باید حداقل یک ردیف داده داشته باشد");
          return;
        }

        const headers = jsonData[0];
        if (headers.length !== 3) {
          toast.error("فایل باید دقیقاً 3 ستون داشته باشد");
          return;
        }

        // تبدیل به آرایه آبجکت برای نمایش
        const rows = jsonData.slice(1, 6); // نمایش 5 ردیف اول
        const preview = rows.map((row) => ({
          personnelCode: row[0] || "",
          nationalId: row[1] || "",
          value: row[2] || "",
        }));

        setPreviewData(preview);
      } catch (error) {
        console.error("Error reading file:", error);
        toast.error("خطا در خواندن فایل");
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      ["کد پرسنلی", "کد ملی", "مقدار جدید"],
      ["30195889", "0901266191", "نمونه مقدار"],
      ["12345678", "1234567890", "نمونه مقدار 2"],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");

    // تنظیم عرض ستون‌ها
    ws["!cols"] = [
      { wch: 15 }, // کد پرسنلی
      { wch: 15 }, // کد ملی
      { wch: 20 }, // مقدار جدید
    ];

    XLSX.writeFile(wb, "bulk-update-template.xlsx");
    toast.success("فایل نمونه دانلود شد");
  };

  const handleSubmit = async () => {
    if (!selectedField) {
      toast.error("لطفاً فیلد مورد نظر را انتخاب کنید");
      return;
    }

    if (!file) {
      toast.error("لطفاً فایل اکسل را آپلود کنید");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("field", selectedField);

      const response = await fetch(
        "/api/transfer-applicant-specs/bulk-update",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "خطا در بروزرسانی");
      }

      toast.success(`${result.updatedCount} رکورد با موفقیت بروزرسانی شد`);

      if (result.errors && result.errors.length > 0) {
        console.warn("Update errors:", result.errors);
        toast.error(`${result.errors.length} رکورد دارای خطا بودند`);
      }

      // بستن مدال و بروزرسانی لیست
      onClose();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Bulk update error:", error);
      toast.error(error.message || "خطا در بروزرسانی دسته‌ای");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedField("");
    setFile(null);
    setPreviewData([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaUpload className="text-blue-600" />
            بروزرسانی دسته‌ای اطلاعات
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* راهنما */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FaInfoCircle className="text-blue-600 mt-1 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">راهنمای استفاده:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>ابتدا فیلد مورد نظر برای بروزرسانی را انتخاب کنید</li>
                  <li>فایل نمونه را دانلود کرده و با اطلاعات خود پر کنید</li>
                  <li>
                    فایل باید 3 ستون داشته باشد: کد پرسنلی، کد ملی، مقدار جدید
                  </li>
                  <li>فقط فایل‌های .xlsx و .xls پذیرفته می‌شوند</li>
                </ul>
              </div>
            </div>
          </div>

          {/* انتخاب فیلد */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              فیلد مورد نظر برای بروزرسانی
            </label>
            <select
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">انتخاب کنید...</option>
              {updatableFields.map((field) => (
                <option key={field.key} value={field.key}>
                  {field.label}
                </option>
              ))}
            </select>
          </div>

          {/* دانلود فایل نمونه */}
          <div>
            <button
              onClick={handleDownloadTemplate}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <FaDownload className="h-4 w-4" />
              دانلود فایل نمونه
            </button>
          </div>

          {/* آپلود فایل */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              آپلود فایل اکسل
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <FaFileExcel className="mx-auto h-12 w-12 text-green-600 mb-4" />
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  {file
                    ? file.name
                    : "فایل اکسل خود را اینجا بکشید یا کلیک کنید"}
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors inline-block"
                >
                  انتخاب فایل
                </label>
              </div>
            </div>
          </div>

          {/* پیش‌نمایش داده‌ها */}
          {previewData.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">
                پیش‌نمایش داده‌ها (5 ردیف اول)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">
                        کد پرسنلی
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">
                        کد ملی
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">
                        مقدار جدید
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-b">
                        <td className="px-4 py-2 text-sm text-gray-800">
                          {row.personnelCode}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-800">
                          {row.nationalId}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-800">
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            انصراف
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || !selectedField || !file}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            {uploading ? (
              <>
                <FaSpinner className="h-4 w-4 animate-spin" />
                در حال بروزرسانی...
              </>
            ) : (
              <>
                <FaUpload className="h-4 w-4" />
                شروع بروزرسانی
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkUpdateModal;
