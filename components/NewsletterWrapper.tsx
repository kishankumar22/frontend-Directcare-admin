//components/NewsletterWrapper.tsx
"use client";

import NewsletterModal from "@/components/newsletter/NewsletterModal";
import { useNewsletter } from "@/app/hooks/useNewsletter";

export default function NewsletterWrapper() {
  const { isOpen, checked, submitEmail, close, error, success } = useNewsletter();

  if (!checked) return null;

  return (
    <NewsletterModal 
      isOpen={isOpen}
      onClose={close}
      onSubmit={submitEmail}
      error={error}
  success={success}
    />
  );
}
