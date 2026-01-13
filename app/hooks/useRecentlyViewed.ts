const KEY = "recently_viewed_products";
const MAX_ITEMS = 10;

export function addRecentlyViewed(productId: string) {
  if (typeof window === "undefined") return;

  const stored = JSON.parse(localStorage.getItem(KEY) || "[]") as string[];

  const updated = [
    productId,
    ...stored.filter((id) => id !== productId),
  ].slice(0, MAX_ITEMS);

  localStorage.setItem(KEY, JSON.stringify(updated));
}

export function getRecentlyViewed() {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(KEY) || "[]") as string[];
}
