"use client";

import { createContext, useContext, useState } from "react";

// Create a context for the tabs
const TabsContext = createContext(null);

// Tabs component
export function Tabs({ children, value, onChange }) {
    const [selectedTab, setSelectedTab] = useState(value);

    // Handle tab change
    const handleTabChange = (tabValue) => {
        setSelectedTab(tabValue);
        if (onChange) {
            onChange(tabValue);
        }
    };

    return (
        <TabsContext.Provider value={{ selectedTab, onChange: handleTabChange }}>
            <div className="flex border-b border-gray-200">
                {children}
            </div>
        </TabsContext.Provider>
    );
}

// Tab component
export function Tab({ children, value, className = "" }) {
    const { selectedTab, onChange } = useContext(TabsContext);
    const isActive = selectedTab === value;

    return (
        <button
            className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${isActive
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } ${className}`}
            onClick={() => onChange(value)}
            type="button"
        >
            {children}
        </button>
    );
} 