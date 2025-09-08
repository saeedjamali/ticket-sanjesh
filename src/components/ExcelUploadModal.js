import { useState } from "react";
import { toast } from "react-hot-toast";
import {
  FaTimes,
  FaUpload,
  FaDownload,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFileExcel,
  FaInfoCircle,
} from "react-icons/fa";

export default function ExcelUploadModal({ isOpen, onClose, onSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // بررسی نوع فایل
      const allowedTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error("فرمت فایل باید Excel (.xlsx یا .xls) باشد");
        return;
      }

      // بررسی حجم فایل (حداکثر 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("حجم فایل نباید بیش از 10 مگابایت باشد");
        return;
      }

      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("لطفاً ابتدا فایل اکسل را انتخاب کنید");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(
        "/api/transfer-applicant-specs/excel-upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (response.ok) {
        setUploadResult(data);
        toast.success(
          `${data.summary.successCount} رکورد با موفقیت بروزرسانی شد`
        );

        if (onSuccess) {
          onSuccess(data);
        }
      } else {
        throw new Error(data.error || "خطا در بارگذاری فایل");
      }
    } catch (error) {
      console.error("خطا در بارگذاری:", error);
      toast.error(error.message || "خطا در بارگذاری فایل");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);

    try {
      const response = await fetch(
        "/api/transfer-applicant-specs/excel-upload",
        {
          method: "GET",
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "transfer-results-template.xlsx";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("قالب اکسل دانلود شد");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "خطا در دانلود قالب");
      }
    } catch (error) {
      console.error("خطا در دانلود قالب:", error);
      toast.error(error.message || "خطا در دانلود قالب");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUploadResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <FaFileExcel className="text-green-600" />
            بارگذاری نتایج انتقال از اکسل
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* دانلود قالب */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <FaInfoCircle className="text-blue-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-800 mb-2">
                  راهنمای استفاده
                </h3>
                <p className="text-sm text-blue-700 mb-3">
                  ابتدا قالب اکسل را دانلود کرده و اطلاعات را مطابق فرمت مشخص
                  شده وارد کنید.
                </p>
                <div className="text-xs text-blue-600 mb-3">
                  <p>• کد پرسنلی یا کد ملی: الزامی (برای شناسایی پرسنل)</p>
                  <p>
                    • وضعیت نتیجه نهایی: فاقد شرایط، مخالفت مبدا، موافقت موقت،
                    موافقت دائم، در حال بررسی
                  </p>
                  <p>• کد منطقه مقصد: 4 رقم (اختیاری)</p>
                  <p>• علت موافقت یا مخالفت: حداکثر 1000 کاراکتر (اختیاری)</p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                >
                  {downloadingTemplate ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaDownload />
                  )}
                  دانلود قالب اکسل
                </button>
              </div>
            </div>
          </div>

          {/* انتخاب فایل */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              انتخاب فایل اکسل
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="excel-file-input"
              />
              <label
                htmlFor="excel-file-input"
                className="cursor-pointer flex flex-col items-center"
              >
                <FaFileExcel className="h-12 w-12 text-green-500 mb-3" />
                <p className="text-gray-600 mb-1">
                  کلیک کنید یا فایل را بکشید و رها کنید
                </p>
                <p className="text-xs text-gray-500">
                  فرمت‌های مجاز: .xlsx, .xls (حداکثر 10MB)
                </p>
              </label>
            </div>

            {selectedFile && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <FaFileExcel className="text-green-600" />
                  <span className="text-sm text-green-800 font-medium">
                    {selectedFile.name}
                  </span>
                  <span className="text-xs text-green-600">
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* دکمه بارگذاری */}
          <div className="mb-6">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  در حال پردازش...
                </>
              ) : (
                <>
                  <FaUpload />
                  بارگذاری و پردازش فایل
                </>
              )}
            </button>
          </div>

          {/* نتایج بارگذاری */}
          {uploadResult && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
                <FaCheckCircle className="text-green-600" />
                نتایج پردازش
              </h3>

              {/* خلاصه نتایج */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {uploadResult.summary.totalRows}
                  </div>
                  <div className="text-sm text-blue-800">کل ردیف‌ها</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {uploadResult.summary.successCount}
                  </div>
                  <div className="text-sm text-green-800">موفق</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {uploadResult.summary.errorCount}
                  </div>
                  <div className="text-sm text-red-800">خطا</div>
                </div>
              </div>

              {/* رکوردهای موفق */}
              {uploadResult.results && uploadResult.results.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <FaCheckCircle className="text-green-600" />
                    رکوردهای بروزرسانی شده ({uploadResult.results.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            کد پرسنلی
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            نام و نام خانوادگی
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            فیلدهای بروزرسانی شده
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {uploadResult.results.map((result, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm text-gray-900">
                              {result.personnelCode}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900">
                              {result.firstName} {result.lastName}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-600">
                              {result.updatedFields.join(", ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* خطاها */}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <FaExclamationTriangle className="text-red-600" />
                    خطاها ({uploadResult.errors.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto bg-red-50 border border-red-200 rounded-lg p-3">
                    <ul className="text-sm text-red-700 space-y-1">
                      {uploadResult.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}

