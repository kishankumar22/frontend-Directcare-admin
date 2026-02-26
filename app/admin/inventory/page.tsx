"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Select from "react-select";
import { Search, Upload, Download, Save, ShoppingCart } from "lucide-react";
import * as XLSX from "xlsx";
import { productsService } from "@/lib/services";
import { categoriesService } from "@/lib/services/categories";
import { brandsService } from "@/lib/services/brands";
import { useToast } from "@/app/admin/_components/CustomToast";
import { useRouter } from "next/navigation";
import MediaViewerModal, { MediaItem } from "../products/MediaViewerModal";
import ConfirmDialog from "../_components/ConfirmDialog";

interface ProductImage {
  id: string;
  imageUrl: string;
  altText?: string;
  isMain?: boolean;
}

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  stockQuantity: number;
  price: number;
  brandName: string;
  categoryName: string;
  newStock: number;
  newPrice: number;

  image?: string;          // main image preview
  images?: ProductImage[]; // full gallery
}

interface SelectOption {
  value: string;
  label: string;
}

const selectStyles = {
  control: (base: any) => ({
    ...base,
    backgroundColor: "#1e293b",
    borderColor: "#475569",
    borderRadius: "0.75rem",
    color: "white",
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: "#1e293b",
    color: "white",
  }),
  singleValue: (base: any) => ({
    ...base,
    color: "white",
  }),
};

export default function InventoryPage() {
  const toast = useToast();
    const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [brands, setBrands] = useState<SelectOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SelectOption | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<SelectOption | null>(null);
const [viewerOpen, setViewerOpen] = useState(false);
const [viewerMedia, setViewerMedia] = useState<MediaItem[]>([]);
const [viewerIndex, setViewerIndex] = useState(0);
  useEffect(() => {
    fetchProducts();
    fetchFilters();
  }, []);
const openMediaViewer = (images: any[], startIndex = 0) => {
  if (!images || images.length === 0) return;

  const formatted: MediaItem[] = images.map((img: any) => ({
    type: "image",
    url: img.imageUrl,
    title: img.altText || "Product Image",
    isMain: img.isMain,
  }));

  setViewerMedia(formatted);
  setViewerIndex(startIndex);
  setViewerOpen(true);
};
const [tableLoading, setTableLoading] = useState(true);
const [confirmOpen, setConfirmOpen] = useState(false);
const [rowLoading, setRowLoading] = useState<string | null>(null);
const [confirmConfig, setConfirmConfig] = useState<{
  title: string;
  message: string;
  onConfirm: () => void;
}>({
  title: "",
  message: "",
  onConfirm: () => {},
});

const openConfirm = (
  title: string,
  message: string,
  onConfirm: () => void
) => {
  setConfirmConfig({ title, message, onConfirm });
  setConfirmOpen(true);
};
const fetchProducts = async () => {
  try {
    setTableLoading(true);

    const res = await productsService.getAll({ page: 1, pageSize: 1000 });

    if (res.data?.success) {
      const mapped = res.data.data.items.map((p: any) => {
        const images = p.images || [];

        const mainImage =
          images.find((img: any) => img.isMain)?.imageUrl ||
          images[0]?.imageUrl ||
          "";

        return {
          id: p.id,
          name: p.name,
          sku: p.sku || "-",
          stockQuantity: Number(p.stockQuantity ?? 0),
          price: Number(p.price ?? 0),
          brandName: p.brandName ?? "",
          categoryName: p.categories?.[0]?.categoryName ?? "Uncategorized",
          image: mainImage,
          images: images,
          newStock: Number(p.stockQuantity ?? 0),
          newPrice: Number(p.price ?? 0),
        };
      });

      setProducts(mapped);
    }
  } catch (error) {
    toast.error("Failed to load products");
  } finally {
    setTableLoading(false);
  }
};
const discardChanges = () => {
  setProducts((prev) =>
    prev.map((p) => ({
      ...p,
      newStock: p.stockQuantity,
      newPrice: p.price,
    }))
  );

  toast.info("Changes discarded");
};
  const fetchFilters = async () => {
    const catRes = await categoriesService.getAll({ includeInactive: false });
    const brandRes = await brandsService.getAll({ includeUnpublished: false });

    if (catRes.data?.success) {
      setCategories(catRes.data.data.map((c: any) => ({
        value: c.name,
        label: c.name,
      })));
    }

    if (brandRes.data?.success) {
      setBrands(brandRes.data.data.map((b: any) => ({
        value: b.name,
        label: b.name,
      })));
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()))
        return false;
      if (selectedCategory && p.categoryName !== selectedCategory.value)
        return false;
      if (selectedBrand && p.brandName !== selectedBrand.value)
        return false;
      return true;
    });
  }, [products, searchTerm, selectedCategory, selectedBrand]);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selected);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelected(newSet);
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredProducts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  const handleChange = (id: string, field: "newStock" | "newPrice", value: number) => {
    setProducts(prev =>
      prev.map(p =>
        p.id === id ? { ...p, [field]: value } : p
      )
    );
  };

  const changedProducts = products.filter(
    p => p.newStock !== p.stockQuantity || p.newPrice !== p.price
  );

