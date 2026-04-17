"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, X } from "lucide-react";

import { useToast } from "@/app/admin/_components/CustomToast";
import {
  DeliveryStrip,
  DeliveryStripPayload,
  deliveryStripService,
} from "@/lib/services/DeliveryStrip";

interface DeliveryStripFormModalProps {
  editing: DeliveryStrip | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FeatureCard {
  icon: string;
  heading: string;
  description: string;
}

const defaultFeatureCard: FeatureCard = {
  icon: "",
  heading: "",
  description: "",
};

export default function DeliveryStripFormModal({
  editing,
  onClose,
  onSuccess,
}: DeliveryStripFormModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<DeliveryStripPayload>({
    title: "",
    subtitle: "",
    icon: "",
    slug: "",
    displayOrder: null, // ✅ Changed to null instead of 0
    isActive: true,
    pageTitle: "",
    pageSubtitle: "",
    featureCards: [{ ...defaultFeatureCard }],
    infoSectionTitle: "",
    infoPoints: [""],
    pageContentJson: "{}",
    currentUser: "admin@example.com",
  });

  useEffect(() => {
    if (editing) {
      setFormData({
        id: editing.id,
        title: editing.title,
        subtitle: editing.subtitle,
        icon: editing.icon,
        slug: editing.slug,
        displayOrder: editing.displayOrder ?? null, // ✅ Handle null/undefined
        isActive: editing.isActive,
        pageTitle: editing.pageTitle,
        pageSubtitle: editing.pageSubtitle,
        featureCards: editing.featureCards.length > 0 
          ? editing.featureCards 
          : [{ ...defaultFeatureCard }],
        infoSectionTitle: editing.infoSectionTitle,
        infoPoints: editing.infoPoints.length > 0 
          ? editing.infoPoints 
          : [""],
        pageContentJson: editing.pageContentJson,
        currentUser: "admin@example.com",
      });
    }
  }, [editing]);

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return false;
    }
    if (!formData.slug.trim()) {
      toast.error("Slug is required");
      return false;
    }
    if (!formData.pageTitle.trim()) {
      toast.error("Page Title is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const cleanedFeatureCards = formData.featureCards.filter(
      (card) => card.heading.trim() || card.description.trim()
    );
    const cleanedInfoPoints = formData.infoPoints.filter(
      (point) => point.trim()
    );

    const payload = {
      ...formData,
      featureCards: cleanedFeatureCards.length > 0 ? cleanedFeatureCards : [],
      infoPoints: cleanedInfoPoints,
      // ✅ If displayOrder is empty string or null, send null
      displayOrder: formData.displayOrder === null || formData.displayOrder === undefined 
        ? null 
        : Number(formData.displayOrder),
    };

    setLoading(true);
    try {
      let response;
      if (editing) {
        response = await deliveryStripService.update(editing.id, payload);
      } else {
        response = await deliveryStripService.create(payload);
      }

      if (response.data?.success) {
        toast.success(response.data.message || `Delivery strip ${editing ? "updated" : "created"} successfully`);
        onSuccess();
      } else {
        toast.error(response.data?.message || "Operation failed");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const addFeatureCard = () => {
    setFormData({
      ...formData,
      featureCards: [...formData.featureCards, { ...defaultFeatureCard }],
    });
  };

  const removeFeatureCard = (index: number) => {
    const newCards = formData.featureCards.filter((_, i) => i !== index);
    setFormData({ ...formData, featureCards: newCards });
  };

  const updateFeatureCard = (
    index: number,
    field: keyof FeatureCard,
    value: string
  ) => {
    const newCards = [...formData.featureCards];
    newCards[index][field] = value;
    setFormData({ ...formData, featureCards: newCards });
  };

  const addInfoPoint = () => {
    setFormData({
      ...formData,
      infoPoints: [...formData.infoPoints, ""],
    });
  };

  const removeInfoPoint = (index: number) => {
    const newPoints = formData.infoPoints.filter((_, i) => i !== index);
    setFormData({ ...formData, infoPoints: newPoints });
  };

  const updateInfoPoint = (index: number, value: string) => {
    const newPoints = [...formData.infoPoints];
    newPoints[index] = value;
    setFormData({ ...formData, infoPoints: newPoints });
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              {editing ? "Edit Delivery Strip" : "Create New Delivery Strip"}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-red-600 rounded-lg transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {editing
              ? "Update the delivery option details"
              : "Add a new delivery option to your website"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto max-h-[calc(90vh-100px)] space-y-5">
          {/* Basic Information */}
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
            <h3 className="text-sm font-semibold text-white mb-3">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="NEXT DAY DELIVERY"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="GET IT JUST FOR £4.49"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Icon Name</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="Zap, Truck, BikeIcon"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Slug *</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="next-day"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Display Order (Optional)</label>
                <input
                  type="number"
                  value={formData.displayOrder === null ? "" : formData.displayOrder}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ 
                      ...formData, 
                      displayOrder: value === "" ? null : Number(value) 
                    });
                  }}
                  placeholder="Leave empty for no order"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">Optional: Leave empty if not needed</p>
              </div>
              <div className="flex items-center gap-3 pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 text-violet-500 focus:ring-1 focus:ring-violet-500"
                  />
                  <span className="text-sm text-white">Active</span>
                </label>
              </div>
            </div>
          </div>

          {/* Rest of the form remains same */}
          {/* Page Information */}
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
            <h3 className="text-sm font-semibold text-white mb-3">Page Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Page Title *</label>
                <input
                  type="text"
                  value={formData.pageTitle}
                  onChange={(e) => setFormData({ ...formData, pageTitle: e.target.value })}
                  placeholder="Next Day Delivery Option"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Page Subtitle</label>
                <textarea
                  value={formData.pageSubtitle}
                  onChange={(e) => setFormData({ ...formData, pageSubtitle: e.target.value })}
                  rows={2}
                  placeholder="Expedited delivery to get your items quickly..."
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Feature Cards</h3>
              <button
                type="button"
                onClick={addFeatureCard}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Add Card
              </button>
            </div>
            <div className="space-y-3">
              {formData.featureCards.map((card, idx) => (
                <div key={idx} className="bg-slate-900/30 p-3 rounded-lg border border-slate-700/30">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-slate-500">Card {idx + 1}</span>
                    {formData.featureCards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFeatureCard(idx)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      type="text"
                      value={card.icon}
                      onChange={(e) => updateFeatureCard(idx, "icon", e.target.value)}
                      placeholder="Icon (e.g., Clock, Truck)"
                      className="px-2 py-1.5 bg-slate-900/50 border border-slate-700 rounded-md text-white text-xs"
                    />
                    <input
                      type="text"
                      value={card.heading}
                      onChange={(e) => updateFeatureCard(idx, "heading", e.target.value)}
                      placeholder="Heading"
                      className="px-2 py-1.5 bg-slate-900/50 border border-slate-700 rounded-md text-white text-xs"
                    />
                    <textarea
                      value={card.description}
                      onChange={(e) => updateFeatureCard(idx, "description", e.target.value)}
                      placeholder="Description"
                      rows={2}
                      className="px-2 py-1.5 bg-slate-900/50 border border-slate-700 rounded-md text-white text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Info Section</h3>
              <button
                type="button"
                onClick={addInfoPoint}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Add Point
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Section Title</label>
                <input
                  type="text"
                  value={formData.infoSectionTitle}
                  onChange={(e) => setFormData({ ...formData, infoSectionTitle: e.target.value })}
                  placeholder="Important Information"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm"
                />
              </div>
              {formData.infoPoints.map((point, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={point}
                    onChange={(e) => updateInfoPoint(idx, e.target.value)}
                    placeholder={`Info point ${idx + 1}`}
                    className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm"
                  />
                  {formData.infoPoints.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeInfoPoint(idx)}
                      className="p-2 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* JSON Content */}
          <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
            <h3 className="text-sm font-semibold text-white mb-2">Page Content (JSON)</h3>
            <textarea
              value={formData.pageContentJson}
              onChange={(e) => setFormData({ ...formData, pageContentJson: e.target.value })}
              rows={6}
              placeholder='{"sections": []}'
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">JSON content for the detailed page</p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? (editing ? "Updating..." : "Creating...") : (editing ? "Update" : "Create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}