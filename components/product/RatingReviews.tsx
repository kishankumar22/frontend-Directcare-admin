"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/CustomToast";
import { formatDistanceToNow } from "date-fns";
import { Filter, ChevronDown, CheckCircle2  } from "lucide-react";

interface RatingReviewsProps {
  productId: string;
  allowCustomerReviews: boolean;
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

interface Review {
  id: string;
  customerName: string;
  title: string;
  comment: string;
  rating: number;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: string;
  replies: ReviewReply[];
}

export default function RatingReviews({ productId, allowCustomerReviews }: RatingReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState<number>(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  // Filter UI states
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "high" | "low">("recent");
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);

  const { isAuthenticated, accessToken } = useAuth();
  const toast = useToast();

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(
        `https://testapi.knowledgemarkg.com/api/ProductReviews/product/${productId}?includeUnapproved=true&verifiedPurchaseOnly=false`
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
      toast.error("Please login to add a review.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("https://testapi.knowledgemarkg.com/api/ProductReviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ productId, title, comment, rating }),
      });

        // 🎯 Backend error message show
    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      const message = errorData?.message || "Something went wrong";
      toast.error(message);
      setLoading(false);
      return;
    }
      toast.success("Review submitted & awaiting approval!");
      setRating(0);
      setComment("");
      setTitle("");
      fetchReviews();
    } catch {
      toast.error("Error submitting review. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleHelpful = (id: string) => console.log("Future helpful clicked for", id);
  const handleNotHelpful = (id: string) => console.log("Future not helpful clicked for", id);

  // FILTERED DATA (no logic changed, only UI view manipulation)
  const filteredReviews = useMemo(() => {
    return reviews
      .filter((r) => r.rating > 0 && r.comment.trim().length > 0)
      .filter((r) => (filterRating ? r.rating === filterRating : true))
      .filter((r) => (showVerifiedOnly ? r.isVerifiedPurchase : true))
      .sort((a, b) => {
        if (sortBy === "recent") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === "high") return b.rating - a.rating;
        return a.rating - b.rating;
      });
  }, [reviews, filterRating, sortBy, showVerifiedOnly]);

  return (
   <section className="mt-12 bg-white p-8 rounded-2xl shadow-lg border border-gray-200 overflow-x-hidden w-full">
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
        <div className="space-y-6">
          {filteredReviews.map((r) => (
            <div key={r.id} className="p-5 rounded-xl border bg-white shadow-sm w-full break-words overflow-hidden">
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

              <p className="text-xs text-gray-400 mt-2">
                {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
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
                  {r.replies.map((reply, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3 mt-2 text-sm">
                      <p className="text-gray-800">{reply.comment}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        — {reply.createdByName} •{" "}
                        {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
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
  );
}
