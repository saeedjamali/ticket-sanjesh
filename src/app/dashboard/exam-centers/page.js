"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRouter } from "next/navigation";

export default function ExamCentersPage() {
  const [examCenters, setExamCenters] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const [newExamCenter, setNewExamCenter] = useState({
    name: "",
    code: "",
    province: "",
    district: "",
    manager: "",
    address: "",
    phone: "",
    capacity: "",
    gender: "",
    period: "",
    studentCount: "",
    organizationType: "",
  });

  const [selectedFilters, setSelectedFilters] = useState({
    province: "",
    district: "",
    gender: "",
    period: "",
    organizationType: "",
  });

  const [searchTerm, setSearchTerm] = useState("");

  const [editingCenter, setEditingCenter] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch provinces
        const provincesResponse = await fetch("/api/provinces", {
          credentials: "include",
        });

        if (!provincesResponse.ok) {
          throw new Error("خطا در دریافت اطلاعات استان‌ها");
        }

        const provincesData = await provincesResponse.json();
        if (!provincesData.success) {
          throw new Error(
            provincesData.error || "خطا در دریافت اطلاعات استان‌ها"
          );
        }

        setProvinces(provincesData.provinces || []);
        console.log("Provinces fetched:", provincesData.provinces);

        // Fetch districts
        const districtsResponse = await fetch("/api/districts", {
          credentials: "include",
        });

        if (!districtsResponse.ok) {
          throw new Error("خطا در دریافت اطلاعات مناطق");
        }

        const districtsData = await districtsResponse.json();
        if (!districtsData.success) {
          throw new Error(districtsData.error || "خطا در دریافت اطلاعات مناطق");
        }

        // Ensure district objects have proper province references
        const processedDistricts = districtsData.districts.map((district) => {
          // Ensure province is properly referenced
          if (district.province && typeof district.province === "string") {
            const provinceObj = provincesData.provinces.find(
              (p) => p._id === district.province
            );
            if (provinceObj) {
              return { ...district, province: provinceObj };
            }
          }
          return district;
        });

        console.log("Processed districts:", processedDistricts);
        setDistricts(processedDistricts);

        // Fetch exam centers
        const examCentersResponse = await fetch("/api/exam-centers", {
          credentials: "include",
        });

        if (!examCentersResponse.ok) {
          throw new Error("خطا در دریافت اطلاعات واحدهای سازمانی");
        }

        const examCentersData = await examCentersResponse.json();
        if (!examCentersData.success) {
          throw new Error(
            examCentersData.error || "خطا در دریافت اطلاعات واحدهای سازمانی"
          );
        }

        // Process exam center data to ensure proper references
        const processedCenters = examCentersData.examCenters.map((center) => {
          // Find province and district objects for this center
          const provinceObj =
            center.province && typeof center.province === "string"
              ? provincesData.provinces.find((p) => p._id === center.province)
              : center.province;

          const districtObj =
            center.district && typeof center.district === "string"
              ? districtsData.districts.find((d) => d._id === center.district)
              : center.district;

          return {
            ...center,
            province: provinceObj || center.province,
            district: districtObj || center.district,
          };
        });

        console.log("Processed exam centers:", processedCenters);
        setExamCenters(processedCenters);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error.message);
        toast.error(error.message);
        if (error.message.includes("عدم احراز هویت")) {
          router.push("/login");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log(`Input changed: ${name} = ${value}`);
    setNewExamCenter((prev) => ({ ...prev, [name]: value }));

    // Reset dependent fields
    if (name === "province") {
      setNewExamCenter((prev) => ({ ...prev, district: "" }));
      console.log("Province changed to:", value, "- resetting district");
    }
  };

  const handleChange = (field, value) => {
    console.log(`Changing ${field} to:`, value);
    setNewExamCenter((prev) => ({ ...prev, [field]: value }));

    // If province changes, reset district
    if (field === "province") {
      setNewExamCenter((prev) => ({ ...prev, district: "" }));
      console.log("Province changed, district reset");

      // Log available districts for the selected province
      const availableDistricts = filteredDistricts(value);
      console.log("Available districts for province:", availableDistricts);
    }
  };

  // Filter districts based on the selected province for the new exam center form
  const filteredDistricts = (provinceId) => {
    if (!provinceId) {
      return [];
    }

    console.log("Filtering districts for province:", provinceId);
    console.log("All districts:", districts);

    const filtered = districts.filter((district) => {
      if (!district.province) {
        console.log("District without province:", district);
        return false;
      }

      const districtProvinceId =
        typeof district.province === "object"
          ? district.province._id
          : district.province;

      const matches = districtProvinceId === provinceId;
      console.log(
        `District ${district.name} province ${districtProvinceId} matches ${provinceId}: ${matches}`
      );

      return matches;
    });

    console.log("Filtered districts:", filtered);
    return filtered;
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    // Reset dependent filters
    if (name === "province") {
      console.log("Province filter changed to:", value);
      console.log("Will reset district filter");
      // Update both province and reset district in one state update
      setSelectedFilters((prev) => ({
        ...prev,
        province: value,
        district: "",
      }));

      // Log available districts for debugging
      console.log("All districts:", districts);
      const filtered = districts.filter(
        (d) => (d.province && d.province._id === value) || value === ""
      );
      console.log("Filtered districts for province", value, ":", filtered);
    } else {
      // For other filter changes
      setSelectedFilters((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Submit new exam center
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting exam center:", newExamCenter);

    // Validate required fields
    const requiredFields = {
      name: "نام واحد سازمانی",
      code: "کد مرکز",
      province: "استان",
      district: "منطقه",
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([field]) => !newExamCenter[field])
      .map(([, label]) => label);

    if (missingFields.length > 0) {
      toast.warning(`لطفاً فیلدهای ${missingFields.join("، ")} را تکمیل کنید`);
      return;
    }

    try {
      // Prepare data for API
      const examCenterData = {
        name: newExamCenter.name,
        code: newExamCenter.code,
        districtId: newExamCenter.district,
        capacity: newExamCenter.capacity
          ? Number(newExamCenter.capacity)
          : undefined,
        manager: newExamCenter.manager || undefined,
        address: newExamCenter.address || undefined,
        phone: newExamCenter.phone || undefined,
        gender: newExamCenter.gender || undefined,
        period: newExamCenter.period || undefined,
        studentCount: newExamCenter.studentCount
          ? Number(newExamCenter.studentCount)
          : undefined,
        organizationType: newExamCenter.organizationType || undefined,
      };

      console.log("Sending data to API:", examCenterData);

      const response = await fetch("/api/exam-centers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(examCenterData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error(errorData.error || "خطا در ثبت واحد سازمانی");
      }

      const createdExamCenter = await response.json();

      if (!createdExamCenter.success) {
        throw new Error(createdExamCenter.error || "خطا در ثبت واحد سازمانی");
      }

      // Add province and district name to the new exam center
      const provinceData = provinces.find(
        (p) => p._id === newExamCenter.province
      );
      const districtData = districts.find(
        (d) => d._id === newExamCenter.district
      );

      const examCenterWithDetails = {
        ...createdExamCenter.examCenter,
        province: { _id: provinceData._id, name: provinceData.name },
        district: { _id: districtData._id, name: districtData.name },
      };

      // Add to state
      setExamCenters((prev) => [...prev, examCenterWithDetails]);

      // Reset form
      setNewExamCenter({
        name: "",
        code: "",
        province: "",
        district: "",
        manager: "",
        address: "",
        phone: "",
        capacity: "",
        gender: "",
        period: "",
        studentCount: "",
        organizationType: "",
      });

      toast.success("واحد سازمانی با موفقیت ثبت شد");
    } catch (error) {
      console.error("Error submitting exam center:", error);
      toast.error(error.message || "خطا در ثبت واحد سازمانی");
    }
  };

  // Delete exam center
  const handleDelete = async (id) => {
    if (!confirm("آیا از حذف این واحد سازمانی اطمینان دارید؟")) {
      return;
    }

    try {
      const response = await fetch(`/api/exam-centers/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "خطا در حذف واحد سازمانی");
      }

      // Remove from state
      setExamCenters((prev) => prev.filter((center) => center._id !== id));
      toast.success("واحد سازمانی با موفقیت حذف شد");
    } catch (error) {
      toast.error(error.message || "خطا در حذف واحد سازمانی");
    }
  };

  // Edit exam center
  const handleEdit = (center) => {
    setEditingCenter({
      ...center,
      province: center.district?.province?._id || "",
      district: center.district?._id || "",
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      const examCenterData = {
        name: editingCenter.name,
        code: editingCenter.code,
        districtId: editingCenter.district,
        capacity: editingCenter.capacity
          ? Number(editingCenter.capacity)
          : undefined,
        managerId: editingCenter.manager?._id || undefined,
        address: editingCenter.address || undefined,
        phone: editingCenter.phone || undefined,
        gender: editingCenter.gender || undefined,
        period: editingCenter.period || undefined,
        studentCount: editingCenter.studentCount
          ? Number(editingCenter.studentCount)
          : undefined,
        organizationType: editingCenter.organizationType || undefined,
      };

      const response = await fetch(`/api/exam-centers/${editingCenter._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(examCenterData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "خطا در ویرایش واحد سازمانی");
      }

      const updatedCenter = await response.json();

      if (!updatedCenter.success) {
        throw new Error(updatedCenter.error || "خطا در ویرایش واحد سازمانی");
      }

      // Update state
      setExamCenters((prev) =>
        prev.map((center) =>
          center._id === editingCenter._id
            ? {
                ...updatedCenter.examCenter,
                district: {
                  ...center.district,
                  _id: editingCenter.district,
                },
              }
            : center
        )
      );

      setIsEditModalOpen(false);
      setEditingCenter(null);
      toast.success("واحد سازمانی با موفقیت ویرایش شد");
    } catch (error) {
      console.error("Error updating exam center:", error);
      toast.error(error.message || "خطا در ویرایش واحد سازمانی");
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditingCenter((prev) => ({ ...prev, [name]: value }));

    // Reset district when province changes
    if (name === "province") {
      setEditingCenter((prev) => ({ ...prev, district: "" }));
    }
  };

  // Filter districts based on province
  const filteredDistrictsForFilter = (provinceId) => {
    console.log("Filtering districts for province ID:", provinceId);
    console.log("All districts:", districts);

    if (!provinceId) {
      return [];
    }

    const filtered = districts.filter((district) => {
      // Check if district has a province property
      if (!district.province) {
        console.log("District has no province:", district);
        return false;
      }

      // Handle case where province is an object
      if (typeof district.province === "object" && district.province !== null) {
        console.log(`Comparing ${district.province._id} with ${provinceId}`);
        return district.province._id === provinceId;
      }

      // Handle case where province is a string ID
      if (typeof district.province === "string") {
        console.log(`Comparing ${district.province} with ${provinceId}`);
        return district.province === provinceId;
      }

      return false;
    });

    console.log("Filtered districts result:", filtered);
    return filtered;
  };

  // Filter exam centers based on selected filters
  const filteredExamCenters = () => {
    let filtered = [...examCenters];

    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (center) =>
          center.name?.toLowerCase().includes(searchLower) ||
          center.code?.toLowerCase().includes(searchLower)
      );
    }

    if (selectedFilters.province) {
      filtered = filtered.filter(
        (center) => center.district?.province?._id === selectedFilters.province
      );
    }

    if (selectedFilters.district) {
      filtered = filtered.filter(
        (center) => center.district?._id === selectedFilters.district
      );
    }

    if (selectedFilters.gender) {
      filtered = filtered.filter(
        (center) => center.gender === selectedFilters.gender
      );
    }

    if (selectedFilters.period) {
      filtered = filtered.filter(
        (center) => center.period === selectedFilters.period
      );
    }

    if (selectedFilters.organizationType) {
      filtered = filtered.filter(
        (center) => center.organizationType === selectedFilters.organizationType
      );
    }

    return filtered;
  };

  // Handle province change in form
  const handleProvinceChange = (e) => {
    const { value } = e.target;
    console.log("Exam centers page - Province changed to:", value);

    setNewExamCenter((prev) => ({ ...prev, province: value }));

    // Reset district when province changes
    setNewExamCenter((prev) => ({ ...prev, district: "" }));

    console.log("Available districts:", districts);
    console.log("Districts for selected province:", filteredDistricts(value));

    // Optionally fetch districts specifically for this province from the API
    if (value) {
      const fetchDistrictsForProvince = async () => {
        try {
          const authToken = localStorage.getItem("authToken");
          const headers = {
            "Content-Type": "application/json",
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
          };

          const response = await fetch(`/api/districts?province=${value}`, {
            headers,
          });
          if (response.ok) {
            const data = await response.json();
            console.log("Fetched districts for province:", data);
            // Process or update as needed
          }
        } catch (error) {
          console.error("Error fetching districts for province:", error);
        }
      };

      fetchDistrictsForProvince();
    }
  };

  // Handle province change in filters
  const handleFilterProvinceChange = (e) => {
    const { value } = e.target;
    console.log("Exam centers page - Filter province changed to:", value);

    setSelectedFilters((prev) => ({ ...prev, province: value }));
    // Reset district filter when province filter changes
    setSelectedFilters((prev) => ({ ...prev, district: "" }));

    console.log(
      "Filter dropdown districts:",
      filteredDistrictsForFilter(value)
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer
        position="bottom-left"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={true}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        مدیریت واحدهای سازمانی
      </h1>

      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            افزودن واحد سازمانی جدید
          </h2>
          <Link
            href="/dashboard/exam-centers/import"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            افزودن گروهی واحدهای سازمانی
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                نام واحد سازمانی *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={newExamCenter.name}
                onChange={handleInputChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                کد مرکز *
              </label>
              <input
                type="text"
                id="code"
                name="code"
                value={newExamCenter.code}
                onChange={handleInputChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="province"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                استان
              </label>
              <select
                id="province"
                name="province"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={newExamCenter.province}
                onChange={(e) => handleChange("province", e.target.value)}
                required
              >
                <option value="">انتخاب استان</option>
                {provinces.map((province) => (
                  <option key={province._id} value={province._id}>
                    {province.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="district"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                منطقه *
              </label>
              <select
                id="district"
                name="district"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={newExamCenter.district}
                onChange={(e) => handleChange("district", e.target.value)}
                required
              >
                <option value="">انتخاب منطقه</option>
                {filteredDistricts(newExamCenter.province).map((district) => (
                  <option key={district._id} value={district._id}>
                    {district.name}
                  </option>
                ))}
              </select>
            </div>

            {/* <div>
              <label
                htmlFor="manager"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                مدیر مرکز
              </label>
              <input
                type="text"
                id="manager"
                name="manager"
                value={newExamCenter.manager}
                onChange={handleInputChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div> */}

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                شماره تماس
              </label>
              <input
                type="text"
                id="phone"
                name="phone"
                value={newExamCenter.phone}
                onChange={handleInputChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="capacity"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                ظرفیت مرکز
              </label>
              <input
                type="number"
                id="capacity"
                name="capacity"
                value={newExamCenter.capacity}
                onChange={handleInputChange}
                min="0"
                placeholder="تعداد نفرات"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="address"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              آدرس
            </label>
            <textarea
              id="address"
              name="address"
              value={newExamCenter.address}
              onChange={handleInputChange}
              rows="2"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            ></textarea>
          </div>

          <div>
            <label
              htmlFor="gender"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              جنسیت
            </label>
            <select
              id="gender"
              name="gender"
              value={newExamCenter.gender}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">انتخاب جنسیت</option>
              <option value="دختر">دختر</option>
              <option value="پسر">پسر</option>
              <option value="مختلط">مختلط</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="period"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              دوره
            </label>
            <select
              id="period"
              name="period"
              value={newExamCenter.period}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">انتخاب دوره</option>
              <option value="ابتدایی">ابتدایی</option>
              <option value="متوسطه اول">متوسطه اول</option>
              <option value="متوسطه دوم فنی">متوسطه دوم فنی</option>
              <option value="متوسطه دوم کاردانش">متوسطه دوم کاردانش</option>
              <option value="متوسطه دوم نظری">متوسطه دوم نظری</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="studentCount"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              تعداد دانش آموز
            </label>
            <input
              type="number"
              id="studentCount"
              name="studentCount"
              value={newExamCenter.studentCount}
              onChange={handleInputChange}
              min="0"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="organizationType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              نوع واحد سازمانی
            </label>
            <select
              id="organizationType"
              name="organizationType"
              value={newExamCenter.organizationType}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">انتخاب نوع واحد سازمانی</option>
              <option value="دولتی">دولتی</option>
              <option value="غیردولتی">غیردولتی</option>
            </select>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              ثبت واحد سازمانی
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          لیست واحدهای سازمانی
        </h2>

        <div className="mb-4">
          <label
            htmlFor="search"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            جستجو بر اساس نام یا کد واحد سازمانی
          </label>
          <div className="relative">
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="نام یا کد واحد سازمانی را وارد کنید..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <label
              htmlFor="filter-province"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              فیلتر بر اساس استان
            </label>
            <select
              id="filter-province"
              name="province"
              value={selectedFilters.province}
              onChange={handleFilterProvinceChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">همه استان‌ها</option>
              {provinces.map((province) => (
                <option key={province._id} value={province._id}>
                  {province.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-district"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              فیلتر بر اساس منطقه
            </label>
            <div className="mb-2 ml-2">
              <select
                className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={selectedFilters.district}
                onChange={(e) =>
                  setSelectedFilters({
                    ...selectedFilters,
                    district: e.target.value,
                  })
                }
              >
                <option value="">همه مناطق</option>
                {filteredDistrictsForFilter(selectedFilters.province).map(
                  (district) => (
                    <option key={district._id} value={district._id}>
                      {district.name}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="filter-gender"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              فیلتر بر اساس جنسیت
            </label>
            <select
              id="filter-gender"
              name="gender"
              value={selectedFilters.gender}
              onChange={(e) =>
                setSelectedFilters({
                  ...selectedFilters,
                  gender: e.target.value,
                })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">همه جنسیت‌ها</option>
              <option value="دختر">دختر</option>
              <option value="پسر">پسر</option>
              <option value="مختلط">مختلط</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-period"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              فیلتر بر اساس دوره
            </label>
            <select
              id="filter-period"
              name="period"
              value={selectedFilters.period}
              onChange={(e) =>
                setSelectedFilters({
                  ...selectedFilters,
                  period: e.target.value,
                })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">همه دوره‌ها</option>
              <option value="ابتدایی">ابتدایی</option>
              <option value="متوسطه اول">متوسطه اول</option>
              <option value="متوسطه دوم فنی">متوسطه دوم فنی</option>
              <option value="متوسطه دوم کاردانش">متوسطه دوم کاردانش</option>
              <option value="متوسطه دوم نظری">متوسطه دوم نظری</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-organizationType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              فیلتر بر اساس نوع واحد سازمانی
            </label>
            <select
              id="filter-organizationType"
              name="organizationType"
              value={selectedFilters.organizationType}
              onChange={(e) =>
                setSelectedFilters({
                  ...selectedFilters,
                  organizationType: e.target.value,
                })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">همه انواع</option>
              <option value="دولتی">دولتی</option>
              <option value="غیردولتی">غیردولتی</option>
            </select>
          </div>
        </div>

        <div className="mb-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            نمایش {filteredExamCenters().length} واحد سازمانی از{" "}
            {examCenters.length} واحد
          </div>
          <button
            onClick={() => {
              setSelectedFilters({
                province: "",
                district: "",
                gender: "",
                period: "",
                organizationType: "",
              });
              setSearchTerm("");
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
          >
            پاک کردن فیلترها و جستجو
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  عملیات
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  نام مرکز
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  کد
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  منطقه
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  استان
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  مدیر
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  ظرفیت
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  جنسیت
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  دوره
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  تعداد دانش آموز
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  نوع واحد سازمانی
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  مسئول مرکز
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {filteredExamCenters().length === 0 ? (
                <tr>
                  <td
                    colSpan="12"
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    هیچ واحد سازمانی یافت نشد
                  </td>
                </tr>
              ) : (
                filteredExamCenters().map((center) => (
                  <tr
                    key={center._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium">
                      <button
                        onClick={() => handleEdit(center)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 ml-3"
                      >
                        ویرایش
                      </button>
                      <button
                        onClick={() => handleDelete(center._id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        حذف
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium text-gray-900 dark:text-white">
                      {center.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {center.code}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {center.district?.name || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {center.district?.province?.name || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {center.manager?.fullName || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {center.capacity || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {center.gender || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {center.period || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {center.studentCount || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {center.organizationType || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {center.manager ? (
                        <span className="font-medium text-green-600 dark:text-green-400">
                          تعیین شده
                        </span>
                      ) : (
                        <span className="text-gray-400">تعیین نشده</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingCenter && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                ویرایش واحد سازمانی
              </h3>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      نام واحد سازمانی *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={editingCenter.name || ""}
                      onChange={handleEditInputChange}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      کد مرکز *
                    </label>
                    <input
                      type="text"
                      name="code"
                      value={editingCenter.code || ""}
                      onChange={handleEditInputChange}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      استان *
                    </label>
                    <select
                      name="province"
                      value={editingCenter.province || ""}
                      onChange={handleEditInputChange}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    >
                      <option value="">انتخاب استان</option>
                      {provinces.map((province) => (
                        <option key={province._id} value={province._id}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      منطقه *
                    </label>
                    <select
                      name="district"
                      value={editingCenter.district || ""}
                      onChange={handleEditInputChange}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    >
                      <option value="">انتخاب منطقه</option>
                      {filteredDistricts(editingCenter.province).map(
                        (district) => (
                          <option key={district._id} value={district._id}>
                            {district.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      شماره تماس
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={editingCenter.phone || ""}
                      onChange={handleEditInputChange}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ظرفیت مرکز
                    </label>
                    <input
                      type="number"
                      name="capacity"
                      value={editingCenter.capacity || ""}
                      onChange={handleEditInputChange}
                      min="0"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      جنسیت
                    </label>
                    <select
                      name="gender"
                      value={editingCenter.gender || ""}
                      onChange={handleEditInputChange}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">انتخاب جنسیت</option>
                      <option value="دختر">دختر</option>
                      <option value="پسر">پسر</option>
                      <option value="مختلط">مختلط</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      دوره
                    </label>
                    <select
                      name="period"
                      value={editingCenter.period || ""}
                      onChange={handleEditInputChange}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">انتخاب دوره</option>
                      <option value="ابتدایی">ابتدایی</option>
                      <option value="متوسطه اول">متوسطه اول</option>
                      <option value="متوسطه دوم فنی">متوسطه دوم فنی</option>
                      <option value="متوسطه دوم کاردانش">
                        متوسطه دوم کاردانش
                      </option>
                      <option value="متوسطه دوم نظری">متوسطه دوم نظری</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      تعداد دانش آموز
                    </label>
                    <input
                      type="number"
                      name="studentCount"
                      value={editingCenter.studentCount || ""}
                      onChange={handleEditInputChange}
                      min="0"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      نوع واحد سازمانی
                    </label>
                    <select
                      name="organizationType"
                      value={editingCenter.organizationType || ""}
                      onChange={handleEditInputChange}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">انتخاب نوع واحد سازمانی</option>
                      <option value="دولتی">دولتی</option>
                      <option value="غیردولتی">غیردولتی</option>
                    </select>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    آدرس
                  </label>
                  <textarea
                    name="address"
                    value={editingCenter.address || ""}
                    onChange={handleEditInputChange}
                    rows="2"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  ></textarea>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingCenter(null);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    ذخیره تغییرات
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
