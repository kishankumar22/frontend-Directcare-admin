"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast/CustomToast";
import { useMemo } from "react";

interface Props {
  quantity: number;
  setQuantity: (value: number) => void;
  maxStock: number;
  stockError: string | null;
  setStockError: (value: string | null) => void;

  // existing safe props
  minQty?: number;
  maxQty?: number;

  // ✅ NEW
  allowedQuantities?: string;
}

export default function QuantitySelector({
  quantity,
  setQuantity,
  maxStock,
  stockError,
  setStockError,
  minQty,
  maxQty,
  allowedQuantities,
}: Props) {
  const toast = useToast();

  /* =============================
     Parse Allowed Quantities
  ============================== */

  const allowedQtyArray = useMemo(() => {
    if (!allowedQuantities) return [];

    return allowedQuantities
      .split(",")
      .map((q) => Number(q.trim()))
      .filter((q) => !isNaN(q) && q > 0 && q <= maxStock)
      .sort((a, b) => a - b);
  }, [allowedQuantities, maxStock]);

  const hasAllowedQuantities = allowedQtyArray.length > 0;

  /* =============================
     If Allowed Quantities Exist
     Show Dropdown (Industry Standard)
  ============================== */

  if (hasAllowedQuantities) {
    return (
      <div className="mb-0">
        <div className="flex flex-col gap-2">
          <select
            value={quantity}
            onChange={(e) => {
              const selected = Number(e.target.value);
              setQuantity(selected);
              setStockError(null);
            }}
            className="border border-gray-300 rounded-lg h-7 px-3 py-1.5 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black"
          >
            {allowedQtyArray.map((qty) => (
              <option key={qty} value={qty}>
                {qty}
              </option>
            ))}
          </select>

          {stockError && (
            <p className="text-red-600 text-xs">{stockError}</p>
          )}
        </div>
      </div>
    );
  }

  /* =============================
     DEFAULT EXISTING STEPPER
     (UNCHANGED LOGIC)
  ============================== */

  return (
    <div className="mb-0">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center border border-gray-300 rounded-lg h-9">
          {/* MINUS */}
          <Button
            variant="ghost"
            size="sm"
            className="px-2"
            onClick={() => {
              if (quantity <= (minQty ?? 1)) {
                toast.error(
                  `Minimum order quantity is ${minQty ?? 1}`
                );
                return;
              }
              setQuantity(Math.max(1, quantity - 1));
            }}
            disabled={quantity <= 1}
          >
            <Minus className="h-3 w-3" />
          </Button>

          {/* INPUT */}
          <input
            type="number"
            className="w-10 text-center font-semibold outline-none border-l border-r border-gray-300 text-sm"
            value={quantity === 0 ? "" : quantity}
            onChange={(e) => {
              let val = e.target.value;
              if (!/^\d*$/.test(val)) return;

              if (val === "") {
                setQuantity(0);
                return;
              }

              let num = parseInt(val, 10);

              if (num > maxStock) {
                num = maxStock;
                setStockError(
                  `Only ${maxStock} items available`
                );
              } else {
                setStockError(null);
              }

              setQuantity(num);
            }}
            onBlur={() => {
              if (!quantity || quantity < 1) setQuantity(1);
              if (quantity > maxStock) setQuantity(maxStock);
              setStockError(null);
            }}
            inputMode="numeric"
          />

          {/* PLUS */}
          <Button
            variant="ghost"
            size="sm"
            className="px-2"
            onClick={() => {
              const limit = maxQty ?? maxStock;

              if (quantity >= limit) {
                toast.error(
                  `Maximum order quantity is ${limit}`
                );
                return;
              }

              setQuantity(Math.min(quantity + 1, maxStock));
            }}
            disabled={quantity >= maxStock}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {stockError && (
          <p className="text-red-600 text-xs mt-1">
            {stockError}
          </p>
        )}
      </div>
    </div>
  );
}
