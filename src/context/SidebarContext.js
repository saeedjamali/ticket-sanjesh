"use client";

import { createContext, useContext, useState, useEffect } from "react";

const SidebarContext = createContext();

export function SidebarProvider({ children }) {
  // Start with sidebar closed, we'll update based on screen width in useEffect
  const [isOpen, setIsOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [isMobile, setIsMobile] = useState(true);
  // Track if sidebar was manually toggled
  const [manuallyToggled, setManuallyToggled] = useState(false);

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window !== "undefined") {
      // Function to handle resize events
      const handleResize = () => {
        const mobile = window.innerWidth < 1024;
        setIsMobile(mobile);

        // Only auto-open sidebar on desktop if it wasn't explicitly closed by user
        if (!mobile && !manuallyToggled) {
          setIsOpen(true);
        }

        // On mobile, ensure sidebar is closed initially unless explicitly opened
        if (mobile && !manuallyToggled) {
          setIsOpen(false);
        }
      };

      // Set initial state
      handleResize();

      // Add event listener
      window.addEventListener("resize", handleResize);

      // Clean up
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [manuallyToggled]);

  const toggleSidebar = () => {
    setManuallyToggled(true);
    setIsOpen(!isOpen);
  };

  const toggleSubmenu = (path) => {
    setOpenSubmenu(openSubmenu === path ? null : path);
  };

  // Reset manually toggled state when route changes
  const resetToggleState = () => {
    setManuallyToggled(false);
    // This will allow the sidebar to automatically adjust based on screen size
    const mobile =
      typeof window !== "undefined" ? window.innerWidth < 1024 : true;
    setIsOpen(!mobile);
  };

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        toggleSidebar,
        setIsOpen,
        openSubmenu,
        toggleSubmenu,
        isMobile,
        resetToggleState,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