const updateInventory = async (
  items: {
    productId: string;
    newStock: number;
    newPrice: number;
  }[]
) => {
  try {
    if (!items.length) return;

    setRowLoading(items.length === 1 ? items[0].productId : "bulk");

    const res = await productsService.bulkUpdateInventory(items);

    if (!res?.data?.success) {
      toast.error(res?.data?.message || "Update failed");
      return;
    }

    const response = res.data;

    toast.success(
      `Updated: ${response.data?.updated ?? 0}, Skipped: ${response.data?.skipped ?? 0}`
    );

    // Sync updated values to UI
    setProducts((prev) =>
      prev.map((p) => {
        const updated = items.find((i) => i.productId === p.id);
        if (!updated) return p;

        return {
          ...p,
          stockQuantity: updated.newStock,
          price: updated.newPrice,
        };
      })
    );
  } catch (error: any) {
    toast.error(
      error?.response?.data?.message || "Update failed"
    );
  } finally {
    setRowLoading(null);
  }
};  
  
const handleBulkUpdate = () => {
  const changed = products
    .filter(
      p =>
        p.newStock !== p.stockQuantity ||
        p.newPrice !== p.price
    )
    .map(p => ({
      productId: p.id,
      newStock: p.newStock,
      newPrice: p.newPrice,
    }));

  if (changed.length === 0) {
    toast.warning("No changes to update");
    return;
  }

  updateInventory(changed);
};
const handleExcelUpload = async (event: any) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const res = await productsService.bulkUploadInventoryExcel(file);

    if (!res || !res.data) {
      toast.error("Invalid server response");
      return;
    }

    const response = res.data;

    if (response.success) {
      toast.success(
        `Updated: ${response.data?.updated ?? 0}, Skipped: ${response.data?.skipped ?? 0}`
      );

      // 🔥 Backend row errors
      if (response.data?.errors?.length) {
        response.data.errors.forEach((err) => {
          toast.error(
            `Row ${err.row} - ${err.productId} → ${err.reason}`
          );
        });
      }

      fetchProducts();
    } else {
      toast.error(response.message || "Excel upload failed");

      if (response.errors?.length) {
        response.errors.forEach((errMsg) => {
          toast.error(errMsg);
        });
      }
    }
  } catch (error: any) {
    toast.error(
      error?.response?.data?.message ||
        error?.message ||
        "Excel upload failed"
    );
  }
};
const [isMounted, setIsMounted] = useState(false);

