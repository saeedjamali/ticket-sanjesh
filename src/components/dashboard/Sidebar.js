"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { getMenuItemsByRole } from "@/lib/permissions";
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
} from "react-icons/fa";
import { useSidebar } from "@/context/SidebarContext";

const icons = {
  dashboard: <FaHome className="h-5 w-5" />,
  tickets: <FaTicketAlt className="h-5 w-5" />,
  users: <FaUsers className="h-5 w-5" />,
  reports: <FaChartLine className="h-5 w-5" />,
  settings: <FaCog className="h-5 w-5" />,
  profile: <FaUserCircle className="h-5 w-5" />,
};

export default function Sidebar({ user, children }) {
  const pathname = usePathname();
  const menuItems = getMenuItemsByRole(user?.role || "");
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
        className=" lg:flex fixed top-3 right-5 z-50 p-2 rounded-md bg-gray-800 text-white shadow-lg items-center"
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
          className="fixed inset-0 bg-transparent bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`bg-gray-800 text-white w-[85vw] sm:w-80 lg:w-64 min-h-screen fixed right-0 z-50 transition-transform duration-300 transform rounded-l-2xl shadow-xl overflow-y-auto ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center p-4 sticky top-0 bg-gray-800 z-10 border-b border-gray-700">
          <h2 className="text-xl font-bold">پنل کاربری</h2>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-gray-700"
            aria-label="Close menu"
          >
            <FaTimes className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex flex-col justify-between p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                {item.submenu ? (
                  <div>
                    <button
                      onClick={() => toggleSubmenu(item.path)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-700 transition-colors`}
                    >
                      <div className="flex items-center">
                        <span className="ml-3">{icons[item.icon]}</span>
                        <span>{item.label}</span>
                      </div>
                      {openSubmenu === item.path ? (
                        <FaChevronUp className="h-4 w-4" />
                      ) : (
                        <FaChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    {openSubmenu === item.path && (
                      <ul className="mt-2 mr-4 space-y-2">
                        {item.submenu.map((subItem) => (
                          <li key={subItem.path}>
                            <Link href={subItem.path}>
                              <div
                                className={`flex items-center p-2 rounded-lg ${
                                  pathname === subItem.path
                                    ? "bg-blue-600"
                                    : "hover:bg-gray-700"
                                }`}
                                onClick={() => {
                                  if (window.innerWidth < 1024) toggleSidebar();
                                }}
                              >
                                <span className="mr-2">{subItem.label}</span>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link href={item.path}>
                    <div
                      className={`flex items-center p-3 rounded-lg ${
                        pathname === item.path
                          ? "bg-blue-600"
                          : "hover:bg-gray-700"
                      }`}
                      onClick={() => {
                        if (window.innerWidth < 1024) toggleSidebar();
                      }}
                    >
                      <span className="ml-3">{icons[item.icon]}</span>
                      <span>{item.label}</span>
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
