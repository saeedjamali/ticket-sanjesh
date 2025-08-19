"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { getMenuItemsByRole } from "@/lib/permissions";
import { usePendingFormsCount } from "@/hooks/usePendingFormsCount";
import { useSmartSchoolStatus } from "@/hooks/useSmartSchoolStatus";
import {
  FaTicketAlt,
  FaUsers,
  FaChartLine,
  FaCog,
  FaHome,
  FaChevronDown,
  FaChevronUp,
  FaBars,
  FaTimes,
  FaUserCircle,
  FaAngleRight,
  FaAngleLeft,
  FaBullhorn,
  FaWpforms,
  FaGraduationCap,
  FaVenusMars,
  FaSitemap,
  FaClipboardList,
  FaCalendarAlt,
  FaEdit,
  FaBrain,
  FaChartBar,
  FaExchangeAlt,
} from "react-icons/fa";
import { useSidebar } from "@/context/SidebarContext";

const icons = {
  dashboard: <FaHome className="h-5 w-5" />,
  tickets: <FaTicketAlt className="h-5 w-5" />,
  announcements: <FaBullhorn className="h-5 w-5" />,
  forms: <FaWpforms className="h-5 w-5" />,
  users: <FaUsers className="h-5 w-5" />,
  reports: <FaChartLine className="h-5 w-5" />,
  settings: <FaCog className="h-5 w-5" />,
  profile: <FaUserCircle className="h-5 w-5" />,
  studentInfo: <FaGraduationCap className="h-5 w-5" />,
  gender: <FaVenusMars className="h-5 w-5" />,
  organizationalUnit: <FaSitemap className="h-5 w-5" />,
  studentReports: <FaClipboardList className="h-5 w-5" />,
  events: <FaCalendarAlt className="h-5 w-5" />,
  statusReports: <FaChartLine className="h-5 w-5" />,
  edit: <FaEdit className="h-5 w-5" />,
  smartSchool: <FaBrain className="h-5 w-5" />,
  smartSchoolReports: <FaChartBar className="h-5 w-5" />,
  transferRequests: <FaExchangeAlt className="h-5 w-5" />,
};

