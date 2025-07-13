"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaChevronRight,
  FaChevronDown,
  FaSave,
  FaTimes,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

export default function DropoutReasonsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reasons, setReasons] = useState([]);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    title: "",
    parent: null,
    order: 0,
  });

  useEffect(() => {
    fetchReasons();
  }, []);

  const fetchReasons = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // ابتدا ساختار درختی را امتحان کن
      let response = await fetch(
        "/api/dropout-reasons?tree=true&includeInactive=true",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Tree data received:", data.data);

        if (data.data && data.data.length > 0) {
          setReasons(data.data || []);
        } else {
          // اگر ساختار درختی خالی است، لیست ساده را دریافت کن
          console.log("Tree is empty, fetching flat list...");
          response = await fetch("/api/dropout-reasons?includeInactive=true", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const flatData = await response.json();
            console.log("Flat data received:", flatData.data);

            // تبدیل لیست ساده به ساختار درختی موقت
            const flatToTree = flatData.data.map((item) => ({
              ...item,
              children: [],
            }));

            setReasons(flatToTree);
          }
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || "خطا در دریافت علت‌های بازمانده از تحصیل");
      }
    } catch (error) {
      console.error("Error fetching dropout reasons:", error);
      alert("خطا در برقراری ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExpand = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleAddNew = (parentId = null) => {
    setNewItem({ parent: parentId });
    setFormData({
      code: "",
      title: "",
      parent: parentId,
      order: 0,
    });
    setEditingItem(null);
  };

  const handleEdit = (item) => {
    setEditingItem(item._id);
    setFormData({
      code: item.code,
      title: item.title,
      parent: item.parent,
      order: item.order,
    });
    setNewItem(null);
  };

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.title.trim()) {
      alert("کد و عنوان الزامی است");
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("token");

      let response;
      if (editingItem) {
        // ویرایش
        response = await fetch(`/api/dropout-reasons?id=${editingItem}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
      } else {
        // ایجاد جدید
        response = await fetch("/api/dropout-reasons", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
      }

      if (response.ok) {
        await fetchReasons();
        handleCancel();
        alert(
          editingItem ? "علت با موفقیت ویرایش شد" : "علت با موفقیت ایجاد شد"
        );
      } else {
        const errorData = await response.json();
        alert(errorData.error || "خطا در ذخیره علت");
      }
    } catch (error) {
      console.error("Error saving dropout reason:", error);
      alert("خطا در برقراری ارتباط با سرور");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`آیا از حذف "${item.title}" مطمئن هستید؟`)) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/dropout-reasons?id=${item._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchReasons();
        alert("علت با موفقیت حذف شد");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "خطا در حذف علت");
      }
    } catch (error) {
      console.error("Error deleting dropout reason:", error);
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  const handleToggleActive = async (item) => {
    // اگر isActive undefined است، آن را true در نظر بگیر (default value)
    const currentIsActive = item.isActive !== undefined ? item.isActive : true;
    const newIsActive = !currentIsActive;

    console.log(
      "Toggle active called for item:",
      item._id,
      "current isActive:",
      currentIsActive
    );
    console.log("Will send isActive:", newIsActive);

    try {
      const token = localStorage.getItem("token");

      const requestBody = {
        code: item.code,
        title: item.title,
        parent: item.parent?._id || item.parent,
        order: item.order,
        isActive: newIsActive,
      };

      console.log("Request body:", requestBody);

      const response = await fetch(`/api/dropout-reasons?id=${item._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        console.log("Server response OK, updating local state");

        // به‌روزرسانی فوری state محلی
        const updateItemInTree = (items) => {
          return items.map((treeItem) => {
            if (treeItem._id === item._id) {
              const currentIsActive =
                treeItem.isActive !== undefined ? treeItem.isActive : true;
              const newIsActive = !currentIsActive;
              console.log(
                "Found item to update:",
                treeItem._id,
                "changing isActive from",
                currentIsActive,
                "to",
                newIsActive
              );
              return { ...treeItem, isActive: newIsActive };
            }
            if (treeItem.children && treeItem.children.length > 0) {
              return {
                ...treeItem,
                children: updateItemInTree(treeItem.children),
              };
            }
            return treeItem;
          });
        };

        setReasons((prevReasons) => updateItemInTree(prevReasons));
      } else {
        const errorData = await response.json();
        console.error("Server error:", errorData);
        alert(errorData.error || "خطا در تغییر وضعیت");
      }
    } catch (error) {
      console.error("Error toggling active status:", error);
      alert("خطا در برقراری ارتباط با سرور");
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
    setNewItem(null);
    setFormData({
      code: "",
      title: "",
      parent: null,
      order: 0,
    });
  };

  const renderTreeItem = (item, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item._id);
    const isEditing = editingItem === item._id;

    return (
      <div key={item._id} className="mb-2">
        <div
          className={`flex items-center p-3 rounded-lg border ${
            item.isActive ? "bg-white" : "bg-gray-50"
          }`}
          style={{ marginRight: `${level * 20}px` }}
        >
          {/* Toggle Button */}
          <button
            onClick={() => handleToggleExpand(item._id)}
            className={`ml-2 p-1 rounded ${
              hasChildren
                ? "text-blue-600 hover:bg-blue-50"
                : "text-transparent cursor-default"
            }`}
            disabled={!hasChildren}
          >
            {hasChildren ? (
              isExpanded ? (
                <FaChevronDown />
              ) : (
                <FaChevronRight />
              )
            ) : (
              <div className="w-4 h-4"></div>
            )}
          </button>

          {/* Content */}
          <div className="flex-1 flex items-center justify-between">
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="کد"
                />
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="عنوان علت"
                />
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      order: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ترتیب"
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md flex items-center gap-1"
                >
                  <FaSave />
                  ذخیره
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md flex items-center gap-1"
                >
                  <FaTimes />
                  انصراف
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <span
                    className={`font-medium ${
                      item.isActive ? "text-gray-900" : "text-gray-500"
                    }`}
                  >
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">
                      {item.code}
                    </span>
                    {item.title}
                  </span>
                  <span className="text-sm text-gray-500 mr-2">
                    (ترتیب: {item.order})
                  </span>
                  {!(item.isActive !== undefined ? item.isActive : true) && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full mr-2">
                      غیرفعال
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(item)}
                    className={`p-2 rounded-md ${
                      (item.isActive !== undefined ? item.isActive : true)
                        ? "text-gray-600 hover:bg-gray-100"
                        : "text-green-600 hover:bg-green-50"
                    }`}
                    title={
                      (item.isActive !== undefined ? item.isActive : true)
                        ? "غیرفعال کردن"
                        : "فعال کردن"
                    }
                  >
                    {(item.isActive !== undefined ? item.isActive : true) ? (
                      <FaEyeSlash />
                    ) : (
                      <FaEye />
                    )}
                  </button>
                  <button
                    onClick={() => handleAddNew(item._id)}
                    className="text-blue-600 hover:bg-blue-50 p-2 rounded-md"
                    title="افزودن زیرمجموعه"
                  >
                    <FaPlus />
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-green-600 hover:bg-green-50 p-2 rounded-md"
                    title="ویرایش"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="text-red-600 hover:bg-red-50 p-2 rounded-md"
                    title="حذف"
                  >
                    <FaTrash />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* New Item Form */}
        {newItem && newItem.parent === item._id && (
          <div
            className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg"
            style={{ marginRight: `${(level + 1) * 20}px` }}
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="کد"
              />
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="عنوان علت جدید"
              />
              <input
                type="number"
                value={formData.order}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    order: parseInt(e.target.value) || 0,
                  })
                }
                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ترتیب"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md flex items-center gap-1"
              >
                <FaSave />
                ذخیره
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md flex items-center gap-1"
              >
                <FaTimes />
                انصراف
              </button>
            </div>
          </div>
        )}

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-2">
            {item.children.map((child) => renderTreeItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            مدیریت علت‌های بازمانده از تحصیل
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            مدیریت ساختار سلسله مراتبی علت‌های بازمانده از تحصیل
          </p>
        </div>
        <button
          onClick={() => handleAddNew()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FaPlus />
          افزودن علت اصلی
        </button>
      </div>

      {/* New Root Item Form */}
      {newItem && newItem.parent === null && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            افزودن علت اصلی جدید
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
              className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="کد"
            />
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="عنوان علت"
            />
            <input
              type="number"
              value={formData.order}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  order: parseInt(e.target.value) || 0,
                })
              }
              className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ترتیب"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md flex items-center gap-1"
            >
              <FaSave />
              ذخیره
            </button>
            <button
              onClick={handleCancel}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md flex items-center gap-1"
            >
              <FaTimes />
              انصراف
            </button>
          </div>
        </div>
      )}

      {/* Tree Structure */}
      <div className="bg-white rounded-lg shadow">
        {reasons.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            هیچ علتی ثبت نشده است. برای شروع، علت اصلی اضافه کنید.
          </div>
        ) : (
          <div className="p-4">
            {reasons.map((item) => renderTreeItem(item))}
          </div>
        )}
      </div>
    </div>
  );
}
