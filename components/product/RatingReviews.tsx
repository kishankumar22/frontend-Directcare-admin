"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/toast/CustomToast";
import { timeFromNow } from "@/lib/date";

import { Filter, ChevronDown, CheckCircle2  } from "lucide-react";

interface RatingReviewsProps {
  productId: string;
  allowCustomerReviews: boolean;
  highlightReviewId?: string | null; // 🔥 ADD
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
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: string;
  replies: ReviewReply[];
  imageUrls?: string[];
videoUrls?: string[];

}

export default function RatingReviews({ productId, allowCustomerReviews,highlightReviewId }: RatingReviewsProps) {
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

// upload loading
const [uploadingImages, setUploadingImages] = useState(false);
const [uploadingVideos, setUploadingVideos] = useState(false);
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
      "https://testapi.knowledgemarkg.com/api/ProductReviews/upload-images",
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
      "https://testapi.knowledgemarkg.com/api/ProductReviews/upload-videos",
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
  if (!highlightReviewId) return;

  const el = document.getElementById(`review-${highlightReviewId}`);
  if (!el) return;

  el.scrollIntoView({ behavior: "instant", block: "start" });

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
}, [highlightReviewId]);
useEffect(() => {
  const raw = sessionStorage.getItem("pendingReviewDraft");
  if (!raw) return;

  try {
    const data = JSON.parse(raw);

    // 🔒 safety: wrong product ka draft ignore
    if (data.productId !== productId) return;

    setRating(data.rating ?? 0);
    setTitle(data.title ?? "");
    setComment(data.comment ?? "");

    // cleanup so it doesn't re-apply
    sessionStorage.removeItem("pendingReviewDraft");

    // auto scroll to review form
    setTimeout(() => {
      const el = document.getElementById("reviews-section");
      el?.scrollIntoView({ behavior: "instant" });
    }, 300);
  } catch {
    sessionStorage.removeItem("pendingReviewDraft");
  }
}, [productId]);

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

  const { isAuthenticated, accessToken } = useAuth();
  const toast = useToast();

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(
        `https://testapi.knowledgemarkg.com/api/ProductReviews/product/${productId}`
      );
      const json = await res.json();
      setReviews(json?.data ?? []);
    } catch (err) {
      console.log("Fetch reviews error:", err);
    }
  }, [productId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

const handleSubmitReview = async () => {
 if (!isAuthenticated) {
  // 🔥 SAVE TEXT-ONLY DRAFT
  sessionStorage.setItem(
    "pendingReviewDraft",
    JSON.stringify({
      productId,
      productSlug: window.location.pathname.split("/products/")[1],
      rating,
      title,
      comment,
    })
  );

  toast.info("Please login to submit your review");

  // 🔁 redirect to login with return hint
  window.location.href = `/account?from=review&productId=${productId}`;
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
      "https://testapi.knowledgemarkg.com/api/ProductReviews",
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
    sessionStorage.removeItem("pendingReviewDraft");

    setImageFiles([]);
    setVideoFiles([]);
    setImageUrls([]);
    setVideoUrls([]);

    fetchReviews();
  } catch (e: any) {
    toast.error(e.message || "Something went wrong");
  } finally {
    setLoading(false);
  }
};
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

const resolveMediaUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url}`;
};


  const handleHelpful = (id: string) => console.log("Future helpful clicked for", id);
  const handleNotHelpful = (id: string) => console.log("Future not helpful clicked for", id);

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


  return (
     <>
   <section id="reviews-section" className="mt-12 bg-white p-8 rounded-2xl shadow-lg border border-gray-200 overflow-x-hidden w-full">
      <h2 className="text-3xl font-bold mb-6 text-gray-900">Ratings & Reviews</h2>


      {/* FILTER PANEL */}
     <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-4 mb-8 p-4 bg-gray-50 rounded-xl border w-full overflow-x-hidden">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <Filter className="h-5 w-5" /> Filter Reviews
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              onClick={() => setFilterRating(filterRating === s ? null : s)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition ${
                filterRating === s ? "bg-[#445D41] text-white" : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {s} ★
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="border rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          <option value="recent">Most Recent</option>
          <option value="high">Highest Rated</option>
          <option value="low">Lowest Rated</option>
        </select>

        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={showVerifiedOnly}
            onChange={() => setShowVerifiedOnly(!showVerifiedOnly)}
          />
          Verified purchase only
        </label>
      </div>

      {/* WRITE REVIEW FORM */}
      {allowCustomerReviews && (
        <div className="mb-10 p-6 border rounded-xl bg-gray-50 shadow-sm">
          <h3 className="font-semibold text-xl mb-4 text-gray-900">Write a Review</h3>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium">Your Rating:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  className={`cursor-pointer text-3xl transition ${
                    rating >= s ? "text-yellow-500 scale-110" : "text-gray-300"
                  }`}
                  onClick={() => setRating(s)}
                >
                  ★
                </span>
              ))}
            </div>
          </div>


          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Review title"
            className="w-full border rounded-lg p-3 text-sm mb-3 shadow-sm"
          />

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder="Share your experience..."
            className="w-full border rounded-lg p-3 text-sm shadow-sm"
          />
{/* IMAGE UPLOAD */}
<div className="mt-4">
  <label className="text-sm font-medium">Upload Images</label>
  <input
    type="file"
    accept="image/*"
    multiple
    onChange={(e) => handleImageSelect(e.target.files)}
    className="mt-1 block w-full text-sm"
  />
</div>
{imagePreviews.length > 0 && (
  <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2">
   {imagePreviews.map((src, i) => (
  <div key={`preview-image-${i}`} className="relative">

        <img
          src={src}
          alt="Preview"
          className="h-20 w-full object-cover rounded-lg border"
        />
        <button
          type="button"
          onClick={() =>
            setImageFiles((prev) => prev.filter((_, idx) => idx !== i))
          }
          className="absolute -top-2 -right-2 bg-black text-white text-xs rounded-full h-5 w-5"
        >
          ✕
        </button>
      </div>
    ))}
  </div>
)}

{/* VIDEO UPLOAD */}
<div className="mt-4">
  <label className="text-sm font-medium">Upload Video</label>
  <input
    type="file"
    accept="video/*"
    onChange={(e) => handleVideoSelect(e.target.files)}
    className="mt-1 block w-full text-sm"
  />
</div>
{videoPreviews.length > 0 && (
  <div className="mt-3">
    {videoPreviews.map((src, i) => (
  <div key={`preview-video-${i}`} className="relative w-40">

        <video
          src={src}
          muted
          preload="metadata"
          className="rounded-lg border"
        />
        <button
          type="button"
          onClick={() => setVideoFiles([])}
          className="absolute -top-2 -right-2 bg-black text-white text-xs rounded-full h-5 w-5"
        >
          ✕
        </button>
      </div>
    ))}
  </div>
)}
          <Button
            onClick={handleSubmitReview}
            disabled={rating === 0 || comment.trim().length < 5 || loading}
            className="mt-4 w-full bg-[#445D41] hover:bg-black text-white rounded-lg py-3 font-medium text-sm"
          >
            {loading ? "Submitting..." : "Submit Review"}
          </Button>
        </div>
      )}

      {/* REVIEWS LIST */}
      <h3 className="text-xl font-semibold mb-4 text-gray-900">Customer Reviews</h3>

      {filteredReviews.length === 0 ? (
        <p className="text-gray-500 italic">No reviews matching filters.</p>
      ) : (
       <div id="reviews-list" className="space-y-6 scroll-mt-24">
         {filteredReviews.map((r) => (
  <div
    key={r.id}
    id={`review-${r.id}`}   // 🔥 IMPORTANT
    className="p-5 rounded-xl border bg-white shadow-sm scroll-mt-24"
  >
             <div className="flex flex-wrap items-center gap-2 w-full">
                <div className="flex flex-wrap gap-1 text-yellow-500">
                  {"★".repeat(r.rating)}{" "}
                  <span className="text-gray-400 text-lg">{"☆".repeat(5 - r.rating)}</span>
                </div>

                <span className="text-sm font-medium">{r.customerName}</span>

                {r.isVerifiedPurchase && (
                  <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" /> Verified Purchase
                  </span>
                )}
              </div>

              <p className="font-semibold mt-2 text-gray-900">{r.title}</p>
              <p className="text-sm text-gray-700 mt-1">{r.comment}</p>
{((r.imageUrls?.length ?? 0) > 0 ||
  (r.videoUrls?.length ?? 0) > 0) && (
 <div
    className="mt-2 grid gap-1"
    style={{
      gridTemplateColumns: "repeat(auto-fit, minmax(64px, max-content))",
    }}
  >
    {r.imageUrls?.map((url, i) => (
      <div
        key={`${r.id}-img-${i}`}
        onClick={() =>
          setActiveMedia({ type: "image", url: resolveMediaUrl(url) })
        }
        className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-md border overflow-hidden cursor-pointer bg-black"
      >
        <img
          src={resolveMediaUrl(url)}
          alt="Review image"
          className="w-full h-full object-contain bg-gray-50"
        />
      </div>
    ))}

    {r.videoUrls?.map((url, i) => (
      <div
        key={`${r.id}-vid-${i}`}
        onClick={() =>
          setActiveMedia({ type: "video", url: resolveMediaUrl(url) })
        }
        className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-md border overflow-hidden cursor-pointer bg-black relative"
      >
        <video
          src={resolveMediaUrl(url)}
          muted
          preload="metadata"
          className="w-full h-full object-contain"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <span className="text-white text-xs">▶</span>
        </div>
      </div>
    ))}
  </div>
)}


           <p className="text-xs text-gray-400 mt-2">
  {timeFromNow(r.createdAt)}
</p>


            <div className="flex flex-wrap gap-3 mt-3 text-sm font-medium w-full">
                <button onClick={() => handleHelpful(r.id)} className="text-gray-600 hover:text-green-700">
                  👍 Helpful ({r.helpfulCount})
                </button>
                <button onClick={() => handleNotHelpful(r.id)} className="text-gray-600 hover:text-red-700">
                  👎 Not Helpful ({r.notHelpfulCount})
                </button>
              </div>

              {r.replies && r.replies.length > 0 && (
                <div className="mt-4 pl-4 border-l-2 border-gray-200">
                 {r.replies.map((reply) => (
  <div key={reply.id} className="bg-gray-50 rounded-lg p-3 mt-2 text-sm">

                      <p className="text-gray-800">{reply.comment}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        — {reply.createdByName} •{" "}
                        {timeFromNow(reply.createdAt)}

                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
       </section>

    {/* 🔥 REVIEW IMAGE / VIDEO MODAL */}
    {activeMedia && (
      <div
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4"
        onClick={() => setActiveMedia(null)}
      >
        <div
          className="relative max-w-4xl w-full bg-black rounded-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* CLOSE BUTTON */}
          <button
            onClick={() => setActiveMedia(null)}
            className="absolute top-3 right-3 z-10 bg-black/70 text-white rounded-full h-8 w-8 flex items-center justify-center"
          >
            ✕
          </button>

          {/* IMAGE */}
          {activeMedia.type === "image" && (
            <img
              src={activeMedia.url}
              alt="Review full"
              className="w-full max-h-[80vh] object-contain bg-gray-100"
            />
          )}

          {/* VIDEO */}
          {activeMedia.type === "video" && (
            <video
              src={activeMedia.url}
              controls
              autoPlay
              className="w-full max-h-[80vh] bg-gray-100"
            />
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

