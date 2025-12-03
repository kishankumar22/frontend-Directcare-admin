"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";

// ✅ 1. PROPS TYPE
interface RatingReviewsProps {
  productId: string;
}

// ✅ 2. REVIEW DATA TYPE (API KE HISAB SE)
interface Review {
  id: string;
  productId: string;
  customerId: string;
  customerName: string;
  title: string;
  comment: string;
  rating: number;
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  approvedBy: string;
  approvedAt: string;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: string;
  replies: any[];
}

// ✅ 3. COMPONENT
export default function RatingReviews({ productId }: RatingReviewsProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ 4. API SE REVIEWS LOAD
  useEffect(() => {
    if (!productId) return;

    const fetchReviews = async () => {
      try {
        setLoading(true);

        const res = await axios.get(
          `https://testapi.knowledgemarkg.com/api/ProductReviews/product/${productId}?includeUnapproved=false&verifiedPurchaseOnly=false`
        );

        setReviews(res.data.data);
      } catch (error) {
        console.error("Failed to load reviews", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [productId]);

  return (
    <section className="mt-12 bg-white p-6 rounded-xl shadow-sm border">
      <h2 className="text-2xl font-bold mb-6">Ratings & Reviews</h2>

      {/* ✅ Loading */}
      {loading && <p className="text-sm text-gray-500">Loading reviews...</p>}

      {/* ✅ Reviews List */}
      {!loading && reviews.length === 0 && (
        <p className="text-sm text-gray-500">No reviews yet.</p>
      )}

      <div className="space-y-5">
        {reviews.map((r) => (
          <div key={r.id} className="border-b pb-4">
            <div className="flex items-center gap-2">
              <div className="text-yellow-500 text-lg">
                {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
              </div>
              <span className="text-sm text-gray-600">
                by {r.customerName}
              </span>
            </div>

            <h4 className="font-semibold text-sm mt-2">{r.title}</h4>

            <p className="text-sm text-gray-700 mt-1">{r.comment}</p>

            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span>✅ Helpful: {r.helpfulCount}</span>
              <span>❌ Not Helpful: {r.notHelpfulCount}</span>
            </div>

            <p className="text-xs text-gray-400 mt-1">
              {new Date(r.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      {/* ✅ Add Review UI (Same as Yours) */}
      <div className="mt-10 p-4 border rounded-lg bg-gray-50">
        <h3 className="font-semibold text-lg mb-3">Write a Review</h3>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium">Your Rating:</span>

          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`cursor-pointer text-2xl ${
                  (hoverRating || rating) >= star
                    ? "text-yellow-500"
                    : "text-gray-300"
                }`}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          className="w-full border rounded-md p-3 text-sm"
          rows={4}
          placeholder="Write your experience..."
        />

        <Button
          disabled={rating === 0 || reviewText.trim().length < 5}
          className="mt-4 w-full bg-[#445D41] text-white"
        >
          Submit Review
        </Button>
      </div>
    </section>
  );
}
