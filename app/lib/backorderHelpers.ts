export function getBackorderUIState({
  stock,
  allowBackorder,
  backorderMode,
}: {
  stock: number;
  allowBackorder?: boolean;
  backorderMode?: string;
}) {
  // In stock → normal
  if (stock > 0) {
    return {
      canBuy: true,
      showNotify: false,
      label: "ADD_TO_CART",
    };
  }

  // Out of stock + backorder not allowed
  if (!allowBackorder) {
    return {
      canBuy: false,
      showNotify: false,
      label: "OUT_OF_STOCK",
    };
  }

  // Silent backorder
  if (backorderMode === "allow-qty-below-zero") {
    return {
      canBuy: true,
      showNotify: false,
      label: "ADD_TO_CART",
    };
  }

  // Notify mode
  if (backorderMode === "allow-qty-below-zero-and-notify") {
    return {
      canBuy: false,
      showNotify: true,
      label: "NOTIFY",
    };
  }

  // Fallback (safe)
  return {
    canBuy: false,
    showNotify: false,
    label: "OUT_OF_STOCK",
  };
}