export default function Sidebar({ user, children }) {
  const pathname = usePathname();
  const { count: pendingFormsCount } = usePendingFormsCount();
  const { hasSmartSchoolData, isLoading: smartSchoolLoading } =
    useSmartSchoolStatus(user);
  const menuItems = getMenuItemsByRole(user?.role || "", pendingFormsCount);
  const { isOpen, toggleSidebar, openSubmenu, toggleSubmenu, isMobile } =
    useSidebar();

  return (
    <div className="flex flex-col lg:flex-row">
      {/* Mobile menu button - fixed to top right corner on small screens */}
      {/* <button
        onClick={toggleSidebar}
        className={`fixed top-4 right-4 z-50 p-2 rounded-md bg-gray-800 text-white shadow-lg transition-opacity duration-300 lg:hidden ${
          isOpen ? "opacity-0" : "opacity-100"
        }`}
        aria-label="Toggle menu"
      >
        <FaBars className="h-6 w-6" />
      </button> */}

      {/* Desktop sidebar toggle button */}
      <button
        onClick={toggleSidebar}
        className=" lg:flex fixed top-3 right-5 z-50 p-2 rounded-md bg-gray-900 text-white shadow-lg items-center hover:bg-gray-700 transition-colors duration-300"
        aria-label="Toggle sidebar"
      >
        {isOpen ? (
          <FaAngleRight className="h-5 w-5" />
        ) : (
          <FaAngleLeft className="h-5 w-5" />
        )}
      </button>

      {/* Overlay for mobile - appears when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-transparent bg-opacity-50 z-40 lg:hidden "
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar-container bg-gray-900 text-white w-[85vw] sm:w-80 lg:w-64 min-h-screen fixed right-0 z-50 transition-transform duration-300 transform rounded-l-2xl shadow-xl overflow-y-auto ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          backgroundColor: "#111827", // fallback color for bg-gray-900
          color: "#ffffff",
          minHeight: "100vh",
        }}
      >
        <div
          className="sidebar-header flex justify-between items-center p-4 sticky top-0 bg-gray-700 z-10 border-b border-gray-700"
          style={{
            backgroundColor: "#374151", // fallback color for bg-gray-700
            borderBottomColor: "#374151",
          }}
        >
          <h2 className="text-xl font-bold text-white">پنل کاربری</h2>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-gray-700 text-white"
            style={{
              color: "#ffffff",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#374151")}
            onMouseLeave={(e) =>
              (e.target.style.backgroundColor = "transparent")
            }
            aria-label="Close menu"
          >
            <FaTimes className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex flex-col justify-between p-4">
          <ul className="space-y-2 ">
            {menuItems.map((item) => (
              <li key={item.path}>
                {item.submenu ? (
                  <div>
                    <button
                      onClick={() => toggleSubmenu(item.path)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-700 transition-colors text-white`}
                      style={{
                        color: "#ffffff",
                        backgroundColor: "transparent",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.backgroundColor = "#374151")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.backgroundColor = "transparent")
                      }
                    >
                      <div className="flex items-center text-white">
                        <span className="ml-3">{icons[item.icon]}</span>
                        <span className="text-[14px] font-iransans text-white">
                          {item.label}
                        </span>
                      </div>
                      {openSubmenu === item.path ? (
                        <FaChevronUp className="h-4 w-4 text-white" />
                      ) : (
                        <FaChevronDown className="h-4 w-4 text-white" />
                      )}
                    </button>
                    {openSubmenu === item.path && (
                      <ul className="mt-2 mr-4 space-y-2">
                        {item.submenu.map((subItem) => (
                          <li key={subItem.path}>
                            {subItem.disabled ? (
                              <div
                                className="flex items-center justify-between p-2 rounded-lg cursor-not-allowed opacity-50 bg-gray-700/50"
                                title="این بخش فعلاً در دسترس نیست"
                              >
                                <span className="mr-2 text-[12px] font-iransans text-white">
                                  {subItem.label}
                                </span>
                                <span className="text-md text-gray-400 bg-gray-600 px-2 py-1 rounded text-white">
                                  غیرفعال
                                </span>
                              </div>
                            ) : (
                              <Link href={subItem.path}>
                                <div
                                  className={`flex items-center p-2 rounded-lg ${
                                    pathname === subItem.path
                                      ? "bg-blue-600"
                                      : "hover:bg-gray-700"
                                  }`}
                                  onClick={() => {
                                    if (window.innerWidth < 1024)
                                      toggleSidebar();
                                  }}
                                >
                                  <span className="mr-2 text-[12px] font-iransans">
                                    {subItem.label}
                                  </span>
                                </div>
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : item.disabled ? (
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg cursor-not-allowed opacity-50 bg-gray-700/50`}
                    title="این بخش فعلاً در دسترس نیست"
                  >
                    <div className="flex items-center">
                      <span className="ml-3">{icons[item.icon]}</span>
                      <span className="text-[14px] font-iransans">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center">
                      {item.badge && item.badge > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-gray-400 bg-gray-600 rounded-full ml-2">
                          {item.badge}
                        </span>
                      )}
                      <span className="text-md text-gray-400 bg-gray-600 px-2 py-1 rounded">
                        غیرفعال
                      </span>
                    </div>
                  </div>
                ) : (
                  <Link href={item.path}>
                    <div
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        pathname === item.path
                          ? "bg-blue-600"
                          : "hover:bg-gray-700"
                      } ${
                        // اگر منوی مدرسه هوشمند است و داده‌ای وجود ندارد، چشمک‌زن کن
                        item.path === "/dashboard/smart-school" &&
                        user?.role === "examCenterManager" &&
                        hasSmartSchoolData === false &&
                        !smartSchoolLoading
                          ? "menu-item-incomplete"
                          : ""
                      }`}
                      onClick={() => {
                        if (window.innerWidth < 1024) toggleSidebar();
                      }}
                    >
                      <div className="flex items-center">
                        <span
                          className={`ml-3 ${
                            item.path === "/dashboard/smart-school" &&
                            user?.role === "examCenterManager" &&
                            hasSmartSchoolData === false &&
                            !smartSchoolLoading
                              ? "menu-icon"
                              : ""
                          }`}
                        >
                          {icons[item.icon]}
                        </span>
                        <span className="text-[14px] font-iransans">
                          {item.label}
                          {item.path === "/dashboard/smart-school" &&
                            user?.role === "examCenterManager" &&
                            hasSmartSchoolData === false &&
                            !smartSchoolLoading && (
                              <span className="mr-2 text-xs text-red-300">
                                (ناتمام)
                              </span>
                            )}
                        </span>
                      </div>
                      {item.badge && item.badge > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main
        className={`flex-1 w-full transition-all duration-300 ${
          isOpen ? "lg:mr-64" : ""
        }`}
      >
        {children}
      </main>
    </div>
  );
}
