"use client";

import NewsletterModal from "@/components/newsletter/NewsletterModal";
import { useNewsletter } from "@/app/hooks/useNewsletter";

export default function NewsletterWrapper() {
  const { isOpen, checked, submitEmail, close } = useNewsletter();

  if (!checked) return null;

  return (
    <NewsletterModal 
      isOpen={isOpen}
      onClose={close}
      onSubmit={submitEmail}
    />
  );
}
