export const shareUrls = {
  facebook: (url: string) =>
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,

messenger: (url: string) =>
  `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&app_id=YOUR_FACEBOOK_APP_ID&redirect_uri=${encodeURIComponent(url)}`,

  pinterest: (url: string) =>
    `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}`,

  email: (url: string, subject: string) =>
    `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(url)}`,
   // ✅ NEW: WhatsApp
  whatsapp: (url: string, text: string) =>
    `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
};

export async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}
