"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  RefreshCw,
  Pill,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/app/admin/_components/CustomToast";
import { productsService } from "@/lib/services";
import { formatDate, getProductImage } from "../_utils/formatUtils";

type ApprovalStatus = "Pending" | "Approved" | "Rejected";

interface PharmaProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  image: string;
  isPublished: boolean;
  pharmaApprovalStatus: string;
  pharmaApprovedAt?: string | null;
  pharmaApprovedBy?: string | null;
  pharmaApprovalComment?: string | null;
  categoryName: string;
  brandName: string;
  createdAt: string;
}

export default function PharmaReviewPage() {
  const toast = useToast();

  const [products, setProducts] = useState<PharmaProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "all">("Pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;

  const [modal, setModal] = useState<{
    mode: "approve" | "reject";
    productId: string;
    productName: string;
  } | null>(null);
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        pageSize,
        isPharmaProduct: true,
        sortBy: "createdAt",
        sortDirection: "desc",
      };
      if (statusFilter !== "all") params.pharmaApprovalStatus = statusFilter;

      const response = await productsService.getAll(params);
      if (response.data?.success && response.data?.data?.items) {
        const { items, totalCount: tc, totalPages: tp } = response.data.data;
        setTotalCount(tc);
        setTotalPages(tp);
        setProducts(
          items.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug || "",
            sku: p.sku || "",
            image: getProductImage(p.images),
            isPublished: p.isPublished === true,
            pharmaApprovalStatus: p.pharmaApprovalStatus || "NotRequired",
            pharmaApprovedAt: p.pharmaApprovedAt || null,
            pharmaApprovedBy: p.pharmaApprovedBy || null,
            pharmaApprovalComment: p.pharmaApprovalComment || null,
            categoryName: p.categories?.[0]?.categoryName || "Uncategorized",
            brandName: p.brandName || "—",
            createdAt: formatDate(p.createdAt),
          }))
        );
      } else {
        setProducts([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch {
      toast.error("Failed to load pharma products");
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleReview = async () => {
    if (!modal) return;
    setProcessing(true);
    try {
      const response =
        modal.mode === "approve"
          ? await productsService.pharmaApprove(modal.productId, comment)
          : await productsService.pharmaReject(modal.productId, comment);

      if (response.data?.success) {
        const result = response.data.data;
        setProducts((prev) =>
          prev.map((p) =>
            p.id === modal.productId
              ? {
                  ...p,
                  pharmaApprovalStatus: result?.pharmaApprovalStatus ?? p.pharmaApprovalStatus,
                  pharmaApprovedAt: result?.pharmaApprovedAt ?? p.pharmaApprovedAt,
                  pharmaApprovedBy: result?.pharmaApprovedBy ?? p.pharmaApprovedBy,
                  pharmaApprovalComment: result?.pharmaApprovalComment ?? null,
                  isPublished: result?.isPublished ?? p.isPublished,
                }
              : p
          )
        );
        toast.success(
          modal.mode === "approve"
            ? `"${modal.productName}" approved`
            : `"${modal.productName}" rejected and unpublished`
        );
        setModal(null);
        setComment("");
      } else {
        toast.error(response.data?.message || "Action failed");
      }
    } catch {
      toast.error("Failed to process review");
    } finally {
      setProcessing(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      Pending: { label: "Pending", cls: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
      Approved: { label: "Approved", cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
      Rejected: { label: "Rejected", cls: "bg-red-500/15 text-red-400 border border-red-500/30" },
      NotRequired: { label: "N/A", cls: "bg-slate-600/20 text-slate-500 border border-slate-700" },
    };
    const s = map[status] || map.NotRequired;
    return (
      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Pharma Product Review</h1>
            <p className="text-slate-400 text-xs">Review and approve pharmacy products before they go live</p>
          </div>
        </div>
        <button
          onClick={fetchProducts}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* FILTER TABS */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "Pending", "Approved", "Rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              statusFilter === s
                ? s === "Pending"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : s === "Approved"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : s === "Rejected"
                  ? "bg-red-500/20 text-red-300 border-red-500/40"
                  : "bg-violet-500/20 text-violet-300 border-violet-500/40"
                : "bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-500"
            }`}
          >
            {s === "all" ? "All Pharma" : s}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500 self-center">{totalCount} product{totalCount !== 1 ? "s" : ""}</span>
      </div>

      {/* TABLE */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ShieldCheck className="h-10 w-10 text-slate-600" />
            <p className="text-slate-400 text-sm">No pharma products found</p>
            {statusFilter === "Pending" && (
              <p className="text-slate-500 text-xs">All pending products have been reviewed</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/30">
                  <th className="py-3 px-3 text-left text-xs text-slate-400 font-medium">Product</th>
                  <th className="py-3 px-3 text-center text-xs text-slate-400 font-medium">Status</th>
                  <th className="py-3 px-3 text-center text-xs text-slate-400 font-medium">Published</th>
                  <th className="py-3 px-3 text-left text-xs text-slate-400 font-medium">Review Info</th>
                  <th className="py-3 px-3 text-center text-xs text-slate-400 font-medium">Added</th>
                  <th className="py-3 px-3 text-center text-xs text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-800/20 transition-all">
                    {/* PRODUCT */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-slate-800 flex-shrink-0 overflow-hidden">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-500">
                              <Pill className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-xs font-medium truncate max-w-[200px]" title={product.name}>
                            {product.name}
                          </p>
                          <p className="text-slate-500 text-[10px]">{product.sku} · {product.brandName}</p>
                        </div>
                      </div>
                    </td>

                    {/* APPROVAL STATUS */}
                    <td className="py-2.5 px-3 text-center">
                      {statusBadge(product.pharmaApprovalStatus)}
                    </td>

                    {/* PUBLISHED */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                        product.isPublished
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-slate-600/20 text-slate-500"
                      }`}>
                        {product.isPublished ? "Published" : "Unpublished"}
                      </span>
                    </td>

                    {/* REVIEW INFO */}
                    <td className="py-2.5 px-3">
                      {product.pharmaApprovedBy ? (
                        <div className="text-xs text-slate-400">
                          <p className="text-slate-300 truncate max-w-[160px]">{product.pharmaApprovedBy}</p>
                          {product.pharmaApprovedAt && (
                            <p className="text-slate-500 text-[10px]">{formatDate(product.pharmaApprovedAt)}</p>
                          )}
                          {product.pharmaApprovalComment && (
                            <p className="text-slate-500 text-[10px] italic truncate max-w-[160px]" title={product.pharmaApprovalComment}>
                              "{product.pharmaApprovalComment}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs italic">—</span>
                      )}
                    </td>

                    {/* ADDED */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-slate-400 text-xs">{product.createdAt}</span>
                    </td>

                    {/* ACTIONS */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/product/${product.slug}`} target="_blank">
                          <button className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all" title="View product">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </Link>

                        {(product.pharmaApprovalStatus === "Pending" || (product.isPublished && product.pharmaApprovalStatus === "NotRequired")) && (
                          <>
                            <button
                              onClick={() => { setComment(""); setModal({ mode: "approve", productId: product.id, productName: product.name }); }}
                              className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                              title="Approve"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { setComment(""); setModal({ mode: "reject", productId: product.id, productName: product.name }); }}
                              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Reject"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}

                        {product.pharmaApprovalStatus === "Rejected" && (
                          <button
                            onClick={() => { setComment(""); setModal({ mode: "approve", productId: product.id, productName: product.name }); }}
                            className="p-1.5 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all"
                            title="Re-approve"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Page {currentPage} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg disabled:opacity-40">
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg disabled:opacity-40">
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW MODAL */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-xl ${modal.mode === "approve" ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
                {modal.mode === "approve"
                  ? <CheckCircle className="h-5 w-5 text-emerald-400" />
                  : <XCircle className="h-5 w-5 text-red-400" />}
              </div>
              <div>
                <h3 className="text-white font-semibold text-base">
                  {modal.mode === "approve" ? "Approve Product" : "Reject Product"}
                </h3>
                <p className="text-slate-400 text-xs mt-0.5 truncate max-w-[280px]">{modal.productName}</p>
              </div>
            </div>

            {modal.mode === "reject" && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-300 text-xs">This product will be unpublished and hidden from customers.</p>
              </div>
            )}

            <div className="mb-5">
              <label className="block text-slate-300 text-xs font-medium mb-1.5">
                {modal.mode === "approve" ? "Approval comment (optional)" : "Rejection reason (optional)"}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  modal.mode === "approve"
                    ? "e.g. Reviewed — meets all safety standards"
                    : "e.g. Missing active ingredients documentation"
                }
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setModal(null); setComment(""); }}
                disabled={processing}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={processing}
                className={`flex-1 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                  modal.mode === "approve"
                    ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500"
                    : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500"
                }`}
              >
                {processing && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {modal.mode === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
