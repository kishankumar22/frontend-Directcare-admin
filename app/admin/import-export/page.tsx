'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Download,
  Upload,
  FileSpreadsheet,
  ShoppingCart,
  Package,
  CheckCircle,
  AlertCircle,
  Loader2,
  Filter,
  RefreshCw,
  ChevronDown,
  FileDown,
  FileUp,
  Sparkles,
  ArrowDownToLine,
  UploadCloud,
} from 'lucide-react';
import { orderService } from '@/lib/services/orders';
import productsService from '@/lib/services/products';
import { categoriesService } from '@/lib/services/categories';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'orders-export' | 'products-bulk-update';

type OrderStatus =
  | 'Pending' | 'Confirmed' | 'Processing' | 'Shipped'
  | 'PartiallyShipped' | 'Delivered' | 'Cancelled' | 'Returned'
  | 'Refunded' | 'Collected';

interface BulkUpdateResult {
  totalRows: number;
  productsUpdated: number;
  variantsUpdated: number;
  skipped: number;
  failed: number;
  errors: string[];
  warnings: string[];
}

interface OrderBulkUpdateResult {
  totalRows: number;
  ordersUpdated: number;
  skipped: number;
  failed: number;
  errors: string[];
  warnings: string[];
}

interface CategoryOption {
  id: string;
  name: string;
  parentCategoryId?: string | null;
  subCategories?: CategoryOption[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flattenCategories(categories: CategoryOption[], parentPath = ''): { id: string; name: string; path: string; isParent: boolean }[] {
  return categories.flatMap(category => {
    const path = parentPath ? `${parentPath} > ${category.name}` : category.name;
    return [
      { id: category.id, name: category.name, path, isParent: !parentPath },
      ...flattenCategories(category.subCategories || [], path),
    ];
  });
}

function buildCategoryPaths(categories: CategoryOption[]): { id: string; name: string; path: string; isParent: boolean }[] {
  const byId = new Map(categories.map(category => [category.id, category]));

  const getPath = (category: CategoryOption, seen = new Set<string>()): string => {
    if (!category.parentCategoryId || seen.has(category.parentCategoryId)) return category.name;
    const parent = byId.get(category.parentCategoryId);
    if (!parent) return category.name;
    seen.add(category.id);
    return `${getPath(parent, seen)} > ${category.name}`;
  };

  return categories.map(category => ({
    id: category.id,
    name: category.name,
    path: getPath(category),
    isParent: !category.parentCategoryId,
  }));
}

const EDITABLE_FIELDS: { key: string; label: string }[] = [
  { key: 'sku',              label: 'SKU' },
  { key: 'categoryIds',      label: 'Category Names' },
  { key: 'name',             label: 'Name' },
  { key: 'description',      label: 'Description' },
  { key: 'shortDescription', label: 'Short Description' },
  { key: 'slug',             label: 'Slug' },
  { key: 'gtin',             label: 'GTIN / Barcode' },
  { key: 'manufacturerPartNumber', label: 'Manufacturer Part Number' },
  { key: 'status',           label: 'Status' },
  { key: 'isPublished',      label: 'Is Published' },
  { key: 'publishedAt',      label: 'Published At' },
  { key: 'productType',      label: 'Product Type' },
  { key: 'visibleIndividually', label: 'Visible Individually' },
  { key: 'customerRoles',    label: 'Customer Roles' },
  { key: 'limitedToStores',  label: 'Limited To Stores' },
  { key: 'vendorId',         label: 'Vendor ID' },
  { key: 'requireOtherProducts', label: 'Require Other Products' },
  { key: 'requiredProductIds', label: 'Required Product IDs' },
  { key: 'automaticallyAddProducts', label: 'Automatically Add Products' },
  { key: 'showOnHomepage',   label: 'Show On Homepage' },
  { key: 'displayOrder',     label: 'Display Order' },
  { key: 'adminComment',     label: 'Admin Comment' },
  { key: 'isPack',           label: 'Is Pack' },
  { key: 'gender',           label: 'Gender' },
  { key: 'vendor',           label: 'Vendor' },
  { key: 'tags',             label: 'Tags' },
  { key: 'price',            label: 'Price' },
  { key: 'oldPrice',         label: 'Old Price' },
  { key: 'compareAt',        label: 'Compare At' },
  { key: 'costPrice',        label: 'Cost Price' },
  { key: 'disableBuyButton', label: 'Disable Buy Button' },
  { key: 'disableWishlistButton', label: 'Disable Wishlist Button' },
  { key: 'availableForPreOrder', label: 'Available For Pre Order' },
  { key: 'preOrderAvailabilityStartDate', label: 'Pre Order Start Date' },
  { key: 'basepriceEnabled', label: 'Baseprice Enabled' },
  { key: 'basepriceAmount',  label: 'Baseprice Amount' },
  { key: 'basepriceUnit',    label: 'Baseprice Unit' },
  { key: 'basepriceBaseAmount', label: 'Baseprice Base Amount' },
  { key: 'basepriceBaseUnit', label: 'Baseprice Base Unit' },
  { key: 'markAsNew',        label: 'Mark As New' },
  { key: 'markAsNewStartDate', label: 'Mark As New Start Date' },
  { key: 'markAsNewEndDate', label: 'Mark As New End Date' },
  { key: 'availableStartDate', label: 'Available Start Date' },
  { key: 'availableEndDate', label: 'Available End Date' },
  { key: 'vatExempt',        label: 'VAT Exempt' },
  { key: 'vatRateId',        label: 'VAT Rate ID' },
  { key: 'trackQuantity',    label: 'Track Quantity' },
  { key: 'manageInventoryMethod', label: 'Manage Inventory Method' },
  { key: 'stock',            label: 'Stock Qty' },
  { key: 'displayStockAvailability', label: 'Display Stock Availability' },
  { key: 'displayStockQuantity', label: 'Display Stock Quantity' },
  { key: 'minStockQuantity', label: 'Min Stock Quantity' },
  { key: 'lowStockThreshold', label: 'Low Stock Threshold' },
  { key: 'notifyAdminForQuantityBelow', label: 'Notify Admin Below Qty' },
  { key: 'notifyQuantityBelow', label: 'Notify Quantity Below' },
  { key: 'allowBackorder',   label: 'Allow Backorder' },
  { key: 'backorderMode',    label: 'Backorder Mode' },
  { key: 'orderMinimumQuantity', label: 'Order Minimum Quantity' },
  { key: 'orderMaximumQuantity', label: 'Order Maximum Quantity' },
  { key: 'allowedQuantities', label: 'Allowed Quantities' },
  { key: 'notReturnable',    label: 'Not Returnable' },
  { key: 'requiresShipping', label: 'Requires Shipping' },
  { key: 'shipSeparately',   label: 'Ship Separately' },
  { key: 'deliveryDateId',   label: 'Delivery Date ID' },
  { key: 'estimatedDispatchDays', label: 'Estimated Dispatch Days' },
  { key: 'dispatchTimeNote', label: 'Dispatch Time Note' },
  { key: 'sameDayDeliveryEnabled', label: 'Same Day Delivery Enabled' },
  { key: 'nextDayDeliveryEnabled', label: 'Next Day Delivery Enabled' },
  { key: 'nextDayDeliveryFree', label: 'Next Day Delivery Free' },
  { key: 'standardDeliveryEnabled', label: 'Standard Delivery Enabled' },
  { key: 'nextDayDeliveryCutoffTime', label: 'Next Day Cutoff Time' },
  { key: 'weight',           label: 'Weight' },
  { key: 'length',           label: 'Length' },
  { key: 'width',            label: 'Width' },
  { key: 'height',           label: 'Height' },
  { key: 'weightUnit',       label: 'Weight Unit' },
  { key: 'dimensionUnit',    label: 'Dimension Unit' },
  { key: 'isRecurring',      label: 'Is Recurring' },
  { key: 'recurringCycleLength', label: 'Recurring Cycle Length' },
  { key: 'recurringCyclePeriod', label: 'Recurring Cycle Period' },
  { key: 'recurringTotalCycles', label: 'Recurring Total Cycles' },
  { key: 'subscriptionDiscountPercentage', label: 'Subscription Discount %' },
  { key: 'allowedSubscriptionFrequencies', label: 'Subscription Frequencies' },
  { key: 'subscriptionDescription', label: 'Subscription Description' },
  { key: 'isRental',         label: 'Is Rental' },
  { key: 'rentalPriceLength', label: 'Rental Price Length' },
  { key: 'rentalPricePeriod', label: 'Rental Price Period' },
  { key: 'metaTitle',        label: 'Meta Title' },
  { key: 'metaDescription',  label: 'Meta Description' },
  { key: 'metaKeywords',     label: 'Meta Keywords' },
  { key: 'searchEngineFriendlyPageName', label: 'Search Engine Friendly Page Name' },
  { key: 'viewCount',        label: 'View Count' },
  { key: 'averageRating',    label: 'Average Rating' },
  { key: 'reviewCount',      label: 'Review Count' },
  { key: 'allowCustomerReviews', label: 'Allow Customer Reviews' },
  { key: 'excludeFromLoyaltyPoints', label: 'Exclude From Loyalty Points' },
  { key: 'isActive',         label: 'Is Active' },
  { key: 'isPharmaProduct',  label: 'Is Pharma Product' },
  { key: 'videoUrls',        label: 'Video URLs' },
  { key: 'relatedProductIds', label: 'Related Product IDs' },
  { key: 'crossSellProductIds', label: 'Cross Sell Product IDs' },
  { key: 'groupBundleDiscountPercentage', label: 'Group Bundle Discount %' },
  { key: 'groupBundleDiscountAmount', label: 'Group Bundle Discount Amount' },
  { key: 'groupBundleDiscountType', label: 'Group Bundle Discount Type' },
  { key: 'groupBundleSpecialPrice', label: 'Group Bundle Special Price' },
  { key: 'groupBundleSavingsMessage', label: 'Group Bundle Savings Message' },
  { key: 'applyDiscountToAllItems', label: 'Apply Discount To All Items' },
  { key: 'showIndividualPrices', label: 'Show Individual Prices' },
  { key: 'brandId',          label: 'Brand ID' },
  { key: 'trackInventory',   label: 'Variant Track Inventory' },
  { key: 'optionValues',     label: 'Variant Option Values' },
  { key: 'option1Name',      label: 'Variant Option 1 Name' },
  { key: 'option1Value',     label: 'Variant Option 1 Value' },
  { key: 'option2Name',      label: 'Variant Option 2 Name' },
  { key: 'option2Value',     label: 'Variant Option 2 Value' },
  { key: 'option3Name',      label: 'Variant Option 3 Name' },
  { key: 'option3Value',     label: 'Variant Option 3 Value' },
  { key: 'imageUrl',         label: 'Variant Image URL' },
  { key: 'isDefault',        label: 'Variant Is Default' },
  { key: 'barcode',          label: 'Variant Barcode' },
  { key: 'parentProductId',  label: 'Variant Parent Product ID' },
];

// ─── Shared field components ──────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-widest">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition';

function SelectInput({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className={`${inputCls} appearance-none pr-9`}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
    </div>
  );
}

// ─── Orders Export Tab ────────────────────────────────────────────────────────

function OrdersExportTab() {
  const [filters, setFilters] = useState({
    status: '', fromDate: '', toDate: '', searchTerm: '', deliveryMethod: '',
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [orderUploadFile, setOrderUploadFile] = useState<File | null>(null);
  const [orderUploading, setOrderUploading] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderBulkUpdateResult | null>(null);
  const [orderUploadError, setOrderUploadError] = useState('');

  const ORDER_STATUSES: OrderStatus[] = [
    'Pending', 'Confirmed', 'Processing', 'Shipped', 'PartiallyShipped',
    'Delivered', 'Cancelled', 'Returned', 'Refunded', 'Collected',
  ];
  const hasFilters = Object.values(filters).some(Boolean);

  async function handleExport() {
    setLoading(true); setDone(false);
    try {
      const response = await orderService.exportOrders(filters);
      const blob = response.data as Blob;
      
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `orders-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
      setDone(true);
    } catch (err: any) { alert(`Export failed: ${err.message}`); }
    finally { setLoading(false); }
  }

  async function handleOrderUpload() {
    if (!orderUploadFile) return;
    setOrderUploading(true); setOrderResult(null); setOrderUploadError('');
    try {
      const res = await orderService.bulkUpdateExcel(orderUploadFile);
      if (res?.data) {
        setOrderResult((res.data as any).data || res.data);
      } else {
        throw new Error('No response from server');
      }
    } catch (err: any) { setOrderUploadError(err.message); }
    finally { setOrderUploading(false); }
  }

  return (
    <div className="space-y-5">
      {/* Filters card */}
      <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-slate-700/60">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <span className="text-sm font-semibold text-slate-200">Filters</span>
            {hasFilters && (
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[11px] font-medium border border-cyan-500/30">
                Active
              </span>
            )}
          </div>
          {hasFilters && (
            <button
              onClick={() => { setFilters({ status: '', fromDate: '', toDate: '', searchTerm: '', deliveryMethod: '' }); setDone(false); }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Order Status">
            <SelectInput value={filters.status} onChange={v => setFilters(f => ({ ...f, status: v }))}>
              <option value="">All Statuses</option>
              {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </SelectInput>
          </Field>

          <Field label="Delivery Method">
            <SelectInput value={filters.deliveryMethod} onChange={v => setFilters(f => ({ ...f, deliveryMethod: v }))}>
              <option value="">All Methods</option>
              <option value="HomeDelivery">Home Delivery</option>
              <option value="ClickAndCollect">Click &amp; Collect</option>
            </SelectInput>
          </Field>

          <Field label="Search">
            <input type="text" className={inputCls} placeholder="Order No / Email / Name"
              value={filters.searchTerm} onChange={e => setFilters(f => ({ ...f, searchTerm: e.target.value }))} />
          </Field>

          <Field label="From Date">
            <input type="date" className={inputCls}
              value={filters.fromDate} onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value }))} />
          </Field>

          <Field label="To Date">
            <input type="date" className={inputCls}
              value={filters.toDate} onChange={e => setFilters(f => ({ ...f, toDate: e.target.value }))} />
          </Field>
        </div>
      </div>

      {/* Download button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleExport}
          disabled={loading}
          className="group relative inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-all"
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
            : <><ArrowDownToLine className="h-4 w-4" /> Download Excel</>
          }
        </button>

        {done && !loading && (
          <span className="flex items-center gap-2 text-sm font-medium text-emerald-400">
            <CheckCircle className="h-4 w-4" /> Downloaded successfully
          </span>
        )}
      </div>

      <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-200">Upload Updated Orders Excel</p>
            <p className="mt-1 text-xs text-slate-500">Editable columns: Status, Tracking Number, Notes. Blank cells are skipped.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300">
            <FileUp className="h-4 w-4" />
            Choose file
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => {
                setOrderUploadFile(e.target.files?.[0] || null);
                setOrderResult(null);
                setOrderUploadError('');
              }}
            />
          </label>
        </div>

        {orderUploadFile && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-300">{orderUploadFile.name}</span>
            <button
              onClick={handleOrderUpload}
              disabled={orderUploading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {orderUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading</> : <><UploadCloud className="h-4 w-4" /> Upload & Apply</>}
            </button>
          </div>
        )}

        {orderResult && (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            Updated {orderResult.ordersUpdated} orders. Skipped {orderResult.skipped}. Failed {orderResult.failed}.
            {orderResult.errors?.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-red-300">
                {orderResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}

        {orderUploadError && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {orderUploadError}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Products Bulk Update Tab ─────────────────────────────────────────────────

function ProductsBulkUpdateTab() {
  const [templateFilters, setTemplateFilters] = useState({ searchTerm: '', isPublished: '', stockStatus: '', categoryIds: [] as string[] });
  const [categories, setCategories] = useState<{ id: string; name: string; path: string; isParent: boolean }[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>(EDITABLE_FIELDS.map(f => f.key));
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateDone, setTemplateDone] = useState(false);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkUpdateResult | null>(null);
  const [uploadError, setUploadError] = useState('');

  function toggleField(key: string) {
    setSelectedFields(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }
  function selectAllFields() { setSelectedFields(EDITABLE_FIELDS.map(f => f.key)); }
  function clearAllFields() { setSelectedFields([]); }
  function toggleCategory(id: string) {
    setTemplateFilters(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter(categoryId => categoryId !== id)
        : [...prev.categoryIds, id],
    }));
  }
  function clearCategories() {
    setTemplateFilters(prev => ({ ...prev, categoryIds: [] }));
  }

  useEffect(() => {
    let alive = true;

    async function loadCategories() {
      setCategoriesLoading(true);
      setCategoriesError('');
      try {
        const response = await categoriesService.getSimple({ includeInactive: true, isDeleted: false });
        const payload = response?.data;
        if (!payload) throw new Error('No data received from server');

        const items = (Array.isArray(payload.data)
          ? payload.data
          : Array.isArray((payload.data as any)?.items)
            ? (payload.data as any).items
          : Array.isArray((payload as any)?.items)
            ? (payload as any).items
          : Array.isArray(payload)
            ? payload
            : []) as CategoryOption[];

        if (alive) setCategories(items.some(item => item.parentCategoryId !== undefined) ? buildCategoryPaths(items) : flattenCategories(items));
      } catch (err: any) {
        if (alive) setCategoriesError(err?.message || 'Failed to load categories.');
        if (alive) setCategories([]);
      } finally {
        if (alive) setCategoriesLoading(false);
      }
    }

    loadCategories();
    return () => { alive = false; };
  }, []);

  async function handleDownloadTemplate() {
    setTemplateLoading(true); setTemplateDone(false);
    try {
      const isPublished = templateFilters.isPublished === 'true' ? true : templateFilters.isPublished === 'false' ? false : undefined;
      const response = await productsService.downloadBulkUpdateTemplate({
        searchTerm: templateFilters.searchTerm,
        isPublished,
        stockStatus: templateFilters.stockStatus,
        categoryId: templateFilters.categoryIds.join(','),
        fields: selectedFields,
      });
      const blob = response.data as Blob;

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `products-bulk-update-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
      setTemplateDone(true);
    } catch (err: any) { alert(`Download failed: ${err.message}`); }
    finally { setTemplateLoading(false); }
  }

  async function handleUpload() {
    if (!uploadFile) return;
    setUploading(true); setResult(null); setUploadError('');
    try {
      const response = await productsService.bulkUpdateWithExcel(uploadFile);
      if (response?.data) {
        setResult((response.data as any).data || response.data);
      } else {
        throw new Error('No response from server');
      }
    } catch (err: any) { setUploadError(err.message); }
    finally { setUploading(false); }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.xlsx')) {
      setUploadFile(file); setResult(null); setUploadError('');
    }
  }, []);

  return (
    <div className="space-y-3">
      {/* Step cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {[
          { n: '1', icon: <FileDown className="h-5 w-5" />, title: 'Download Template', desc: 'Pre-filled Excel with all current product data', grad: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30', iconCol: 'text-cyan-400' },
          { n: '2', icon: <FileSpreadsheet className="h-5 w-5" />, title: 'Edit Blue Columns', desc: 'Price, stock, name — leave blank to skip a field', grad: 'from-violet-500/20 to-purple-500/20 border-violet-500/30', iconCol: 'text-violet-400' },
          { n: '3', icon: <UploadCloud className="h-5 w-5" />, title: 'Upload & Apply', desc: 'Re-upload the file to push changes live', grad: 'from-emerald-500/20 to-green-500/20 border-emerald-500/30', iconCol: 'text-emerald-400' },
        ].map(({ n, icon, title, desc, grad, iconCol }) => (
       <div key={n} className={`relative rounded-xl border bg-gradient-to-br ${grad} p-4`}>
  
  <div className="flex items-start justify-between">
    
    {/* LEFT SIDE */}
    <div className="flex items-start gap-3">
      <div className={`inline-flex items-center justify-center rounded-lg bg-slate-800/60 p-2 ${iconCol}`}>
        {icon}
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>

    {/* RIGHT SIDE (01) */}
    <span className="text-xs font-bold text-slate-600">0{n}</span>

  </div>

</div>
        ))}
      </div>

