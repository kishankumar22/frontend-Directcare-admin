"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Search, 
  CheckCircle2, 
  ShoppingCart,
  Package,
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
} from "lucide-react";
import Select from "react-select";
import { categoriesService } from "@/lib/services/categories";
import { productsService } from "@/lib/services/products";
import { useToast } from "@/app/admin/_components/CustomToast";
import { cn } from "@/lib/utils";

// ==========================================
// CONSTANTS & TYPES
// ==========================================

const PRODUCT_FIELDS = [
  { id: "sku", label: "SKU", isAlwaysRequired: true },
  { id: "categoryIds", label: "Category IDs" },
  { id: "name", label: "Name" },
  { id: "description", label: "Full Description" },
  { id: "shortDescription", label: "Short Description" },
  { id: "slug", label: "Slug" },
  { id: "gtin", label: "GTIN / Barcode" },
  { id: "manufacturerPartNumber", label: "Manufacturer Part Number" },
  { id: "status", label: "Status" },
  { id: "isPublished", label: "Is Published" },
  { id: "publishedAt", label: "Published At" },
  { id: "productType", label: "Product Type" },
  { id: "visibleIndividually", label: "Visible Individually" },
  { id: "customerRoles", label: "Customer Roles" },
  { id: "limitedToStores", label: "Limited To Stores" },
  { id: "vendorId", label: "Vendor ID" },
  { id: "requireOtherProducts", label: "Require Other Products" },
  { id: "requiredProductIds", label: "Required Product IDs" },
  { id: "automaticallyAddProducts", label: "Automatically Add Products" },
  { id: "showOnHomepage", label: "Show On Homepage" },
  { id: "displayOrder", label: "Display Order" },
  { id: "adminComment", label: "Admin Comment" },
  { id: "isPack", label: "Is Pack" },
  { id: "gender", label: "Gender" },
  { id: "vendor", label: "Vendor" },
  { id: "tags", label: "Tags" },
  { id: "price", label: "Price", isBlue: true },
  { id: "oldPrice", label: "Old Price" },
  { id: "compareAtPrice", label: "Compare At" },
  { id: "costPrice", label: "Cost Price" },
  { id: "disableBuyButton", label: "Disable Buy Button" },
  { id: "disableWishlistButton", label: "Disable Wishlist Button" },
  { id: "availableForPreOrder", label: "Available For Pre Order" },
  { id: "preOrderStartDate", label: "Pre Order Start Date" },
  { id: "basepriceEnabled", label: "Baseprice Enabled" },
  { id: "basepriceAmount", label: "Baseprice Amount" },
  { id: "basepriceUnit", label: "Baseprice Unit" },
  { id: "basepriceBaseAmount", label: "Baseprice Base Amount" },
  { id: "basepriceBaseUnit", label: "Baseprice Base Unit" },
  { id: "markAsNew", label: "Mark As New" },
  { id: "markAsNewStartDate", label: "Mark As New Start Date" },
  { id: "markAsNewEndDate", label: "Mark As New End Date" },
  { id: "availableStartDate", label: "Available Start Date" },
  { id: "availableEndDate", label: "Available End Date" },
  { id: "vatExempt", label: "VAT Exempt" },
  { id: "vatRateId", label: "VAT Rate ID" },
  { id: "trackQuantity", label: "Track Quantity" },
  { id: "manageInventoryMethod", label: "Manage Inventory Method" },
  { id: "stockQuantity", label: "Stock Qty" },
  { id: "displayStockAvailability", label: "Display Stock Availability" },
  { id: "displayStockQuantity", label: "Display Stock Quantity" },
  { id: "minStockQuantity", label: "Min Stock Quantity" },
  { id: "lowStockThreshold", label: "Low Stock Threshold" },
  { id: "notifyAdminBelow", label: "Notify Admin Below" },
  { id: "notifyQuantityBelow", label: "Notify Quantity Below" },
  { id: "allowBackorder", label: "Allow Backorder" },
  { id: "backorderMode", label: "Backorder Mode" },
  { id: "orderMinimumQuantity", label: "Order Minimum Quantity" },
  { id: "orderMaximumQuantity", label: "Order Maximum Quantity" },
  { id: "allowedQuantities", label: "Allowed Quantities" },
  { id: "notReturnable", label: "Not Returnable" },
  { id: "requiresShipping", label: "Requires Shipping" },
  { id: "shipSeparately", label: "Ship Separately" },
  { id: "deliveryDateId", label: "Delivery Date ID" },
  { id: "estimatedDispatch", label: "Estimated Dispatch" },
  { id: "dispatchTimeNote", label: "Dispatch Time Note" },
  { id: "sameDayDeliveryEnabled", label: "Same Day Delivery Enabled" },
  { id: "nextDayDeliveryEnabled", label: "Next Day Delivery Enabled" },
  { id: "nextDayDeliveryFree", label: "Next Day Delivery Free" },
  { id: "standardDeliveryEnabled", label: "Standard Delivery Enabled" },
  { id: "weight", label: "Weight" },
  { id: "length", label: "Length" },
  { id: "width", label: "Width" },
  { id: "height", label: "Height" },
  { id: "weightUnit", label: "Weight Unit" },
  { id: "dimensionUnit", label: "Dimension Unit" },
  { id: "isRecurring", label: "Is Recurring" },
  { id: "recurringCycleLength", label: "Recurring Cycle Length" },
  { id: "recurringCyclePeriod", label: "Recurring Cycle Period" },
  { id: "recurringTotalCycles", label: "Recurring Total Cycles" },
  { id: "subscriptionDiscountPercentage", label: "Subscription Discount %" },
  { id: "allowedSubscriptionFrequencies", label: "Subscription Frequencies" },
  { id: "subscriptionDescription", label: "Subscription Description" },
  { id: "isRental", label: "Is Rental" },
  { id: "rentalPriceLength", label: "Rental Price Length" },
  { id: "rentalPricePeriod", label: "Rental Price Period" },
  { id: "metaTitle", label: "Meta Title" },
  { id: "metaDescription", label: "Meta Description" },
  { id: "metaKeywords", label: "Meta Keywords" },
  { id: "searchEngineFriendlyPageName", label: "Search Engine Friendly Page Name" },
  { id: "viewCount", label: "View Count" },
  { id: "averageRating", label: "Average Rating" },
  { id: "reviewCount", label: "Review Count" },
  { id: "allowCustomerReviews", label: "Allow Customer Reviews" },
  { id: "excludeFromLoyaltyPoints", label: "Exclude From Loyalty Points" },
  { id: "isActive", label: "Is Active" },
  { id: "isPharmaProduct", label: "Is Pharma Product" },
  { id: "videoUrls", label: "Video URLs" },
  { id: "relatedProductIds", label: "Related Product IDs" },
  { id: "crossSellProductIds", label: "Cross Sell Product IDs" },
  { id: "groupBundleDiscountPercentage", label: "Group Bundle Discount %" },
  { id: "groupBundleDiscountAmount", label: "Group Bundle Discount Amount" },
  { id: "groupBundleDiscountType", label: "Group Bundle Discount Type" },
  { id: "groupBundleSpecialPrice", label: "Group Bundle Special Price" },
  { id: "groupBundleSavingsMessage", label: "Group Bundle Savings Message" },
  { id: "applyDiscountToAllItems", label: "Apply Discount To All Items" },
  { id: "showIndividualPrices", label: "Show Individual Prices" },
  { id: "brandId", label: "Brand ID" },
  { id: "trackInventory", label: "Variant Track Inventory" },
  { id: "optionValues", label: "Variant Option Values" },
  { id: "option1Name", label: "Variant Option 1 Name" },
  { id: "option1Value", label: "Variant Option 1 Value" },
  { id: "option2Name", label: "Variant Option 2 Name" },
  { id: "option2Value", label: "Variant Option 2 Value" },
  { id: "option3Name", label: "Variant Option 3 Name" },
  { id: "option3Value", label: "Variant Option 3 Value" },
  { id: "imageUrl", label: "Variant Image URL" },
  { id: "isDefault", label: "Variant Is Default" },
  { id: "barcode", label: "Variant Barcode" },
  { id: "parentProductId", label: "Variant Parent Product ID" },
];

