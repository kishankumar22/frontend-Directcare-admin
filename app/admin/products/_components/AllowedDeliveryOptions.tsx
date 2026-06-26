"use client";

import React from "react";
import { productsService, DeliveryOption } from "@/lib/services";

type Props<T extends {
  allowedDeliveryOptionIds: string[];
  nextDayDeliveryEnabled: boolean;
  nextDayDeliveryFree: boolean;
  nextDayDeliveryCutoffTime: string;
  standardDeliveryEnabled: boolean;
}> = {
  formData: T;
  setFormData: React.Dispatch<React.SetStateAction<T>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
};

export default function AllowedDeliveryOptions<
  T extends {
    allowedDeliveryOptionIds: string[];
    nextDayDeliveryEnabled: boolean;
    nextDayDeliveryFree: boolean;
    nextDayDeliveryCutoffTime: string;
    standardDeliveryEnabled: boolean;
  }
>({
  formData,
  setFormData,
  handleChange,
}: Props<T>) {
  const [deliveryOptionsList, setDeliveryOptionsList] = React.useState<DeliveryOption[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadDeliveryOptions = async () => {
      try {
        const res = await productsService.getDeliveryOptions();
        if (res.error) return;

        const list = res.data?.data || [];
        const options = Array.isArray(list) ? list : [];
        setDeliveryOptionsList(options);

        // Find standard delivery option and ensure its ID is in allowedDeliveryOptionIds
        const standardOpt = options.find(opt => opt.name === 'standard');
        if (standardOpt) {
          setFormData((prev) => {
            const hasId = prev.allowedDeliveryOptionIds.includes(standardOpt.id);
            return {
              ...prev,
              standardDeliveryEnabled: true,
              allowedDeliveryOptionIds: hasId
                ? prev.allowedDeliveryOptionIds
                : [...prev.allowedDeliveryOptionIds, standardOpt.id]
            };
          });
        }
      } catch (e) {
        console.error("Failed to load delivery options", e);
      } finally {
        setLoading(false);
      }
    };
    loadDeliveryOptions();
  }, [setFormData]);

  if (loading) {
    return (
      <div className="space-y-4 mt-2">
        <label className="text-sm font-semibold text-slate-200">Allowed Delivery Options</label>
        <p className="text-xs text-slate-400">Loading delivery options...</p>
      </div>
    );
  }

  if (deliveryOptionsList.length === 0) {
    return (
      <div className="space-y-4 mt-2">
        <label className="text-sm font-semibold text-slate-200">Allowed Delivery Options</label>
      
        <p className="text-xs text-slate-500">No delivery options found.</p>
      </div>
    );
  }

  const standardOpt = deliveryOptionsList.find((o) => o.name === "standard");
  const nextDayOpt = deliveryOptionsList.find((o) => o.name === "next-day");
  const otherOpts = deliveryOptionsList.filter(
    (o) => o.name !== "standard" && o.name !== "next-day"
  );

  const renderOptionCheckbox = (opt: DeliveryOption) => {
    const isStandard = opt.name === "standard";
    const checked = isStandard ? true : formData.allowedDeliveryOptionIds.includes(opt.id);

    return (
      <div
        key={opt.id}
        className="flex flex-col gap-2.5 p-3.5 bg-slate-900/40 rounded-xl border border-slate-800 hover:border-slate-700 transition-all justify-center"
      >
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={checked}
              disabled={isStandard}
              onChange={(e) => {
                if (isStandard) return;
                const isChecked = e.target.checked;
                setFormData((prev) => {
                  const newIds = isChecked
                    ? [...prev.allowedDeliveryOptionIds, opt.id]
                    : prev.allowedDeliveryOptionIds.filter((id: string) => id !== opt.id);

                  const updates: any = {
                    allowedDeliveryOptionIds: newIds,
                  };

                  if (opt.name === "next-day") {
                    updates.nextDayDeliveryEnabled = isChecked;
                    if (!isChecked) {
                      updates.nextDayDeliveryFree = false;
                      updates.nextDayDeliveryCutoffTime = "";
                    }
                  } else if (isStandard) {
                    updates.standardDeliveryEnabled = isChecked;
                  }

                  return { ...prev, ...updates };
                });
              }}
              className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900 disabled:opacity-50"
            />
            <span className="text-sm text-slate-300 group-hover:text-white transition-colors font-medium">
              {opt.displayName || opt.name}
            </span>
          </label>
        </div>
      </div>
    );
  };

  const nextDayChecked = nextDayOpt
    ? formData.allowedDeliveryOptionIds.includes(nextDayOpt.id)
    : false;

  return (
    <div className="space-y-4 mt-2">

      <div className="space-y-4">
        {/* First Row: Standard and Next Day */}
        <div
          className={
            nextDayChecked
              ? "grid grid-cols-1 md:grid-cols-3 gap-4"
              : "grid grid-cols-1 md:grid-cols-2 gap-4"
          }
        >
          {standardOpt && renderOptionCheckbox(standardOpt)}

          {nextDayOpt && (() => {
            if (!nextDayChecked) {
              return (
                <div
                  key={nextDayOpt.id}
                  className="flex flex-col gap-2.5 p-3.5 bg-slate-900/40 rounded-xl border border-slate-800 hover:border-slate-700 transition-all justify-center"
                >
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setFormData((prev) => {
                            const newIds = isChecked
                              ? [...prev.allowedDeliveryOptionIds, nextDayOpt.id]
                              : prev.allowedDeliveryOptionIds.filter(
                                  (id: string) => id !== nextDayOpt.id
                                );

                            return {
                              ...prev,
                              allowedDeliveryOptionIds: newIds,
                              nextDayDeliveryEnabled: isChecked,
                              nextDayDeliveryFree: isChecked ? prev.nextDayDeliveryFree : false,
                              nextDayDeliveryCutoffTime: isChecked ? prev.nextDayDeliveryCutoffTime : "",
                            };
                          });
                        }}
                        className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900 disabled:opacity-50"
                      />
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors font-medium">
                        {nextDayOpt.displayName || nextDayOpt.name}
                      </span>
                    </label>
                  </div>
                </div>
              );
            } else {
              return (
                <div
                  key={nextDayOpt.id}
                  className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-3.5 bg-slate-900/40 rounded-xl border border-slate-800 hover:border-slate-700 transition-all w-full"
                >
                  <label className="flex items-center gap-2 cursor-pointer group justify-start">
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setFormData((prev) => {
                          const newIds = isChecked
                            ? [...prev.allowedDeliveryOptionIds, nextDayOpt.id]
                            : prev.allowedDeliveryOptionIds.filter(
                                (id: string) => id !== nextDayOpt.id
                              );

                          return {
                            ...prev,
                            allowedDeliveryOptionIds: newIds,
                            nextDayDeliveryEnabled: isChecked,
                            nextDayDeliveryFree: isChecked ? prev.nextDayDeliveryFree : false,
                            nextDayDeliveryCutoffTime: isChecked ? prev.nextDayDeliveryCutoffTime : "",
                          };
                        });
                      }}
                      className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900 disabled:opacity-50"
                    />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors font-semibold text-white">
                      {nextDayOpt.displayName || nextDayOpt.name}
                    </span>
                  </label>

                  {/* Free option checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer group justify-start">
                    <input
                      type="checkbox"
                      name="nextDayDeliveryFree"
                      checked={formData.nextDayDeliveryFree}
                      onChange={handleChange}
                      className="rounded bg-slate-800/50 border-slate-700 text-violet-500 focus:ring-violet-500"
                    />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors font-medium">
                      Next-Day Delivery Free
                    </span>
                  </label>

                  {/* Cutoff time input */}
                  <div className="flex items-center gap-2 justify-start w-full">
                    <label className="text-sm text-slate-400 whitespace-nowrap">
                      Cutoff Time <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="time"
                      name="nextDayDeliveryCutoffTime"
                      value={formData.nextDayDeliveryCutoffTime || ""}
                      onChange={handleChange}
                      className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-white text-sm focus:ring-1 focus:ring-violet-500 focus:border-transparent transition-all w-32"
                      required
                    />
                  </div>
                </div>
              );
            }
          })()}
        </div>

        {/* Second Row: Other options (Royal Mail, Click & Collect) */}
        {otherOpts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherOpts.map((opt) => renderOptionCheckbox(opt))}
          </div>
        )}
      </div>
    </div>
  );
}
