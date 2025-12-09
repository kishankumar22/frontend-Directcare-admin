"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  quantity: number;
  setQuantity: (value: number) => void;
  maxStock: number;
  stockError: string | null;
  setStockError: (value: string | null) => void;
}

export default function QuantitySelector({
  quantity,
  setQuantity,
  maxStock,
  stockError,
  setStockError
}: Props) {
  return (
    <div className="mb-4">
      {/* <label className="block text-sm font-semibold mb-2">
        Quantity:
      </label> */}

      <div className="flex flex-wrap items-center gap-3">
       <div className="flex items-center border border-gray-300 rounded-lg h-9">
  <Button
    variant="ghost"
    size="sm"
    className="px-2"
    onClick={() => setQuantity(Math.max(1, quantity - 1))}
    disabled={quantity <= 1}
  >
    <Minus className="h-3 w-3" />
  </Button>

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
        setStockError(`Only ${maxStock} items available`);
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

  <Button
    variant="ghost"
    size="sm"
    className="px-2"
    onClick={() => setQuantity(Math.min(quantity + 1, maxStock))}
    disabled={quantity >= maxStock}
  >
    <Plus className="h-3 w-3" />
  </Button>
</div>


        {stockError && (
          <p className="text-red-600 text-xs mt-1">{stockError}</p>
        )}
      </div>
    </div>
  );
}