      {/* Step 1 — Download */}
      <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/60">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400 border border-cyan-500/30 flex-shrink-0">1</span>
          <div>
            <p className="text-sm font-semibold text-slate-200">Download Template</p>
            <p className="text-xs text-slate-400">Filter which products to include</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Search Products">
              <input type="text" className={inputCls} placeholder="Name or SKU"
                value={templateFilters.searchTerm}
                onChange={e => setTemplateFilters(f => ({ ...f, searchTerm: e.target.value }))} />
            </Field>
            <Field label="Published Status">
              <SelectInput value={templateFilters.isPublished} onChange={v => setTemplateFilters(f => ({ ...f, isPublished: v }))}>
                <option value="">All</option>
                <option value="true">Published</option>
                <option value="false">Unpublished</option>
              </SelectInput>
            </Field>
            <Field label="Stock Status">
              <SelectInput value={templateFilters.stockStatus} onChange={v => setTemplateFilters(f => ({ ...f, stockStatus: v }))}>
                <option value="">All</option>
                <option value="InStock">In Stock</option>
                <option value="LowStock">Low Stock</option>
                <option value="OutOfStock">Out of Stock</option>
              </SelectInput>
            </Field>
          </div>

          <div className="rounded-xl border border-slate-700/60 bg-slate-950/30 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/50 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Filter by Categories</p>
                <p className="text-xs text-slate-500 mt-0.5">Select one or more categories. Leave empty to include products from every category.</p>
              </div>
              <div className="flex items-center gap-3">
                {templateFilters.categoryIds.length > 0 && (
                  <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                    {templateFilters.categoryIds.length} selected
                  </span>
                )}
                <button onClick={clearCategories} className="text-xs font-medium text-slate-400 hover:text-slate-300">All categories</button>
              </div>
            </div>
            <div className="p-4">
              {categoriesLoading ? (
              <div className="flex min-h-24 items-center gap-2 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading categories
              </div>
            ) : categoriesError ? (
              <p className="text-xs text-amber-400">{categoriesError}</p>
            ) : categories.length === 0 ? (
              <p className="text-xs text-slate-500">No categories found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
                {categories.map(category => {
                  const checked = templateFilters.categoryIds.includes(category.id);
                  return (
                    <label
                      key={category.id}
                      className={`flex min-h-11 items-center gap-2 cursor-pointer rounded-lg px-3 py-2 text-xs transition-colors border ${
                        checked
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-100'
                          : 'bg-slate-900/40 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                      }`}
                      title={category.path}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(category.id)}
                        className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50 focus:ring-offset-0"
                      />
                      <span className="min-w-0 flex-1 truncate font-medium leading-5">
                        {category.path}
                      </span>
                      {category.isParent && (
                        <span className="rounded-md border border-slate-600/80 bg-slate-800/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Main
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-700/60 bg-slate-950/30 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/50 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Fields to Include</p>
                <p className="text-xs text-slate-500 mt-0.5">Checked fields will appear in Excel. Leave all unchecked to export every available field.</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 font-semibold text-cyan-300">
                  {selectedFields.length || 'All'} fields
                </span>
                <button onClick={selectAllFields} className="text-cyan-400 hover:text-cyan-300 font-medium">Select all</button>
                <span className="text-slate-600">|</span>
                <button onClick={clearAllFields} className="text-slate-400 hover:text-slate-300 font-medium">All fields</button>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-2 max-h-72 overflow-y-auto">
              {EDITABLE_FIELDS.map(f => {
                const checked = selectedFields.includes(f.key);
                return (
                  <label
                    key={f.key}
                    className={`flex min-h-10 items-center gap-2 cursor-pointer rounded-lg px-3 py-2 text-xs transition-colors border ${
                      checked
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-slate-100'
                        : 'bg-slate-900/40 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleField(f.key)}
                      className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/50 focus:ring-offset-0"
                    />
                    <span className="font-medium truncate">{f.label}</span>
                  </label>
                );
              })}
              {selectedFields.length === 0 && (
                <p className="col-span-full text-xs text-cyan-300">No specific fields selected: the download will include every available field.</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleDownloadTemplate}
              disabled={templateLoading}
              className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-all"
            >
              {templateLoading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing…</>
                : <><FileDown className="h-4 w-4" /> Download Template</>
              }
            </button>
            {templateDone && !templateLoading && (
              <span className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                <CheckCircle className="h-4 w-4" /> Template downloaded
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Step 3 — Upload */}
      <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/60">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400 border border-emerald-500/30 flex-shrink-0">3</span>
          <div>
            <p className="text-sm font-semibold text-slate-200">Upload &amp; Apply Changes</p>
            <p className="text-xs text-slate-400">Upload the edited template to update products</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <label
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-all py-10
              ${dragging
                ? 'border-cyan-500/60 bg-cyan-500/10'
                : uploadFile
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-slate-600 hover:border-cyan-500/50 hover:bg-slate-800/60'
              }`}
          >
            {uploadFile ? (
              <>
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-emerald-300">{uploadFile.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{(uploadFile.size / 1024).toFixed(0)} KB · click to change</p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-slate-700/60 border border-slate-600">
                  <UploadCloud className="h-6 w-6 text-slate-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-300">Drop your file here, or <span className="text-cyan-400 font-medium">browse</span></p>
                  <p className="text-xs text-slate-500 mt-0.5">.xlsx files only</p>
                </div>
              </>
            )}
            <input type="file" accept=".xlsx" className="sr-only"
              onChange={e => { setUploadFile(e.target.files?.[0] || null); setResult(null); setUploadError(''); }} />
          </label>

          {uploadFile && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:from-emerald-500 hover:to-green-500 disabled:opacity-50 transition-all"
            >
              {uploading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating products…</>
                : <><UploadCloud className="h-4 w-4" /> Upload &amp; Apply Changes</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {uploadError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
          <div className="text-sm">
            <p className="font-semibold text-red-300">Upload failed</p>
            <p className="text-red-400 mt-0.5">{uploadError}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-700/60">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <p className="text-sm font-semibold text-slate-200">Update Complete</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Total Rows',        value: result.totalRows,       grad: 'from-slate-800 to-slate-700',     text: 'text-slate-200' },
                { label: 'Products Updated',  value: result.productsUpdated, grad: 'from-emerald-900/60 to-green-900/40',   text: 'text-emerald-300' },
                { label: 'Variants Updated',  value: result.variantsUpdated, grad: 'from-cyan-900/60 to-blue-900/40',       text: 'text-cyan-300' },
                { label: 'Skipped',           value: result.skipped,         grad: 'from-amber-900/60 to-yellow-900/40',   text: 'text-amber-300' },
                { label: 'Failed',            value: result.failed,          grad: 'from-red-900/60 to-rose-900/40',       text: 'text-red-300' },
              ].map(({ label, value, grad, text }) => (
                <div key={label} className={`rounded-xl p-4 text-center bg-gradient-to-br ${grad} border border-slate-700/40`}>
                  <p className={`text-2xl font-bold ${text}`}>{value}</p>
                  <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 max-h-40 overflow-y-auto">
                <p className="text-xs font-semibold text-red-300 mb-2">Errors ({result.errors.length})</p>
                {result.errors.map((e, i) => <p key={i} className="text-xs text-red-400">{e}</p>)}
              </div>
            )}
            {result.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 max-h-40 overflow-y-auto">
                <p className="text-xs font-semibold text-amber-300 mb-2">Warnings ({result.warnings.length})</p>
                {result.warnings.map((w, i) => <p key={i} className="text-xs text-amber-400">{w}</p>)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ImportExportPage() {
  const [activeTab, setActiveTab] = useState<Tab>('orders-export');

  return (
    <div>
      {/* Page header */}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
        <div>
        <div className="flex items-center gap-3 mb-1">
          <Sparkles className="h-5 w-5 text-cyan-400" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
            Import / Export
          </h1>
        </div>
        <p className="text-sm text-slate-400 ml-8">Export orders and bulk update products via Excel</p>
        </div>
      </div>

      {/* Tab selector cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-2">
        {([
          {
            id: 'orders-export' as Tab,
            icon: <ShoppingCart className="h-6 w-6" />,
            label: 'Orders Export',
            desc: 'Download filtered orders to Excel',
            grad: activeTab === 'orders-export'
              ? 'from-cyan-500/25 to-blue-500/15 border-cyan-500/50'
              : 'from-slate-800/60 to-slate-800/40 border-slate-700/50 hover:border-slate-600',
            iconGrad: 'from-cyan-500 to-blue-500',
            activeText: 'text-cyan-400',
          },
          {
            id: 'products-bulk-update' as Tab,
            icon: <Package className="h-6 w-6" />,
            label: 'Products Bulk Update',
            desc: 'Download template, edit, re-upload',
            grad: activeTab === 'products-bulk-update'
              ? 'from-violet-500/25 to-purple-500/15 border-violet-500/50'
              : 'from-slate-800/60 to-slate-800/40 border-slate-700/50 hover:border-slate-600',
            iconGrad: 'from-violet-500 to-purple-500',
            activeText: 'text-violet-400',
          },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-4 rounded-xl border bg-gradient-to-br ${tab.grad} p-4 text-left transition-all`}
          >
            <div className={`flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br ${tab.iconGrad} shadow-lg flex-shrink-0`}>
              <span className="text-white">{tab.icon}</span>
            </div>
            <div>
              <p className={`text-base font-semibold ${activeTab === tab.id ? tab.activeText : 'text-slate-200'}`}>
                {tab.label}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{tab.desc}</p>
            </div>
            {activeTab === tab.id && (
              <span className={`absolute top-3 right-3 h-2 w-2 rounded-full ${tab.id === 'orders-export' ? 'bg-cyan-400' : 'bg-violet-400'} shadow-lg`} />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'orders-export'        && <OrdersExportTab />}
      {activeTab === 'products-bulk-update' && <ProductsBulkUpdateTab />}
    </div>
  );
}
