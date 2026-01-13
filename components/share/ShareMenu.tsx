"use client";

import { useEffect, useRef } from "react";
import { Mail, Facebook, Link2, X, MessageCircle } from "lucide-react";
import { shareUrls, copyToClipboard } from "./shareUtils";
import { useToast } from "@/components/CustomToast";

interface Props {
  url: string;
  title: string;
  onClose: () => void;
}

export default function ShareMenu({ url, title, onClose }: Props) {
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);

  // ✅ Outside click + ESC close
  useEffect(() => {
    const handler = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key === "Escape") {
        onClose();
      }

      if (
        e instanceof MouseEvent &&
        ref.current &&
        !ref.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  const open = (shareUrl: string) => {
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
  <div
    ref={ref}
    className="absolute right-0 mt-14 w-56 bg-white border border-gray-200 
               rounded-xl shadow-xl z-50 overflow-hidden"
  >
    {/* HEADER */}
    <div className="flex items-center justify-between px-4 py-2 border-b">
      <span className="text-sm font-semibold text-gray-700">Share</span>
      <button onClick={onClose}>
        <X className="h-4 w-4 text-gray-500 hover:text-black" />
      </button>
    </div>

    {/* ITEMS */}
    <button
      className="share-item"
      onClick={() => open(shareUrls.email(url, title))}
    >
      <Mail className="h-4 w-4" />
      <span>Email</span>
    </button>

    <button
      className="share-item"
      onClick={() => open(shareUrls.facebook(url))}
    >
      <Facebook className="h-4 w-4 text-blue-600" />
      <span>Facebook</span>
    </button>

    <button
      className="share-item"
      onClick={() => open(shareUrls.twitter(url, title))}
    >
      <X className="h-4 w-4" />
      <span>X</span>
    </button>
<button
  className="share-item"
  onClick={() => open(shareUrls.whatsapp(url, title))}
>
  <MessageCircle className="h-4 w-4 text-green-600" />
  <span>WhatsApp</span>
</button>

    <button
      className="share-item"
      onClick={async () => {
        await copyToClipboard(url);
        toast.success("Link copied");
        onClose();
      }}
    >
      <Link2 className="h-4 w-4" />
      <span>Copy Link</span>
    </button>
  </div>
);

}
