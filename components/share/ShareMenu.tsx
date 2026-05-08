"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { shareUrls, copyToClipboard } from "./shareUtils";
import { useToast } from "@/components/toast/CustomToast";
import Image from "next/image";
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
  if (shareUrl.startsWith("mailto:")) {
    window.location.href = shareUrl; // ✅ FIXED
  } else {
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }

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
        <X className="h-6 w-6 text-gray-500 hover:text-black" />
      </button>
    </div>

    {/* ITEMS */}
  <button
  className="share-item"
  onClick={() => open(shareUrls.email(url, title))}
>
 <Image src="/icons/email.svg" alt="email" width={20} height={20} />
  <span>Email</span>
</button>

<button
  className="share-item"
  onClick={() => open(shareUrls.facebook(url))}
>
<Image src="/icons/facebook.svg" alt="facebook" width={20} height={20} />
  <span>Facebook</span>
</button>

<button
  className="share-item"
  onClick={() => open(shareUrls.messenger(url))}
>
  <Image src="/icons/messenger.svg" alt="messenger" width={20} height={20} />
  <span>Messenger</span>
</button>

<button
  className="share-item"
  onClick={() => open(shareUrls.whatsapp(url, title))}
>
 <Image src="/icons/whatsapp.svg" alt="whatsapp" width={20} height={20} />
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
 <Image src="/icons/link.svg" alt="link" width={20} height={20} />
  <span>Copy Link</span>
</button>
  </div>
);

}
