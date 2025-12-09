"use client";

import { Range } from "react-range";

interface PremiumPriceSliderProps {
  value: [number, number];
  min: number;
  max: number;
  step?: number;
  onChange: (value: [number, number]) => void;
}

export default function PremiumPriceSlider({
  value,
  min,
  max,
  step = 10,
  onChange,
}: PremiumPriceSliderProps) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm font-medium mb-2">
        <span>£{value[0]}</span>
        <span>£{value[1]}</span>
      </div>

      <Range
        values={[value[0], value[1]]}
        step={step}
        min={min}
        max={max}
        onChange={(vals) => onChange([vals[0], vals[1]])}
        renderTrack={({ props, children }) => (
          <div {...props} className="w-full h-2 bg-gray-200 rounded-full relative">
            <div
              className="h-2 bg-[#445D41] rounded-full absolute"
              style={{
                left: `${((value[0] - min) / (max - min)) * 100}%`,
                right: `${100 - ((value[1] - min) / (max - min)) * 100}%`,
              }}
            />
            {children}
          </div>
        )}
       renderThumb={({ props, index }) => {
  const { key, ...rest } = props; // remove key from spread
  return (
    <div
      key={key}
      {...rest}
      className="h-5 w-5 bg-white border-2 border-[#445D41] rounded-full shadow-md cursor-pointer flex items-center justify-center transition hover:scale-110 active:scale-95"
    >
      <div className="h-2 w-2 bg-[#445D41] rounded-full" />
    </div>
  );
}}

      />

      <div className="flex items-center justify-between gap-3 mt-3">
       <input
  type="number"
  className="w-20 border rounded-md px-2 py-1.5 text-sm"
  value={value[0]}
  min={min}
  max={value[1]}
  onChange={(e) => {
    const val = Number(e.target.value);
    if (!isNaN(val)) {
      onChange([Math.max(min, Math.min(val, value[1])), value[1]]);
    }
  }}
/>

<input
  type="number"
  className="w-20 border rounded-md px-2 py-1.5 text-sm"
  value={value[1]}
  min={value[0]}
  max={max}
  onChange={(e) => {
    const val = Number(e.target.value);
    if (!isNaN(val)) {
      onChange([value[0], Math.max(value[0], Math.min(val, max))]);
    }
  }}
/>

      </div>
    </div>
  );
}
