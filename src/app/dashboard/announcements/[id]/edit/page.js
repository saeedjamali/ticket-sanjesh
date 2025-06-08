"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUserContext } from "@/context/UserContext";
import { toast } from "react-hot-toast";
import Link from "next/link";

export default function EditAnnouncementPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { user, loading: userLoading } = useUserContext();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    imageUrl: "",
    priority: "low",
    targetRoles: [],
    targetDistricts: [],
    targetGender: "",
    targetPeriod: "",
    targetOrganizationType: "",
    status: "active",
  });
  const [districts, setDistricts] = useState([]);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDistricts();
      fetchAnnouncementDetails();
    }
  }, [user, id]);

  // Load image when announcement details are fetched
  useEffect(() => {
    if (formData.imageUrl) {
      getImage();
    }
  }, [formData.imageUrl]);

  // Check if user has permission to edit announcements
  useEffect(() => {
    if (
      !userLoading &&
      user &&
      ![
        "generalManager",
        "provinceEducationExpert",
        "provinceTechExpert",
        "provinceEvalExpert",
      ].includes(user.role)
    ) {
      toast.error("شما دسترسی به ویرایش اطلاعیه ندارید");
      router.push("/dashboard");
    }
  }, [user, userLoading, router]);

  const fetchAnnouncementDetails = async () => {
    setFetchingData(true);
    setError("");

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`/api/announcements/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("اطلاعیه مورد نظر یافت نشد");
        }
        throw new Error(`خطای دریافت اطلاعیه: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const announcement = data.announcement;
        setFormData({
          title: announcement.title,
          content: announcement.content,
          imageUrl: announcement.imageUrl || "",
          priority: announcement.priority,
          targetRoles: announcement.targetRoles || [],
          targetDistricts:
            announcement.targetDistricts?.map((d) => d._id) || [],
          targetGender: announcement.targetGender || "",
          targetPeriod: announcement.targetPeriod || "",
          targetOrganizationType: announcement.targetOrganizationType || "",
          status: announcement.status,
        });

        if (announcement.imageUrl) {
          setPreviewUrl(announcement.imageUrl);
        }
      } else {
        throw new Error(data.message || "خطا در دریافت اطلاعیه");
      }
    } catch (error) {
      console.error("Error fetching announcement:", error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setFetchingData(false);
    }
  };

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
        // Reset exam center specific filters when examCenterManager is unchecked
        ...(value === "examCenterManager" && {
          targetGender: "",
          targetPeriod: "",
          targetOrganizationType: "",
        }),
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

  // Function to load the image
  const getImage = async () => {
    try {
      if (!formData.imageUrl) return;

      // If image URL is a complete URL, use it directly
      if (formData.imageUrl.startsWith("http")) {
        setImageUrl(formData.imageUrl);
        setShowImage(true);
        return;
      }

      // Otherwise, fetch the image from the server
      const imagePath = formData.imageUrl.startsWith("/uploads/")
        ? formData.imageUrl.substring(9) // Remove the /uploads/ prefix
        : formData.imageUrl;

      const response = await fetch(`/api/announcements/getimg/${imagePath}`);

      if (!response.ok) {
        throw new Error("خطا در دریافت تصویر");
      }

      // Get the image as a blob
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
      setShowImage(true);
    } catch (error) {
      console.error("Error fetching image:", error);
      toast.error("خطا در دریافت تصویر");
    }
  };

  // Function to download the image
  const downloadImage = async () => {
    try {
      if (!imageUrl) return;

      // Create a download link
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `announcement-image-${id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("خطا در دانلود تصویر");
    }
  };

  // Function to hide the image
  const hideImage = () => {
    setShowImage(false);
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
    setShowImage(false); // Hide the current image
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
      submitFormData.append("status", formData.status);

      // Append each target role
      formData.targetRoles.forEach((role) => {
        submitFormData.append("targetRoles", role);
      });

      // Append each target district
      formData.targetDistricts.forEach((district) => {
        submitFormData.append("targetDistricts", district);
      });

      // Add exam center specific filters if examCenterManager is selected
      if (formData.targetRoles.includes("examCenterManager")) {
        if (formData.targetGender) {
          submitFormData.append("targetGender", formData.targetGender);
        }
        if (formData.targetPeriod) {
          submitFormData.append("targetPeriod", formData.targetPeriod);
        }
        if (formData.targetOrganizationType) {
          submitFormData.append(
            "targetOrganizationType",
            formData.targetOrganizationType
          );
        }
      }

      // Add image if selected
      if (selectedImage) {
        submitFormData.append("image", selectedImage);
      } else if (formData.imageUrl) {
        submitFormData.append("imageUrl", formData.imageUrl);
      }

      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`/api/announcements/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
        body: submitFormData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success("اطلاعیه با موفقیت ویرایش شد");
        router.push(`/dashboard/announcements/${id}`);
      } else {
        toast.error(data.message || "خطا در ویرایش اطلاعیه");
        setError(data.message || "خطا در ویرایش اطلاعیه");
      }
    } catch (error) {
      console.error("Error updating announcement:", error);
      toast.error("خطا در ویرایش اطلاعیه");
      setError("خطا در ویرایش اطلاعیه. لطفا دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  };

  if (userLoading || fetchingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="bg-red-100 border-r-4 border-red-500 p-4 rounded mb-4">
          <p className="text-red-700">{error}</p>
        </div>
        <Link
          href="/dashboard/announcements"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md inline-flex items-center"
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
          بازگشت به لیست اطلاعیه‌ها
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">ویرایش اطلاعیه</h1>
        <Link
          href={`/dashboard/announcements/${id}`}
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
          بازگشت
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

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                وضعیت
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="active">فعال</option>
                <option value="inactive">غیرفعال</option>
                <option value="archived">بایگانی شده</option>
              </select>
            </div>

            {/* Target Roles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                گروه‌های هدف <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {/* Show district education expert only for province education expert */}
                {user.role === "provinceEducationExpert" && (
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
                )}

                {/* Show district tech expert only for province tech expert */}
                {user.role === "provinceTechExpert" && (
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
                )}

                {/* Show district eval expert only for province eval expert */}
                {user.role === "provinceEvalExpert" && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="role-district-eval"
                      value="districtEvalExpert"
                      checked={formData.targetRoles.includes(
                        "districtEvalExpert"
                      )}
                      onChange={handleRoleChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="role-district-eval"
                      className="mr-2 text-sm text-gray-700"
                    >
                      کارشناس ارزیابی منطقه
                    </label>
                  </div>
                )}

                {/* Show all district roles for general manager */}
                {user.role === "generalManager" && (
                  <>
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
                        id="role-district-eval"
                        value="districtEvalExpert"
                        checked={formData.targetRoles.includes(
                          "districtEvalExpert"
                        )}
                        onChange={handleRoleChange}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="role-district-eval"
                        className="mr-2 text-sm text-gray-700"
                      >
                        کارشناس ارزیابی منطقه
                      </label>
                    </div>
                  </>
                )}

                {/* Exam center manager is available for all province roles */}
                {[
                  "provinceEducationExpert",
                  "provinceTechExpert",
                  "provinceEvalExpert",
                  "generalManager",
                ].includes(user.role) && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="role-exam-center"
                      value="examCenterManager"
                      checked={formData.targetRoles.includes(
                        "examCenterManager"
                      )}
                      onChange={handleRoleChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="role-exam-center"
                      className="mr-2 text-sm text-gray-700"
                    >
                      مدیر واحد سازمانی
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Exam Center Specific Filters - Only show when examCenterManager is selected */}
            {formData.targetRoles.includes("examCenterManager") && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-800 mb-3">
                  فیلترهای مخصوص واحدهای سازمانی
                </h4>
                <div className="space-y-3">
                  {/* Gender Filter */}
                  <div>
                    <label
                      htmlFor="targetGender"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      جنسیت
                    </label>
                    <select
                      id="targetGender"
                      name="targetGender"
                      value={formData.targetGender}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">همه جنسیت‌ها</option>
                      <option value="دختر">دختر</option>
                      <option value="پسر">پسر</option>
                      <option value="مختلط">مختلط</option>
                    </select>
                  </div>

                  {/* Period Filter */}
                  <div>
                    <label
                      htmlFor="targetPeriod"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      دوره
                    </label>
                    <select
                      id="targetPeriod"
                      name="targetPeriod"
                      value={formData.targetPeriod}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">همه دوره‌ها</option>
                      <option value="ابتدایی">ابتدایی</option>
                      <option value="متوسطه اول">متوسطه اول</option>
                      <option value="متوسطه دوم فنی">متوسطه دوم فنی</option>
                      <option value="متوسطه دوم کاردانش">
                        متوسطه دوم کاردانش
                      </option>
                      <option value="متوسطه دوم نظری">متوسطه دوم نظری</option>
                    </select>
                  </div>

                  {/* Organization Type Filter */}
                  <div>
                    <label
                      htmlFor="targetOrganizationType"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      نوع واحد سازمانی
                    </label>
                    <select
                      id="targetOrganizationType"
                      name="targetOrganizationType"
                      value={formData.targetOrganizationType}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">همه انواع</option>
                      <option value="دولتی">دولتی</option>
                      <option value="غیردولتی">غیردولتی</option>
                    </select>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  این فیلترها فقط برای مدیران واحدهای سازمانی اعمال می‌شود
                </p>
              </div>
            )}

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

              {/* Show existing image if available */}
              {formData.imageUrl && !showImage && !previewUrl && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={getImage}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    نمایش تصویر فعلی
                  </button>
                </div>
              )}

              {/* Display image when viewing */}
              {showImage && imageUrl && (
                <div className="mt-2 relative">
                  <img
                    src={imageUrl}
                    alt="تصویر اطلاعیه"
                    className="max-h-48 max-w-full rounded-md border border-gray-200 object-contain"
                  />
                  <div className="mt-2 flex space-x-2 space-x-reverse">
                    <button
                      type="button"
                      onClick={downloadImage}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
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
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      دانلود تصویر
                    </button>
                    <button
                      type="button"
                      onClick={hideImage}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      بستن تصویر
                    </button>
                  </div>
                </div>
              )}

              {/* Preview new image */}
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
                در حال ارسال...
              </>
            ) : (
              "ذخیره تغییرات"
            )}
          </button>
          <Link
            href={`/dashboard/announcements/${id}`}
            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            انصراف
          </Link>
        </div>
      </form>
    </div>
  );
}
