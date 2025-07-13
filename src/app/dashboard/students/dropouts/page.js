"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import {
  FaSearch,
  FaEdit,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaInfoCircle,
} from "react-icons/fa";

export default function DropoutStudentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [summary, setSummary] = useState({});
  const [dropoutReasons, setDropoutReasons] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    dropoutReasonId: "",
    description: "",
  });

  useEffect(() => {
    fetchDropoutStudents();
    fetchDropoutReasons();
  }, []);

  useEffect(() => {
    // فیلتر کردن دانش‌آموزان بر اساس جستجو
    if (searchTerm) {
      const filtered = students.filter(
        (student) =>
          student.nationalId.includes(searchTerm) ||
          student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.fatherName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(students);
    }
  }, [searchTerm, students]);

  const fetchDropoutStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/students/dropouts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.data || []);
        setSummary(data.summary || {});
      } else {
        const errorData = await response.json();
        alert(errorData.error || "خطا در دریافت دانش‌آموزان بازمانده از تحصیل");
      }
    } catch (error) {
      console.error("Error fetching dropout students:", error);
      alert("خطا در برقراری ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  const fetchDropoutReasons = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/dropout-reasons/list", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDropoutReasons(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching dropout reasons:", error);
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student._id);
    setFormData({
      dropoutReasonId: student.dropoutInfo?.reason?._id || "",
      description: student.dropoutInfo?.description || "",
    });
  };

  const handleSave = async (student) => {
    if (!formData.dropoutReasonId) {
      alert("لطفا علت بازمانده را انتخاب کنید");
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/students/dropouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId: student._id,
          dropoutReasonId: formData.dropoutReasonId,
          description: formData.description,
        }),
      });

      if (response.ok) {
        await fetchDropoutStudents();
        handleCancel();
        alert("علت بازمانده با موفقیت ثبت شد");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "خطا در ثبت علت بازمانده");
      }
    } catch (error) {
      console.error("Error saving dropout reason:", error);
      alert("خطا در برقراری ارتباط با سرور");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingStudent(null);
    setFormData({
      dropoutReasonId: "",
      description: "",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "confirmed":
        return "تایید شده";
      case "rejected":
        return "رد شده";
      default:
        return "در انتظار";
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          دانش‌آموزان بازمانده از تحصیل
        </h1>
        <p className="text-sm text-gray-600">
          لیست دانش‌آموزانی که در سال قبل در واحد سازمانی شما ثبت نام داشتند اما
          در سال جاری در هیچ جا ثبت نام نکرده‌اند
        </p>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <FaInfoCircle className="text-blue-500 ml-2" />
              <div>
                <p className="text-sm text-blue-600">کل دانش‌آموزان سال قبل</p>
                <p className="text-2xl font-bold text-blue-800">
                  {summary.previousYearTotal?.toLocaleString("fa-IR") || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <FaCheck className="text-green-500 ml-2" />
              <div>
                <p className="text-sm text-green-600">ثبت نام در سال جاری</p>
                <p className="text-2xl font-bold text-green-800">
                  {summary.currentYearRegistered?.toLocaleString("fa-IR") || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <FaExclamationTriangle className="text-red-500 ml-2" />
              <div>
                <p className="text-sm text-red-600">بازمانده از تحصیل</p>
                <p className="text-2xl font-bold text-red-800">
                  {summary.dropoutCount?.toLocaleString("fa-IR") || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center">
              <FaEdit className="text-purple-500 ml-2" />
              <div>
                <p className="text-sm text-purple-600">ثبت شده علت</p>
                <p className="text-2xl font-bold text-purple-800">
                  {summary.withReasonCount?.toLocaleString("fa-IR") || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="جستجو بر اساس کد ملی، نام، نام خانوادگی یا نام پدر"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <FaSearch className="absolute right-3 top-3 text-gray-400" />
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {students.length === 0
              ? "هیچ دانش‌آموز بازمانده‌ای یافت نشد"
              : "نتیجه‌ای برای جستجوی شما یافت نشد"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    کد ملی
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    نام و نام خانوادگی
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    نام پدر
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    پایه سال قبل
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    رشته سال قبل
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    علت بازمانده
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    وضعیت
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {student.nationalId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {student.firstName} {student.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {student.fatherName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {student.previousGrade}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {student.previousField}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-center">
                      {editingStudent === student._id ? (
                        <div className="space-y-2">
                          <select
                            value={formData.dropoutReasonId}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                dropoutReasonId: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">انتخاب علت...</option>
                            {dropoutReasons.map((reason) => (
                              <option key={reason._id} value={reason._id}>
                                {reason.displayTitle}
                              </option>
                            ))}
                          </select>
                          <textarea
                            value={formData.description}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                description: e.target.value,
                              })
                            }
                            placeholder="توضیحات (اختیاری)"
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ) : student.dropoutInfo ? (
                        <div>
                          <p className="font-medium">
                            {student.dropoutInfo.reason.title}
                          </p>
                          {student.dropoutInfo.description && (
                            <p className="text-xs text-gray-500 mt-1">
                              {student.dropoutInfo.description}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">ثبت نشده</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {student.dropoutInfo ? (
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                            student.dropoutInfo.status
                          )}`}
                        >
                          {getStatusText(student.dropoutInfo.status)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                      {editingStudent === student._id ? (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleSave(student)}
                            disabled={saving}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            title="ذخیره"
                          >
                            <FaCheck />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="text-gray-600 hover:text-gray-900"
                            title="انصراف"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(student)}
                          className="text-blue-600 hover:text-blue-900"
                          title="ثبت/ویرایش علت"
                        >
                          <FaEdit />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
