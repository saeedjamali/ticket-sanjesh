"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function DistrictMap({ userId }) {
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [provinces, setProvinces] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState("all");

  useEffect(() => {
    const fetchDistricts = async () => {
      setLoading(true);
      try {
        // Fetch districts with ticket stats
        const response = await fetch(
          `/api/stats/districts${
            selectedProvince !== "all" ? `?province=${selectedProvince}` : ""
          }`
        );
        if (!response.ok) throw new Error("Failed to fetch districts");

        const data = await response.json();
        setDistricts(data.districts);

        // Get unique provinces for the filter
        const uniqueProvinces = [
          ...new Set(data.districts.map((district) => district.province)),
        ];
        const provincesResponse = await fetch("/api/provinces");
        if (provincesResponse.ok) {
          const provincesData = await provincesResponse.json();
          setProvinces(
            provincesData.provinces.filter((province) =>
              uniqueProvinces.includes(province._id)
            )
          );
        }
      } catch (error) {
        setError("خطا در دریافت اطلاعات مناطق. لطفا دوباره تلاش کنید.");
        console.error("Error fetching districts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDistricts();
  }, [selectedProvince]);

  const handleProvinceChange = (e) => {
    setSelectedProvince(e.target.value);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="loader h-8 w-8 rounded-full border-4 border-t-4 border-gray-200 border-t-blue-600 ease-linear"></div>
        <span className="mr-2">در حال بارگذاری...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-center text-red-700 dark:bg-red-900/50 dark:text-red-200">
        {error}
      </div>
    );
  }

  if (districts.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        هیچ منطقه‌ای یافت نشد.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between md:flex-row md:items-center">
        <div className="mb-4 md:mb-0">
          <label htmlFor="province" className="ml-2 text-sm font-medium">
            فیلتر استان:
          </label>
          <select
            id="province"
            value={selectedProvince}
            onChange={handleProvinceChange}
            className="rounded-md border border-gray-300 px-3 py-1 dark:border-gray-600 dark:bg-gray-700"
          >
            <option value="all">همه استان‌ها</option>
            {provinces.map((province) => (
              <option key={province._id} value={province._id}>
                {province.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-4 space-x-reverse">
          <div className="flex items-center">
            <div className="mr-2 h-4 w-4 rounded-full bg-green-600"></div>
            <span className="text-sm">بدون خطا یا حل شده</span>
          </div>
          <div className="flex items-center">
            <div className="mr-2 h-4 w-4 rounded-full bg-red-600"></div>
            <span className="text-sm">دارای خطای باز</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {districts.map((district) => (
          <Link
            key={district._id}
            href={`/dashboard/tickets?district=${district._id}`}
            className={`rounded-lg p-4 shadow transition-colors hover:opacity-90 ${
              district.hasOpenTickets
                ? "bg-red-600 text-white"
                : "bg-green-600 text-white"
            }`}
          >
            <div className="flex flex-col items-center">
              <h3 className="mb-2 text-lg font-semibold">
                {district.name} ({district.province_name})
              </h3>

              <div className="space-y-1 text-center">
                <p>
                  <span className="font-medium">تیکت‌های باز: </span>
                  {district.openTicketsCount}
                </p>
                <p>
                  <span className="font-medium">تیکت‌های حل شده: </span>
                  {district.resolvedTicketsCount}
                </p>
                <p>
                  <span className="font-medium">کل تیکت‌ها: </span>
                  {district.totalTicketsCount}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
