export function getImageUrl(
  imagePath?: string | null,
  fallback: string = "/placeholder.png"
): string {
  // ❌ invalid cases
  if (
    !imagePath ||
    imagePath === "string" ||
    imagePath === "null" ||
    imagePath === "undefined"
  ) {
    return fallback;
  }

  // ✅ already full URL
  if (imagePath.startsWith("http")) {
    return imagePath;
  }

  // ✅ relative path from backend
  return `${process.env.NEXT_PUBLIC_API_URL}${imagePath}`;
}
