"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/context/UserContext";
import { toast } from "react-hot-toast";
import Link from "next/link";

export default function CreateAnnouncementPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUserContext();
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "low",
    targetRoles: [],
    targetDistricts: [],
  });
  const [districts, setDistricts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      fetchDistricts();
    }
  }, [user]);

  // Check if user has permission to create announcements
  useEffect(() => {
    if (
      !userLoading &&
      user &&
      ![
        "generalManager",
        "provinceEducationExpert",
        "provinceTechExpert",
      ].includes(user.role)
    ) {
      toast.error("شما دسترسی به ایجاد اطلاعیه ندارید");
      router.push("/dashboard");
    }
  }, [user, userLoading, router]);

  const fetchDistricts = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      let url = "/api/districts";

      // If user is province role, fetch only districts in their province
      if (user.province) {
        url = `/api/districts?province=${user.province}`;
      }

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`خطای دریافت مناطق: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setDistricts(data.districts);
      }
    } catch (error) {
      console.error("Error fetching districts:", error);
      toast.error("خطا در دریافت لیست مناطق");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleRoleChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setFormData({
        ...formData,
        targetRoles: [...formData.targetRoles, value],
      });
    } else {
      setFormData({
        ...formData,
        targetRoles: formData.targetRoles.filter((role) => role !== value),
      });
    }
  };

  const handleDistrictChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setFormData({
        ...formData,
        targetDistricts: [...formData.targetDistricts, value],
      });
    } else {
      setFormData({
        ...formData,
        targetDistricts: formData.targetDistricts.filter((id) => id !== value),
      });
    }
  };

  const selectAllDistricts = () => {
    setFormData({
      ...formData,
      targetDistricts: districts.map((district) => district._id),
    });
  };

  const deselectAllDistricts = () => {
    setFormData({
      ...formData,
      targetDistricts: [],
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      setError("لطفا یک فایل تصویر انتخاب کنید.");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("حجم تصویر باید کمتر از 5 مگابایت باشد.");
      return;
    }

    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error("عنوان اطلاعیه الزامی است");
      return;
    }

    if (!formData.content.trim()) {
      toast.error("محتوای اطلاعیه الزامی است");
      return;
    }

    if (formData.targetRoles.length === 0) {
      toast.error("انتخاب حداقل یک گروه هدف الزامی است");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Create FormData for multipart/form-data request
      const submitFormData = new FormData();
      submitFormData.append("title", formData.title);
      submitFormData.append("content", formData.content);
      submitFormData.append("priority", formData.priority);

      // Append each target role
      formData.targetRoles.forEach((role) => {
        submitFormData.append("targetRoles", role);
      });

      // Append each target district
      formData.targetDistricts.forEach((district) => {
        submitFormData.append("targetDistricts", district);
      });

      // Add image if selected
      if (selectedImage) {
        submitFormData.append("image", selectedImage);
      }

      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
        body: submitFormData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success("اطلاعیه با موفقیت ایجاد شد");
        router.push("/dashboard/announcements");
      } else {
        toast.error(data.message || "خطا در ایجاد اطلاعیه");
        setError(data.message || "خطا در ایجاد اطلاعیه");
      }
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast.error("خطا در ایجاد اطلاعیه");
      setError("خطا در ایجاد اطلاعیه. لطفا دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">ایجاد اطلاعیه جدید</h1>
        <Link
          href="/dashboard/announcements"
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md inline-flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 ml-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          بازگشت به لیست
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-sm p-6"
        encType="multipart/form-data"
      >
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Right column */}
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                عنوان اطلاعیه <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Priority */}
            <div>
              <label
                htmlFor="priority"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                فوریت
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="low">عادی</option>
                <option value="medium">فوری</option>
                <option value="high">آنی</option>
              </select>
            </div>

            {/* Target Roles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                گروه‌های هدف <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="role-district-education"
                    value="districtEducationExpert"
                    checked={formData.targetRoles.includes(
                      "districtEducationExpert"
                    )}
                    onChange={handleRoleChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="role-district-education"
                    className="mr-2 text-sm text-gray-700"
                  >
                    کارشناس سنجش منطقه
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="role-district-tech"
                    value="districtTechExpert"
                    checked={formData.targetRoles.includes(
                      "districtTechExpert"
                    )}
                    onChange={handleRoleChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="role-district-tech"
                    className="mr-2 text-sm text-gray-700"
                  >
                    کارشناس فناوری منطقه
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="role-exam-center"
                    value="examCenterManager"
                    checked={formData.targetRoles.includes("examCenterManager")}
                    onChange={handleRoleChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="role-exam-center"
                    className="mr-2 text-sm text-gray-700"
                  >
                    مسئول مرکز آزمون
                  </label>
                </div>
              </div>
            </div>

            {/* Image Upload */}
            <div className="form-group">
              <label
                htmlFor="image"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                تصویر اطلاعیه (اختیاری)
              </label>
              <input
                id="image"
                type="file"
                accept="image/*"
                className="text-sm text-gray-500 file:ml-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={handleImageChange}
              />
              <p className="mt-1 text-xs text-gray-500">
                حداکثر حجم فایل: 5 مگابایت
              </p>

              {previewUrl && (
                <div className="mt-2 relative">
                  <img
                    src={previewUrl}
                    alt="پیش نمایش"
                    className="max-h-48 max-w-full rounded-md border border-gray-200 object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl("");
                      setSelectedImage(null);
                    }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Left column */}
          <div className="space-y-6">
            {/* Content */}
            <div>
              <label
                htmlFor="content"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                محتوای اطلاعیه <span className="text-red-500">*</span>
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                rows={8}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              ></textarea>
            </div>

            {/* Target Districts */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  مناطق هدف
                </label>
                <div className="flex items-center space-x-2 space-x-reverse text-xs">
                  <button
                    type="button"
                    onClick={selectAllDistricts}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    انتخاب همه
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={deselectAllDistricts}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    حذف همه
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-500 mb-2">
                اگر منطقه‌ای انتخاب نشود، اطلاعیه برای تمام مناطق ارسال می‌شود.
              </div>
              <div className="border border-gray-200 rounded-md p-3 max-h-64 overflow-y-auto">
                {districts.length === 0 ? (
                  <div className="text-center py-2 text-sm text-gray-500">
                    هیچ منطقه‌ای یافت نشد.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {districts.map((district) => (
                      <div key={district._id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`district-${district._id}`}
                          value={district._id}
                          checked={formData.targetDistricts.includes(
                            district._id
                          )}
                          onChange={handleDistrictChange}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor={`district-${district._id}`}
                          className="mr-2 text-sm text-gray-700"
                        >
                          {district.name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit button */}
        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                در حال ایجاد...
              </>
            ) : (
              "ایجاد اطلاعیه"
            )}
          </button>
          <Link
            href="/dashboard/announcements"
            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            انصراف
          </Link>
        </div>
      </form>
    </div>
  );
}
