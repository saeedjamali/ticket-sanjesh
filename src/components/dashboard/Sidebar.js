"use client";

import { useState } from "react";
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
} from "react-icons/fa";
import LogoutButton from "../LogoutButton";

const icons = {
  dashboard: <FaHome className="h-5 w-5" />,
  tickets: <FaTicketAlt className="h-5 w-5" />,
  users: <FaUsers className="h-5 w-5" />,
  reports: <FaChartLine className="h-5 w-5" />,
  settings: <FaCog className="h-5 w-5" />,
};

export default function Sidebar({ user }) {
  const pathname = usePathname();
  const menuItems = getMenuItemsByRole(user?.role || "");
  const [openSubmenu, setOpenSubmenu] = useState(null);

  const toggleSubmenu = (path) => {
    setOpenSubmenu(openSubmenu === path ? null : path);
  };

  return (
    <aside className="bg-gray-800 text-white w-64 min-h-screen p-4">
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-6 text-center">پنل کاربری</h2>
      </div>
      <nav className="flex flex-col justify-between ">
        <ul className="space-y-2 ">
          {menuItems.map((item) => (
            <li key={item.path}>
              {item.submenu ? (
                <div>
                  <button
                    onClick={() => toggleSubmenu(item.path)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-700`}
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
                  >
                    <span className="ml-3">{icons[item.icon]}</span>
                    <span>{item.label}</span>
                  </div>
                </Link>
              )}
            </li>
          ))}
        </ul>
        {/* <div className="pt-4">
          <LogoutButton />
        </div> */}
      </nav>
    </aside>
  );
}
