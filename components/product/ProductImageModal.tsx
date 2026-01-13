"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect } from "react";

interface ProductImage {
  id: string;
  imageUrl: string;
  altText?: string;
}

interface Props {
  images: ProductImage[];
  activeIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  getImageUrl: (url: string) => string;
}

export default function ProductImageModal({
  images,
  activeIndex,
  onClose,
  onPrev,
  onNext,
  getImageUrl,
}: Props) {


  // 🔒 Lock background scroll + keyboard support
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose, onPrev, onNext]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
      {/* CLOSE */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:scale-110 transition"
      >
        <X className="h-7 w-7" />
      </button>

      {/* PREV */}
      {images.length > 1 && (
        <button
          onClick={onPrev}
          className="absolute left-4 md:left-10 text-white bg-black/40 p-3 rounded-full hover:bg-black/60"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* IMAGE */}
      <div className="relative w-[90vw] h-[80vh] max-w-5xl">
        <Image
          src={getImageUrl(images[activeIndex].imageUrl)}
          alt={images[activeIndex].altText || "Product image"}
          fill
          className="object-contain"
          sizes="100vw"
          priority
        />
      </div>

      {/* NEXT */}
      {images.length > 1 && (
        <button
          onClick={onNext}
          className="absolute right-4 md:right-10 text-white bg-black/40 p-3 rounded-full hover:bg-black/60"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* COUNTER */}
      <div className="absolute bottom-5 text-white text-sm">
        {activeIndex + 1} / {images.length}
      </div>
    </div>
  );
}