interface SelectOption {
  value: string;
  label: string;
}

// ==========================================
// CUSTOM STYLES FOR REACT-SELECT
// ==========================================

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    borderColor: state.isFocused ? "#3b82f6" : "rgba(71, 85, 105, 0.5)",
    color: "#fff",
    borderRadius: "0.75rem",
    padding: "0.25rem",
    "&:hover": { borderColor: "#3b82f6" }
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: "#0f172a",
    border: "1px solid rgba(71, 85, 105, 0.5)",
    borderRadius: "0.75rem",
    zIndex: 50
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused ? "#1e293b" : "transparent",
    color: "#fff",
    cursor: "pointer",
    "&:active": { backgroundColor: "#334155" }
  }),
  singleValue: (base: any) => ({ ...base, color: "#fff" }),
  input: (base: any) => ({ ...base, color: "#fff" }),
  placeholder: (base: any) => ({ ...base, color: "#94a3b8" }),
};

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================

export default function ImportExportPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SelectOption | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [publishedStatus, setPublishedStatus] = useState<SelectOption>({ value: "all", label: "All" });
  const [stockStatus, setStockStatus] = useState<SelectOption>({ value: "all", label: "All" });
  const [selectedFields, setSelectedFields] = useState<string[]>(PRODUCT_FIELDS.map(f => f.id));
  
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Load Categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoriesService.getAll();
        if (response.data?.success) {
          const flatCategories: SelectOption[] = [];
          
          const flatten = (items: any[], prefix = "") => {
            items.forEach((cat: any) => {
              const name = prefix ? `${prefix} > ${cat.name}` : cat.name;
              flatCategories.push({ value: cat.id, label: name });
              if (cat.subCategories && cat.subCategories.length > 0) {
                flatten(cat.subCategories, name);
              }
            });
          };

          flatten(response.data.data.items);
          setCategories([{ value: "all", label: "All Categories" }, ...flatCategories]);
        }
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }
    };

    fetchCategories();
  }, []);

  // Handlers
  const handleToggleField = (id: string) => {
    // 🛡️ Prevent unselecting mandatory fields (like SKU)
    const field = PRODUCT_FIELDS.find(f => f.id === id);
    if (field?.isAlwaysRequired) return;

    setSelectedFields(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleSelectAllFields = () => {
    if (selectedFields.length === PRODUCT_FIELDS.length) {
      // 🛡️ Keep SKU even when deselecting all
      setSelectedFields(["sku"]);
    } else {
      setSelectedFields(PRODUCT_FIELDS.map(f => f.id));
    }
  };

  const handleDownload = async () => {
    if (selectedFields.length === 0) {
      toast.error("Please select at least one field to include in the template.");
      return;
    }

    setDownloading(true);
    try {
      const params = {
        searchTerm,
        categoryId: selectedCategory?.value === "all" ? undefined : selectedCategory?.value,
        isPublished: publishedStatus.value === "all" ? undefined : publishedStatus.value === "published",
        stockStatus: stockStatus.value === "all" ? undefined : stockStatus.value,
        fields: selectedFields,
      };

      const response = await productsService.downloadBulkUpdateTemplate(params);
      
      // ✅ FIX: Check if response.data is valid
      if (!response.data) {
        toast.error("No data received from server.");
        return;
      }

      // If the response is a Blob, check its size and type
      const blob = response.data instanceof Blob 
        ? response.data 
        : new Blob([response.data as any], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

      if (blob.size < 100) {
        // Very small blobs are usually JSON error messages
        const text = await blob.text();
        try {
          const json = JSON.parse(text);
          toast.error(json.message || "Failed to generate template.");
          return;
        } catch (e) {
          // Not JSON, but still too small to be a valid Excel
          console.error("Corrupt blob received", text);
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Product_Bulk_Update_${new Date().toISOString().slice(0,10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Template downloaded successfully!");
    } catch (err: any) {
      console.error("Download failed", err);
      toast.error("Failed to download template. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await productsService.bulkUpdateWithExcel(file);
      if (response.data?.success) {
        toast.success(response.data.message || "Products updated successfully!");
      } else {
        toast.error(response.data?.message || "Failed to update products.");
      }
    } catch (err: any) {
      console.error("Upload failed", err);
      // 🔥 Extract detailed backend error messages
      const backendError = err.response?.data?.errors;
      let errorMsg = err.response?.data?.message || "Failed to upload file.";
      
      if (backendError) {
        const firstKey = Object.keys(backendError)[0];
        if (firstKey && Array.isArray(backendError[firstKey])) {
          errorMsg = `${firstKey}: ${backendError[firstKey][0]}`;
        }
      }
      
      toast.error(errorMsg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-2 space-y-2 animate-in fade-in duration-500">
      {/* HEADER SECTION */}
<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

  {/* LEFT: Title */}
  <div className="space-y-1">
    <h1 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-2">
      <FileSpreadsheet className="h-6 w-6 text-cyan-400" />
      Import / Export
    </h1>
    <p className="text-xs text-slate-400">
      Export orders and bulk update products via Excel
    </p>
  </div>

  {/* RIGHT: Cards */}
  <div className="flex gap-3 w-full lg:w-auto">

    {/* Orders Export */}
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-cyan-500/40 transition min-w-[220px]">
      <div className="h-9 w-9 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
        <ShoppingCart size={18} />
      </div>
      <div className="leading-tight">
        <h3 className="text-sm font-semibold text-white">
          Orders Export
        </h3>
        <p className="text-[11px] text-slate-400">
          Download orders
        </p>
      </div>
    </div>

    {/* Products Bulk */}
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/40 min-w-[240px]">
      <div className="h-9 w-9 rounded-lg bg-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
        <Package size={18} />
      </div>
      <div className="leading-tight">
        <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
          Products Bulk
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
        </h3>
        <p className="text-[11px] text-slate-400">
          Template → Edit → Upload
        </p>
      </div>
    </div>

  </div>

</div>

      {/* STEPS GUIDE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { step: "01", title: "Download Template", desc: "Pre-filled Excel with current data", icon: Download, color: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" },
          { step: "02", title: "Edit Blue Columns", desc: "Price, stock, name — skip blank fields", icon: EditStepIcon, color: "bg-purple-500/10 border-purple-500/30 text-purple-400" },
          { step: "03", title: "Upload & Apply", desc: "Push changes live by re-uploading", icon: Upload, color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
        ].map((item, i) => (
        <div
  key={i}
  className={cn(
    "rounded-xl border p-4 flex flex-col gap-3 relative overflow-hidden group",
    item.color
  )}
>
  {/* background step number */}
  <div className="absolute -right-1 -bottom-1 text-5xl font-black opacity-5 group-hover:scale-110 transition-transform">
    {item.step}
  </div>

  {/* top row */}
  <div className="flex items-start justify-between gap-3">
    {/* left: icon + text */}
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
        <item.icon size={18} />
      </div>

      <div>
        <h4 className="font-bold text-sm text-white leading-tight">
          {item.title}
        </h4>
        <p className="text-xs opacity-70 leading-tight mt-0.5">
          {item.desc}
        </p>
      </div>
    </div>

    {/* right: step */}
    <span className="text-[10px] font-bold opacity-60">
      {item.step}
    </span>
  </div>
</div>
        ))}
      </div>

      {/* MAIN WORKSPACE SECTION */}
      <div className="rounded-2xl bg-slate-900/40 border border-slate-800 overflow-hidden backdrop-blur-md">
        
<div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2">

  {/* LEFT */}
  <div className="flex items-center gap-2.5 min-w-0">
    <div className="h-5 w-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[9px] font-semibold shrink-0">
      1
    </div>

    <div className="leading-tight">
      <h2 className="text-sm font-medium text-white">
        Download Template
      </h2>
      <p className="text-[10px] text-slate-400">
        Select fields & filter products
      </p>
    </div>
  </div>

  {/* RIGHT */}
  <div className="flex flex-col items-end gap-[2px] shrink-0">

    <div className="flex items-center gap-2">
      <button
        onClick={handleSelectAllFields}
        className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500 hover:text-slate-950 transition"
      >
        {selectedFields.length === PRODUCT_FIELDS.length
          ? "Deselect All "
          : "Select All"}
      </button>

      <span className="text-[11px] text-slate-400">
        {selectedFields.length}/{PRODUCT_FIELDS.length}
      </span>
    </div>

    {/* helper */}
    <p className="text-[9px] text-slate-600">
      Fields will appear in Excel (SKU required)
    </p>

  </div>

</div>

        {/* FILTERS GRID */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="space-y-1.5">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={14} />
              <input 
                type="text" 
                placeholder="Name or SKU"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Select
              options={categories}
              styles={{
                ...selectStyles,
                control: (base: any, state: any) => ({
                  ...base,
                  backgroundColor: "rgba(30, 41, 59, 0.5)",
                  borderColor: state.isFocused ? "#3b82f6" : "rgba(71, 85, 105, 0.5)",
                  color: "#fff",
                  borderRadius: "0.75rem",
                  padding: "0",
                  minHeight: "36px",
                  "&:hover": { borderColor: "#3b82f6" }
                }),
                valueContainer: (base: any) => ({ ...base, padding: "2px 8px" }),
              }}
              value={selectedCategory}
              onChange={setSelectedCategory}
              placeholder="All Categories"
              isSearchable
            />
          </div>

          {/* Published Status */}
          <div className="space-y-1.5">
            <Select
              options={[
                { value: "all", label: "All" },
                { value: "published", label: "Published" },
                { value: "unpublished", label: "Unpublished" },
              ]}
              styles={{
                ...selectStyles,
                control: (base: any, state: any) => ({
                  ...base,
                  backgroundColor: "rgba(30, 41, 59, 0.5)",
                  borderColor: state.isFocused ? "#3b82f6" : "rgba(71, 85, 105, 0.5)",
                  color: "#fff",
                  borderRadius: "0.75rem",
                  padding: "0",
                  minHeight: "36px",
                  "&:hover": { borderColor: "#3b82f6" }
                }),
                valueContainer: (base: any) => ({ ...base, padding: "2px 8px" }),
              }}
              value={publishedStatus}
              onChange={(val: any) => setPublishedStatus(val)}
            />
          </div>

          {/* Stock Status */}
          <div className="space-y-1.5">
            <Select
              options={[
                { value: "all", label: "All" },
                { value: "InStock", label: "In Stock" },
                { value: "LowStock", label: "Low Stock" },
                { value: "OutOfStock", label: "Out of Stock" },
              ]}
              styles={{
                ...selectStyles,
                control: (base: any, state: any) => ({
                  ...base,
                  backgroundColor: "rgba(30, 41, 59, 0.5)",
                  borderColor: state.isFocused ? "#3b82f6" : "rgba(71, 85, 105, 0.5)",
                  color: "#fff",
                  borderRadius: "0.75rem",
                  padding: "0",
                  minHeight: "36px",
                  "&:hover": { borderColor: "#3b82f6" }
                }),
                valueContainer: (base: any) => ({ ...base, padding: "2px 8px" }),
              }}
              value={stockStatus}
              onChange={(val: any) => setStockStatus(val)}
            />
          </div>
        </div>

        {/* FIELDS SELECTION GRID */}
<div className="px-4 pb-4 space-y-3">

  {/* HEADER */}


  {/* GRID */}
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
    {PRODUCT_FIELDS.map((field) => (
        <div
          key={field.id}
          onClick={() => !field.isAlwaysRequired && handleToggleField(field.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all group",
            field.isAlwaysRequired 
              ? "bg-cyan-500/20 border-cyan-500/60 text-white cursor-default opacity-80" 
              : selectedFields.includes(field.id)
                ? "bg-cyan-500/10 border-cyan-500/40 text-white cursor-pointer"
                : "bg-slate-950/30 border-slate-800 text-slate-400 hover:border-slate-600 cursor-pointer"
          )}
        >
          {/* checkbox */}
          <div
            className={cn(
              "h-4 w-4 rounded flex items-center justify-center border transition-all shrink-0",
              selectedFields.includes(field.id)
                ? "bg-cyan-500 border-cyan-500"
                : "border-slate-600"
            )}
          >
            {selectedFields.includes(field.id) && (
              <CheckCircle2 className="h-3 w-3 text-slate-950" strokeWidth={3} />
            )}
          </div>

        {/* label */}
        <span
          className={cn(
            "text-xs font-medium truncate",
            field.isBlue && "text-blue-400 font-semibold",
            selectedFields.includes(field.id) && !field.isBlue && "text-white"
          )}
        >
          {field.label}
        </span>

        <input
          type="checkbox"
          className="hidden"
          checked={selectedFields.includes(field.id)}
          onChange={() => handleToggleField(field.id)}
        />
        </div>
    ))}
  </div>
</div>
        {/* FINAL ACTIONS FOOTER */}
        <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-lg border border-amber-400/20">
            <AlertCircle size={14} />
            <p className="text-[10px] font-medium uppercase tracking-wider">Ensure SKU column is never modified in Excel</p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={handleDownload}
              disabled={downloading || uploading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-50 hover:text-black text-white rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-600/20"
            >
              {downloading ? "Generating..." : "Download Template"}
            </button>

            <div className="relative group">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls"
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={downloading || uploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-50 hover:text-black text-white rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20"
              >
                {uploading ? "Uploading..." : "Upload & Apply"}
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// Custom Icon for Step 02
function EditStepIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
