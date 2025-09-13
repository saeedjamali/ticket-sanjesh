import React, { useState, useEffect } from "react";
import { FaInfoCircle, FaSpinner } from "react-icons/fa";

// کامپوننت نمایش بندهای موافقت شده با جزئیات
const ApprovedClausesDisplay = ({
  approvedClauses,
  variant = "default", // 'default', 'compact', 'detailed'
  showTitle = true,
  className = "",
}) => {
  const [clauseDetails, setClauseDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // تابع پارس کردن کدهای بند
  const parseClauseCodes = (clausesString) => {
    if (!clausesString) return [];
    return clausesString
      .split("+")
      .map((code) => code.trim())
      .filter((code) => code);
  };

  // تابع دریافت جزئیات بندها از API
  const fetchClauseDetails = async (codes) => {
    if (!codes || codes.length === 0) return [];

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/transfer-reasons/by-codes?codes=${codes.join(",")}`
      );
      const data = await response.json();

      if (data.success) {
        return data.data || [];
      } else {
        throw new Error(data.error || "خطا در دریافت اطلاعات");
      }
    } catch (err) {
      console.error("Error fetching clause details:", err);
      setError("خطا در دریافت جزئیات بندها");
      return [];
    } finally {
      setLoading(false);
    }
  };

  // اثر برای دریافت جزئیات بندها هنگام تغییر approvedClauses
  useEffect(() => {
    const codes = parseClauseCodes(approvedClauses);
    if (codes.length > 0) {
      fetchClauseDetails(codes).then(setClauseDetails);
    } else {
      setClauseDetails([]);
    }
  }, [approvedClauses]);

  // اگر هیچ بندی وجود نداشته باشد
  if (!approvedClauses) return null;

  const codes = parseClauseCodes(approvedClauses);
  if (codes.length === 0) return null;

  // نمایش کامپکت (فقط کدها)
  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        {showTitle && (
          <span className="text-sm font-medium text-gray-600">
            بندهای موافقت شده:
          </span>
        )}
        <span className="font-mono text-sm bg-blue-50 text-blue-700 rounded px-2 py-1">
          {approvedClauses}
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {showTitle && (
        <div className="flex items-center gap-2">
          <FaInfoCircle className="text-blue-500 text-sm" />
          <span className="font-medium text-gray-700">بندهای موافقت شده:</span>
        </div>
      )}

      {/* نمایش کدهای خام */}
      {/* <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">کدها:</span>
        <span className="font-mono text-sm bg-blue-50 text-blue-700 rounded px-2 py-1">
          {approvedClauses}
        </span>
      </div> */}

      {/* نمایش وضعیت بارگذاری یا خطا */}
      {loading && (
        <div className="flex items-center gap-2 text-blue-600">
          <FaSpinner className="animate-spin" />
          <span className="text-sm">در حال دریافت جزئیات بندها...</span>
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm bg-red-50 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* نمایش جزئیات بندها */}
      {!loading && !error && clauseDetails.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-1">
            جزئیات بندها:
          </h4>

          <div className="space-y-3">
            {clauseDetails.map((clause, index) => (
              <div
                key={clause.code || index}
                className="bg-gray-50 rounded-lg p-3 border border-gray-200"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* کد بند */}
                  {/* <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      کد بند
                    </label>
                    <p className="font-mono text-sm text-blue-600 font-medium">
                      {clause.code}
                    </p>
                  </div> */}

                  {/* عنوان */}
                  {/* <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      عنوان
                    </label>
                    <p className="text-sm text-gray-800 font-medium">
                      {clause.title || "عنوان ثبت نشده"}
                    </p>
                  </div> */}

                  {/* عنوان دلیل */}
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      عنوان بند
                    </label>
                    <p className="text-sm text-gray-800">
                      {clause.title} -{" "}
                      {clause.reasonTitle || "عنوان دلیل ثبت نشده"}
                    </p>
                  </div>

                  {/* توضیحات */}
                  {clause.description && (
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        توضیحات
                      </label>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {clause.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* اگر کدهایی پیدا نشدند */}
      {!loading && !error && clauseDetails.length === 0 && codes.length > 0 && (
        <div className="text-amber-600 text-sm bg-amber-50 rounded px-3 py-2">
          هیچ اطلاعاتی برای کدهای ارسالی پیدا نشد
        </div>
      )}

      {/* اگر تعداد کدهای پیدا شده کمتر از کدهای ارسالی باشد */}
      {!loading &&
        !error &&
        clauseDetails.length > 0 &&
        clauseDetails.length < codes.length && (
          <div className="text-amber-600 text-xs">
            توجه: برخی از کدهای ارسالی پیدا نشدند ({clauseDetails.length} از{" "}
            {codes.length})
          </div>
        )}
    </div>
  );
};

export default ApprovedClausesDisplay;
