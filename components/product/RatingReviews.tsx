"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/toast/CustomToast";
import { timeFromNow } from "@/lib/date";
import Image from "next/image";
import { Filter, ChevronDown, CheckCircle2, UploadCloud, MessageSquare, MessageSquarePlus, Edit3, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

// 🔹 SWIPER
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';


interface RatingReviewsProps {
  productId: string;
  allowCustomerReviews: boolean;
  highlightReviewId?: string | null; // 🔥 ADD
  // Selected variant SKU (variant products) and the product's own SKU. Reviews are filtered
  // to the active SKU + general (no-SKU) reviews so each variant shows only its own reviews.
  variantSku?: string | null;
  productSku?: string | null;
}

interface ReviewReply {
  id: string;
  reviewId: string;
  comment: string;
  isAdminReply: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface Review {
  id: string;
  customerName: string;
  title: string;
  comment: string;
  rating: number;
  isApproved: boolean; // 🔥 ADD THIS
  isVerifiedPurchase: boolean;

  createdAt: string;
  replies: ReviewReply[];
  imageUrls?: string[];
  videoUrls?: string[];

}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

export default function RatingReviews({ productId, allowCustomerReviews, highlightReviewId, variantSku, productSku }: RatingReviewsProps) {
  // Active SKU used to filter reviews: selected variant's SKU, else the product's own SKU.
  const activeSku = (variantSku && variantSku.trim()) || (productSku && productSku.trim()) || "";
  const router = useRouter();
  const [swiperInstance, setSwiperInstance] = useState<any>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const recentReviews = useMemo(() => {
    return reviews
      .filter((r) => r.isApproved === true) // 🔥 ADD
      .filter((r) => r.comment?.trim().length > 0)
      .slice(0, 3);
  }, [reviews]);


  const [rating, setRating] = useState<number>(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState({
    title: "",
    comment: "",
  });
  const [loading, setLoading] = useState(false);
  // file selection
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [activeMedia, setActiveMedia] = useState<{
    type: "image" | "video";
    url: string;
  } | null>(null);

  // uploaded urls
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);

  // modal state for compact 'Write a Review' UX
  const [showReviewModal, setShowReviewModal] = useState(false);

  // upload loading
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const { isAuthenticated, accessToken } = useAuth();
  const toast = useToast();
  const handleImageSelect = (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files);

    if (selected.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }

    setImageFiles(selected);
  };

  const handleVideoSelect = (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files);

    if (selected.length > 1) {
      toast.error("Only 1 video allowed");
      return;
    }

    setVideoFiles(selected);
  };
  const uploadReviewImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return [];

    try {
      setUploadingImages(true);

      const formData = new FormData();
      imageFiles.forEach((file) => formData.append("images", file));

      const res = await fetch(
        `${API_BASE_URL}/api/ProductReviews/upload-images`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json?.message || "Image upload failed");
      }

      setImageUrls(json.data);
      return json.data;
    } finally {
      setUploadingImages(false);
    }
  };
  const uploadReviewVideos = async (): Promise<string[]> => {
    if (videoFiles.length === 0) return [];

    try {
      setUploadingVideos(true);

      const formData = new FormData();
      videoFiles.forEach((file) => formData.append("videos", file));

      const res = await fetch(
        `${API_BASE_URL}/api/ProductReviews/upload-videos`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json?.message || "Video upload failed");
      }

      setVideoUrls(json.data);
      return json.data;
    } finally {
      setUploadingVideos(false);
    }
  };
  const imagePreviews = useMemo(
    () => imageFiles.map((file) => URL.createObjectURL(file)),
    [imageFiles]
  );

  const videoPreviews = useMemo(
    () => videoFiles.map((file) => URL.createObjectURL(file)),
    [videoFiles]
  );
  useEffect(() => {
    if (!isAuthenticated) return;
    const raw = sessionStorage.getItem("pendingReview");
    if (!raw) return;

    try {
      const data = JSON.parse(raw);

      // 🔒 safety: wrong product ka draft ignore
      if (data.productId !== productId) return;

      const reviewData = data?.reviewData ?? {};
      setRating(reviewData.rating ?? 0);
      setTitle(reviewData.title ?? "");
      setComment(reviewData.comment ?? "");

      // cleanup so it doesn't re-apply
      sessionStorage.removeItem("pendingReview");

      // restore only (no auto submit)
    } catch {
      sessionStorage.removeItem("pendingReview");
    }
  }, [isAuthenticated, productId]);

  // cleanup (IMPORTANT)
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      videoPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews, videoPreviews]);

  // Filter UI states
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "high" | "low">("recent");
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);

  const validateField = (field: "title" | "comment", value: string) => {
    setErrors((prev) => ({
      ...prev,
      [field]:
        value.trim().length < 5
          ? `${field === "title" ? "Title" : "Comment"} must be at least 5 characters`
          : "",
    }));
  };
  const fetchReviews = useCallback(async () => {
    try {
      const skuParam = activeSku ? `?sku=${encodeURIComponent(activeSku)}` : "";
      const res = await fetch(
        `${API_BASE_URL}/api/ProductReviews/product/${productId}${skuParam}`, {
        next: { revalidate: 60 },
      });

      const json = await res.json();
      setReviews(json?.data ?? []);
    } catch (err) {
      console.log("Fetch reviews error:", err);
    }
  }, [productId, activeSku]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmitReview = async () => {

    if (!isAuthenticated) {
      // 🔥 SAVE TEXT-ONLY DRAFT
      sessionStorage.setItem(
        "pendingReview",
        JSON.stringify({
          productId,
          reviewData: {
            rating,
            title,
            comment,
          },
        })
      );

      toast.info("Please login to submit your review");

      // 🔁 redirect to login with return hint
      router.push(
        `/account/login?redirect=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }

    try {
      setLoading(true);

      // 1️⃣ upload media first
      const [uploadedImages, uploadedVideos] = await Promise.all([
        uploadReviewImages(),
        uploadReviewVideos(),
      ]);

      // 2️⃣ submit review
      const res = await fetch(
        `${API_BASE_URL}/api/ProductReviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            productId,
            title,
            comment,
            rating,
            imageUrls: uploadedImages,
            videoUrls: uploadedVideos,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.message || "Failed to submit review");
        return;
      }

      toast.success("Review submitted! Pending admin approval.");

      // reset
      setRating(0);
      setTitle("");
      setComment("");
      sessionStorage.removeItem("pendingReview");

      setImageFiles([]);
      setVideoFiles([]);
      setImageUrls([]);
      setVideoUrls([]);

      fetchReviews();
      // close modal after successful submit (compact UX)
      setShowReviewModal(false);
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };
  const resolveMediaUrl = useCallback((url: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    const base = process.env.NEXT_PUBLIC_API_URL || "";
    return `${base}${url}`.replace(/([^:]\/)\/+/g, "$1");
  }, []);

  // FILTERED DATA (no logic changed, only UI view manipulation)
  const filteredReviews = useMemo(() => {
    return reviews
      .filter((r) => r.isApproved === true) // 🔥 ONLY APPROVED
      .filter((r) => r.rating > 0 && r.comment.trim().length > 0)
      .filter((r) => (filterRating ? r.rating === filterRating : true))
      .filter((r) => (showVerifiedOnly ? r.isVerifiedPurchase : true))
      .sort((a, b) => {
        if (sortBy === "recent")
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === "high") return b.rating - a.rating;
        return a.rating - b.rating;
      });
  }, [reviews, filterRating, sortBy, showVerifiedOnly]);

  useEffect(() => {
    if (!highlightReviewId) return;

    // 1️⃣ Scroll Swiper to the correct slide
    if (swiperInstance) {
      const index = filteredReviews.findIndex((r) => r.id === highlightReviewId);
      if (index !== -1) {
        swiperInstance.slideTo(index);
      }
    }
    // 2️⃣ Scroll page to the element
    const el = document.getElementById(`review-${highlightReviewId}`);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });

    el.classList.add(
      "ring-2",
      "ring-[#445D41]",
      "bg-green-50"
    );

    const timeout = setTimeout(() => {
      el.classList.remove(
        "ring-2",
        "ring-[#445D41]",
        "bg-green-50"
      );
    }, 2500);

    return () => clearTimeout(timeout);
  }, [highlightReviewId, swiperInstance, filteredReviews]);

  return (
    <>
      <section id="reviews-section" className="mt-4 md:mt-10 bg-white p-4 md:p-4 rounded-xl shadow-md border border-gray-200 overflow-x-hidden w-full">
<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

  <div className="min-w-0">
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#101828] leading-none">
        Ratings & Reviews
      </h2>

      <div className="hidden md:flex items-center rounded-full border border-[#EAECF0] bg-[#F8F9FB] px-2.5 py-1 text-[11px] font-medium text-[#475467]">
        Customer Feedback
      </div>
    </div>

    <p className="mt-1 text-xs sm:text-sm text-[#667085] leading-relaxed">
      Share your feedback with others.
    </p>
  </div>

  {allowCustomerReviews && (
    <Button
      onClick={() => setShowReviewModal(true)}
      className="h-10 rounded-full bg-[#445D41] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#364B34] whitespace-nowrap"
    >
      <MessageSquarePlus className="mr-2 h-4 w-4" />
      Write a Review
    </Button>
  )}
</div>
      
{/* FILTER PANEL */}
{reviews.length > 0 && (
  <div className="mb-4 rounded-2xl border border-[#EAECF0] bg-[#F9FAFB] p-2">

    {/* DESKTOP */}
    <div className="hidden md:flex items-center justify-between gap-4">

      {/* LEFT */}
      <div className="flex items-center gap-4">

        <div className="flex items-center gap-2 text-sm font-semibold text-[#344054]">
          <Filter className="h-4 w-4" />
          Filter
        </div>

        <div className="flex items-center gap-2">
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              onClick={() =>
                setFilterRating(filterRating === s ? null : s)
              }
              className={`min-w-[42px] rounded-xl border px-2.5 py-1 text-xs font-semibold transition ${
                filterRating === s
                  ? "border-[#445D41] bg-[#445D41] text-white"
                  : "border-[#D0D5DD] bg-white text-[#475467] hover:border-[#445D41]"
              }`}
            >
              {s} ★
            </button>
          ))}
        </div>

        {(filterRating !== null || showVerifiedOnly || sortBy !== "recent") && (
          <button
            onClick={() => {
              setFilterRating(null);
              setShowVerifiedOnly(false);
              setSortBy("recent");
            }}
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-3">

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="h-8 rounded-xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#101828] outline-none transition focus:border-[#445D41]"
        >
          <option value="recent">Most Recent</option>
          <option value="high">Highest Rated</option>
          <option value="low">Lowest Rated</option>
        </select>

        <label className="flex h-8 items-center gap-2 rounded-xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#344054] whitespace-nowrap">
          <input
            type="checkbox"
            checked={showVerifiedOnly}
            onChange={() =>
              setShowVerifiedOnly(!showVerifiedOnly)
            }
            className="h-4 w-4 accent-[#445D41]"
          />
          Verified only
        </label>
      </div>
    </div>

    {/* MOBILE */}
    <div className="flex flex-col gap-3 md:hidden">

      {/* ROW 1 */}
      <div className="flex items-center justify-between gap-3">

        <div className="flex items-center gap-2 text-sm font-semibold text-[#344054] whitespace-nowrap">
          <Filter className="h-4 w-4" />
          Filter
        </div>

        <div className="flex flex-wrap justify-end gap-1.5">
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              onClick={() =>
                setFilterRating(filterRating === s ? null : s)
              }
              className={`min-w-[40px] rounded-xl border px-2 py-1.5 text-xs font-semibold transition ${
                filterRating === s
                  ? "border-[#445D41] bg-[#445D41] text-white"
                  : "border-[#D0D5DD] bg-white text-[#475467]"
              }`}
            >
              {s} ★
            </button>
          ))}
        </div>
      </div>

      {/* ROW 2 */}
      <div className="flex items-center justify-between gap-3">

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="h-10 min-w-[160px] flex-1 rounded-xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#101828] outline-none"
        >
          <option value="recent">Most Recent</option>
          <option value="high">Highest Rated</option>
          <option value="low">Lowest Rated</option>
        </select>

        <label className="flex h-10 items-center gap-2 rounded-xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#344054] whitespace-nowrap">
          <input
            type="checkbox"
            checked={showVerifiedOnly}
            onChange={() =>
              setShowVerifiedOnly(!showVerifiedOnly)
            }
            className="h-4 w-4 accent-[#445D41]"
          />
          Verified only
        </label>
      </div>

      {/* ROW 3 */}
      {(filterRating !== null || showVerifiedOnly || sortBy !== "recent") && (
        <button
          onClick={() => {
            setFilterRating(null);
            setShowVerifiedOnly(false);
            setSortBy("recent");
          }}
          className="h-10 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600 transition hover:bg-red-100"
        >
          Clear Filters
        </button>
      )}
    </div>
  </div>
)}


        {/* REVIEWS LIST - SWIPER UI */}
        <h3 className="text-base md:text-lg font-bold mb-4 text-gray-900 px-1">Customer Reviews</h3>

 {reviews.length === 0 ? (

  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D0D5DD] bg-[#FAFAFA] px-4 py-10 text-center">

    <MessageSquare className="mb-3 h-10 w-10 text-[#98A2B3]" />

    <h4 className="text-base font-semibold text-[#101828]">
      No reviews yet
    </h4>

    <p className="mt-1 max-w-md text-sm text-[#667085]">
      Be the first customer to share your experience.
    </p>

    {allowCustomerReviews && (
      <Button
        onClick={() => setShowReviewModal(true)}
        className="mt-5 h-10 rounded-full bg-[#445D41] px-5 text-sm font-medium text-white hover:bg-[#364B34]"
      >
        <MessageSquarePlus className="mr-2 h-4 w-4" />
        Be the First to Review
      </Button>
    )}
  </div>

) : filteredReviews.length === 0 ? (

  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D0D5DD] bg-[#FAFAFA] px-4 py-10 text-center">

    <MessageSquare className="mb-3 h-10 w-10 text-[#98A2B3]" />

    <h4 className="text-base font-semibold text-[#101828]">
      No reviews found
    </h4>

    <p className="mt-1 max-w-md text-sm text-[#667085]">
      No reviews are matching your selected filters.
    </p>

  </div>

) : (

  <div className="relative group px-4 md:px-10">
    <button
      id="prev-btn"
      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full border bg-white shadow-md hover:bg-gray-50 transition cursor-pointer disabled:opacity-0 hidden md:flex items-center justify-center border-gray-200"
    >
      <ChevronLeft className="h-5 w-5 text-gray-700" />
    </button>

    <button
      id="next-btn"
      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full border bg-white shadow-md hover:bg-gray-50 transition cursor-pointer disabled:opacity-0 hidden md:flex items-center justify-center border-gray-200"
    >
      <ChevronRight className="h-5 w-5 text-gray-700" />
    </button>

    <Swiper
      onSwiper={setSwiperInstance}
      modules={[Navigation, FreeMode]}
      navigation={{
        prevEl: '#prev-btn',
        nextEl: '#next-btn',
      }}
      spaceBetween={12}
      slidesPerView={1}
      slidesPerGroup={1}
      breakpoints={{
        640: { slidesPerView: 2, spaceBetween: 16 },
        1024: { slidesPerView: 3, spaceBetween: 16 },
        1280: { slidesPerView: 4, spaceBetween: 16 },
      }}
      className="!pb-5 h-full"
    >
      {filteredReviews.map((r) => (
        <SwiperSlide key={r.id} className="!h-auto">

          <div
            id={`review-${r.id}`}
            className="h-full p-4 md:p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
          >

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">

                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-full bg-[#445D41]/10 flex-shrink-0 flex items-center justify-center text-[#445D41] font-bold text-[10px] uppercase">
                    {r.customerName.charAt(0)}
                  </div>

                  <span className="text-xs font-bold text-gray-900 truncate">
                    {r.customerName}
                  </span>
                </div>

                {r.isVerifiedPurchase && (
                  <span className="flex-shrink-0 flex items-center gap-1 text-[8px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-100 uppercase">
                    <CheckCircle2 className="h-2 w-2" />
                    Verified
                  </span>
                )}
              </div>

              <div className="flex gap-1 text-yellow-500 text-lg mb-1">
                {"★".repeat(r.rating)}
                <span className="text-gray-200">
                  {"★".repeat(5 - r.rating)}
                </span>
              </div>

              <h4 className="font-extrabold text-sm text-gray-900 mb-1 line-clamp-1">
                {r.title}
              </h4>

              <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                {r.comment}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
              <p className="text-[10px] font-medium text-gray-400">
                {timeFromNow(r.createdAt)}
              </p>

              {r.replies && r.replies.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-[#445D41] uppercase">
                  <MessageSquare className="w-3 h-3" />
                  {r.replies.length} Reply
                </div>
              )}
            </div>

          </div>

        </SwiperSlide>
      ))}
    </Swiper>
  </div>
)}
      </section>

      {/* WRITE REVIEW MODAL (compact UX) */}
{/* WRITE REVIEW MODAL */}
{showReviewModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">

    <div
      className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-[#EAECF0] bg-white shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-[#EAECF0] px-4 py-3 md:px-5">

        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-[#101828]">
            Write a Review
            <Edit3 className="h-4 w-4 text-[#445D41]" />
          </h3>

          <p className="mt-0.5 text-xs text-[#667085]">
            Share your experience with this product
          </p>
        </div>

        <button
          onClick={() => setShowReviewModal(false)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#667085] transition hover:bg-[#F2F4F7]"
        >
          ✕
        </button>
      </div>

      {/* BODY */}
      <div className="max-h-[75vh] overflow-y-auto px-4 py-4 md:px-5">

        {/* RATING */}
        <div className="mb-4 rounded-2xl border border-[#EAECF0] bg-[#FCFCFD] p-3">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">

            <span className="text-sm font-semibold text-[#344054]">
              Your Rating
            </span>

            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  className={`text-2xl leading-none transition-all duration-200 ${
                    rating >= s
                      ? "scale-110 text-yellow-500"
                      : "text-[#D0D5DD] hover:text-yellow-400"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {rating === 0 && (
            <p className="mt-1 text-xs text-[#667085]">
              Please select a rating
            </p>
          )}
        </div>

        {/* TITLE */}
        <div className="mb-3">
          <input
            value={title}
            onChange={(e) => {
              const value = e.target.value;
              setTitle(value);
              validateField("title", value);
            }}
            placeholder="Review title*"
            className="h-11 w-full rounded-xl border border-[#D0D5DD] bg-white px-4 text-sm text-[#111827] placeholder:text-[#98A2B3] outline-none transition focus:border-[#445D41] focus:ring-4 focus:ring-[#445D41]/10"
          />

          {errors.title && (
            <p className="mt-1 text-xs text-red-500">
              {errors.title}
            </p>
          )}
        </div>

        {/* COMMENT */}
        <div>
          <textarea
            value={comment}
            onChange={(e) => {
              const value = e.target.value;
              setComment(value);
              validateField("comment", value);
            }}
            rows={4}
            placeholder="Share your experience..."
            className="w-full resize-none rounded-xl border border-[#D0D5DD] bg-white px-4 py-3 text-sm text-[#111827] placeholder:text-[#98A2B3] outline-none transition focus:border-[#445D41] focus:ring-4 focus:ring-[#445D41]/10"
          />

          {errors.comment && (
            <p className="mt-1 text-xs text-red-500">
              {errors.comment}
            </p>
          )}
        </div>

        {/* IMAGE UPLOAD */}
        <div className="mt-4">

          <p className="mb-2 text-sm font-semibold text-[#344054]">
            Upload Images (optional)
          </p>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#D0D5DD] bg-[#FAFAFA] px-4 py-3 text-sm transition hover:border-[#445D41] hover:bg-[#F6FDF7]">

            <UploadCloud className="h-4 w-4 text-[#667085]" />

            <span className="font-medium text-[#344054]">
              Add Images
            </span>

            <span className="hidden sm:block text-xs text-[#98A2B3]">
              Click to upload review images
            </span>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleImageSelect(e.target.files)}
              className="hidden"
            />
          </label>
        </div>

        {/* IMAGE PREVIEW */}
        {imagePreviews.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">

            {imagePreviews.map((src, i) => (
              <div
                key={`preview-image-modal-${i}`}
                className="relative"
              >

                <div className="h-[88px] w-[88px] overflow-hidden rounded-xl border border-[#EAECF0] bg-[#F9FAFB]">
                  <img
                    src={src}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setImageFiles((prev) =>
                      prev.filter((_, idx) => idx !== i)
                    )
                  }
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] text-white shadow"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* VIDEO */}
        <div className="mt-4">

          <p className="mb-2 text-sm font-semibold text-[#344054]">
            Upload Video (optional)
          </p>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#D0D5DD] bg-[#FAFAFA] px-4 py-3 text-sm transition hover:border-[#445D41] hover:bg-[#F6FDF7]">

            <UploadCloud className="h-4 w-4 text-[#667085]" />

            <span className="font-medium text-[#344054]">
              Upload Review Video
            </span>

            <span className="hidden sm:block text-xs text-[#98A2B3]">
              Click to upload review video
            </span>

            <input
              type="file"
              accept="video/*"
              onChange={(e) => handleVideoSelect(e.target.files)}
              className="hidden"
            />
          </label>
        </div>

        {/* VIDEO PREVIEW */}
        {videoPreviews.length > 0 && (
          <div className="mt-3">

            {videoPreviews.map((src, i) => (
              <div
                key={`preview-video-modal-${i}`}
                className="relative w-32 sm:w-36"
              >

                <div className="aspect-video overflow-hidden rounded-xl border border-[#EAECF0] bg-black">
                  <video
                    src={src}
                    muted
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setVideoFiles([])}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] text-white shadow"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* SUBMIT */}
<div
  title={
    rating === 0
      ? "Please select a rating"
      : comment.trim().length < 5
      ? "Comment must be at least 5 characters"
      : ""
  }
  className={
    rating === 0 || comment.trim().length < 5 || loading
      ? "mt-5 cursor-not-allowed"
      : "mt-5"
  }
>
  <Button
    onClick={handleSubmitReview}
    disabled={
      rating === 0 ||
      comment.trim().length < 5 ||
      loading
    }
    className="h-11 w-full rounded-xl bg-[#445D41] text-sm font-semibold text-white transition enabled:hover:bg-[#2F4330] disabled:opacity-50"
  >
    {loading ? "Submitting..." : "Submit Review"}
  </Button>
</div>
      </div>
    </div>
  </div>
)}
      {/* MEDIA MODAL */}
      {activeMedia && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4" onClick={() => setActiveMedia(null)}>
          <div className="relative max-w-4xl w-full bg-black rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setActiveMedia(null)} className="absolute top-3 right-3 z-10 bg-black/70 text-white rounded-full h-8 w-8 flex items-center justify-center">✕</button>
            {activeMedia.type === "image" ? (
              <img src={activeMedia.url} alt="Full" className="w-full max-h-[80vh] object-contain" />
            ) : (
              <video src={activeMedia.url} controls autoPlay className="w-full max-h-[80vh]" />
            )}
          </div>
        </div>
      )}
    </>
  );
}


// 🔹 PDP tooltip ke liye reusable helper
export function getRecentApprovedReviews(reviews: Review[]) {
  return reviews
    .filter((r) => r.isApproved === true)
    .filter((r) => r.comment?.trim().length > 0)
    .slice(0, 3);
}
