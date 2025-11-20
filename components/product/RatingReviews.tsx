"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function RatingReviews() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreview, setMediaPreview] = useState<string[]>([]);

 type RatingKey = 1 | 2 | 3 | 4 | 5;

const dummyRatingDistribution: Record<RatingKey, number> = {
  5: 78,
  4: 55,
  3: 32,
  2: 18,
  1: 10,
};


  const [dummyReviews] = useState([
    {
      id: 1,
      user: "John Doe",
      rating: 5,
      comment: "Great product! Very useful.",
      media: [],
      date: "2 days ago",
    },
    {
      id: 2,
      user: "Emma Watts",
      rating: 4,
      comment: "Good quality and fast delivery.",
      media: [],
      date: "1 week ago",
    },
  ]);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    setMediaFiles(files);
    setMediaPreview(files.map((file) => URL.createObjectURL(file)));
  };

  return (
    <section className="mt-12 bg-white p-6 rounded-xl shadow-sm border">
      <h2 className="text-2xl font-bold mb-4">Ratings & Reviews</h2>

      {/* ✅ Average Rating */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
        <div>
          <p className="text-5xl font-bold text-[#445D41]">4.6</p>
          <div className="flex mt-1 text-yellow-500 text-2xl">★★★★★</div>
          <p className="text-gray-600 text-sm mt-1">Based on 128 reviews</p>
        </div>

        {/* ✅ Rating bars */}
        <div className="flex-1 w-full">
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="flex items-center mb-2">
              <span className="w-10 text-sm">{star}★</span>
              <div className="flex-1 bg-gray-200 h-2 mx-2 rounded">
                <div
                  className="bg-[#445D41] h-2 rounded"
               style={{ width: `${dummyRatingDistribution[star as RatingKey]}%` }}



                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ✅ Add Review */}
      <div className="mb-10 p-4 border rounded-lg bg-gray-50">
        <h3 className="font-semibold text-lg mb-3">Write a Review</h3>

        {/* ⭐ Star Rating */}
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

        {/* 📝 Review Text */}
        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          className="w-full border rounded-md p-3 text-sm focus:ring-2 focus:ring-[#445D41]"
          rows={4}
          placeholder="Write your experience..."
        />

        {/* 📸 Optional Media Upload */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload Images / Video (optional)
          </label>

          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleMediaUpload}
            className="block w-full text-sm text-gray-600"
          />

          {/* ✅ Preview */}
          {mediaPreview.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {mediaPreview.map((url, idx) => (
                <div key={idx} className="w-20 h-20 rounded overflow-hidden border">
                  {url.includes("video") ? (
                    <video src={url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={url} className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ✅ Submit Button */}
        <Button
          disabled={rating === 0 || reviewText.trim().length < 5}
          className="mt-4 w-full bg-[#445D41] hover:bg-[#2f3f2d] text-white"
        >
          Submit Review
        </Button>
      </div>

      {/* ✅ Existing Reviews */}
      <h3 className="text-lg font-semibold mb-4">Customer Reviews</h3>

      <div className="space-y-5">
        {dummyReviews.map((r) => (
          <div key={r.id} className="border-b pb-4">
            <div className="flex items-center gap-2">
              <div className="text-yellow-500 text-lg">
                {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
              </div>
              <span className="text-sm text-gray-500">by {r.user}</span>
            </div>

            <p className="text-sm text-gray-700 mt-2">{r.comment}</p>

            {r.media?.length > 0 && (
              <div className="flex gap-3 mt-2">
                {r.media.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    className="w-20 h-20 object-cover rounded border"
                  />
                ))}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-1">{r.date}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