useEffect(() => {
  setIsMounted(true);
}, []);
  const downloadSelectedTemplate = () => {
    if (selected.size === 0) {
      toast.warning("Select products first");
      return;
    }

    const selectedRows = products.filter(p => selected.has(p.id));

    const data = selectedRows.map(p => ({
      ProductId: p.id,
      ProductName: p.name,
      SKU: p.sku,
      CurrentStock: p.stockQuantity,
      NewStock: "",
      CurrentPrice: p.price,
      NewPrice: "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    XLSX.writeFile(workbook, "selected-inventory-template.xlsx");
  };

  const downloadFullTemplate = () => {
    const data = products.map(p => ({
      ProductId: p.id,
      ProductName: p.name,
      SKU: p.sku,
      CurrentStock: p.stockQuantity,
      NewStock: "",
      CurrentPrice: p.price,
      NewPrice: "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    XLSX.writeFile(workbook, "full-inventory-template.xlsx");
  };

if (!isMounted) return null;
  return (
    <div className="space-y-2 relative">
      <h1 className="text-2xl font-bold text-white">Inventory Management</h1>

      <div className="flex gap-4 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white w-full"
          />
        </div>

        <div className="w-52">
          <Select styles={selectStyles} options={categories} value={selectedCategory} onChange={setSelectedCategory} placeholder="Category" />
        </div>

        <div className="w-52">
          <Select styles={selectStyles} options={brands} value={selectedBrand} onChange={setSelectedBrand} placeholder="Brand" />
        </div>
{selected.size > 0 && (
  <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4">

    <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl rounded-2xl px-6 py-4 flex items-center justify-between gap-6 animate-slideDown">

      {/* LEFT SIDE CONTENT */}
      <div>
        <h3 className="text-white font-semibold text-sm">
          Products Selected
        </h3>
        <p className="text-slate-400 text-xs">
          {selected.size} product(s) selected for export.
        </p>
      </div>

      {/* RIGHT SIDE ACTIONS */}
      <div className="flex items-center gap-4">

        <button
          onClick={() => setSelected(new Set())}
          className="px-5 py-2 text-sm font-medium rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition"
        >
          Clear Selection
        </button>

        <button
          onClick={downloadSelectedTemplate}
          className="flex items-center gap-2 px-6 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition"
        >
          <Download size={16} />
          Export ({selected.size})
        </button>

      </div>
    </div>
  </div>
)}
 <button
    onClick={() => router.push("/admin/products")}
    className="flex items-center gap-2 px-4 py-2 text-sm
    bg-gradient-to-r from-emerald-500 to-teal-500
    hover:from-emerald-600 hover:to-teal-600
    text-white rounded-xl font-semibold shadow-md
    hover:shadow-emerald-500/40
    transition-all duration-200"
  >
    <ShoppingCart className="w-4 h-4 stroke-[2.2]" />
    <span>Products</span>
  </button>
        <button onClick={downloadFullTemplate} className="px-4 py-2 bg-indigo-600 rounded-xl text-white flex items-center gap-2">
          <Download size={16}/> Export All
        </button>

        <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-purple-600 rounded-xl text-white flex items-center gap-2">
          <Upload size={16}/> Upload Excel
        </button>

    <input
  type="file"
  hidden
  ref={fileInputRef}
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    openConfirm(
      "Upload Inventory File",
      "This will update inventory based on the uploaded Excel file. Do you want to continue?",
      () => handleExcelUpload(e)
    );
  }}
/>
      </div>

   {isMounted && (
  <div className="overflow-x-auto bg-slate-900 rounded-2xl border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="p-3 text-center">
                <input
  type="checkbox"
  checked={
    filteredProducts.length > 0 &&
    selected.size === filteredProducts.length
  }
  onChange={toggleSelectAll}
/>
              </th>
              <th className="p-3 text-left text-slate-400">Product</th>
              <th className="p-3 text-center text-slate-400">SKU</th>
              <th className="p-3 text-center w-32 text-slate-400">Current Stock</th>
              <th className="p-3 text-center text-slate-400">New Stock</th>
              <th className="p-3 text-center w-32 text-slate-400">Current Price</th>
              <th className="p-3 text-center text-slate-400">New Price</th>
            </tr>
          </thead>
        <tbody>
  {tableLoading ? (
    <tr>
      <td colSpan={7} className="p-16 text-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-slate-700 border-t-violet-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">
            Loading inventory...
          </p>
        </div>
      </td>
    </tr>
  ) : filteredProducts.length === 0 ? (
    <tr>
      <td colSpan={7} className="p-16 text-center text-slate-500">
        No products found.
      </td>
    </tr>
  ) : (
    filteredProducts.map((p) => (
      <tr
        key={p.id}
        className={`border-b border-slate-800 hover:bg-slate-800/40 ${
          selected.has(p.id) ? "bg-slate-800/50" : ""
        }`}
      >
        <td className="p-3 text-center">
          <input
            type="checkbox"
            checked={selected.has(p.id)}
            onChange={() => toggleSelect(p.id)}
          />
        </td>

        <td className="py-2 px-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-md bg-gradient-to-br from-violet-500 to-pink-500 overflow-hidden flex-shrink-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (p.images && p.images.length > 0) {
                  openMediaViewer(p.images, 0);
                }
              }}
            >
              {p.image ? (
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-sm">
                  📦
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-white font-medium truncate">
                {p.name}
              </p>

              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-500 truncate">
                  {p.categoryName}
                </span>
                <span className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">
                  {p.brandName}
                </span>
              </div>
            </div>
          </div>
        </td>

        <td className="p-3 text-center text-white">
          {p.sku}
        </td>

        <td className="p-3 text-center text-white">
          {p.stockQuantity}
        </td>

        <td className="p-3 text-center">
          <input
            type="number"
            value={p.newStock}
            disabled={rowLoading === p.id}
            onChange={(e) =>
              handleChange(p.id, "newStock", Number(e.target.value))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (
                  p.newStock !== p.stockQuantity ||
                  p.newPrice !== p.price
                ) {
                  updateInventory([
                    {
                      productId: p.id,
                      newStock: p.newStock,
                      newPrice: p.newPrice,
                    },
                  ]);
                }
              }
            }}
            className="w-24 bg-slate-800 border border-slate-600 rounded-lg text-white text-center focus:ring-2 focus:ring-violet-500 outline-none transition"
          />
        </td>

        <td className="p-3 text-center text-emerald-400">
          £{p.price}
        </td>

        <td className="p-3 text-center relative">
          <input
            type="number"
            value={p.newPrice}
            disabled={rowLoading === p.id}
            onChange={(e) =>
              handleChange(p.id, "newPrice", Number(e.target.value))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (
                  p.newStock !== p.stockQuantity ||
                  p.newPrice !== p.price
                ) {
                  updateInventory([
                    {
                      productId: p.id,
                      newStock: p.newStock,
                      newPrice: p.newPrice,
                    },
                  ]);
                }
              }
            }}
            className="w-24 bg-slate-800 border border-slate-600 rounded-lg text-white text-center focus:ring-2 focus:ring-emerald-500 outline-none transition"
          />

          {rowLoading === p.id && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 rounded-lg">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          )}
        </td>
      </tr>
    ))
  )}
</tbody>
        </table>
  </div>
)}

{changedProducts.length > 0 && (
  <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4">
    
    <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl rounded-2xl px-6 py-4 flex items-center justify-between gap-4 animate-slideDown">

      {/* LEFT INFO SECTION */}
      <div>
        <h3 className="text-white font-semibold text-sm">
          Unsaved Changes
        </h3>
        <p className="text-slate-400 text-xs">
          {changedProducts.length} product(s) modified. 
          Review and save your changes or discard them.
        </p>
      </div>

      {/* RIGHT ACTION BUTTONS */}
      <div className="flex items-center gap-3">

        <button
        onClick={() =>
  openConfirm(
    "Discard Changes",
    "Are you sure you want to discard all unsaved changes? This action cannot be undone.",
    discardChanges
  )
}
          className="px-4 py-2 text-sm font-medium rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 transition"
          title="Discard all unsaved changes"
        >
          Discard Changes
        </button>

        <button
onClick={handleBulkUpdate}
          className="px-5 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition"
          title="Save all modified product stock and price updates"
        >
          Save Changes ({changedProducts.length})
        </button>

      </div>
    </div>
  </div>
)}

<MediaViewerModal
  isOpen={viewerOpen}
  onClose={() => setViewerOpen(false)}
  media={viewerMedia}
  initialIndex={viewerIndex}
/>

<ConfirmDialog
  isOpen={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  onConfirm={confirmConfig.onConfirm}
  title={confirmConfig.title}
  message={confirmConfig.message}
  confirmText="Yes, Continue"
  cancelText="Cancel"
/>
    </div>
  );
}