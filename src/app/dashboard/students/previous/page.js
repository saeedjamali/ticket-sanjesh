"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StudentsPage from "../page";
import LoadingSpinner from "@/components/common/LoadingSpinner";

export default function PreviousStudentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    checkStats();
  }, []);

  const checkStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/students/check-stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setStats(data.data.previousYear);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error checking stats:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <StudentsPage
      defaultAcademicYear="previous"
      hideAcademicYearFilter={true}
      maxStudents={stats?.totalStudents}
      currentStudentCount={stats?.registeredStudents}
    />
  );
}
