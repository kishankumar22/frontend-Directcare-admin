"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, X, AlertCircle, ToggleLeft, ToggleRight } from "lucide-react";
import { useToast } from "@/app/admin/_component/CustomToast";
import { PharmacyQuestion, CreatePharmacyQuestionDto, UpdatePharmacyQuestionDto, pharmacyQuestionsService } from "@/lib/PharmacyQuestions";


interface PharmacyQuestionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  question?: PharmacyQuestion | null;
  isEditMode?: boolean;
  onSuccess?: () => void;
  nextDisplayOrder?: number;
}

export default function PharmacyQuestionFormModal({
  isOpen,
  onClose,
  question,
  isEditMode = false,
  onSuccess,
  nextDisplayOrder = 1,
}: PharmacyQuestionFormModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<CreatePharmacyQuestionDto>({
    questionText: "",
    isActive: true,
    displayOrder: nextDisplayOrder,
    options: [
      { optionText: "Yes", isDisqualifying: false, displayOrder: 1 },
      { optionText: "No", isDisqualifying: false, displayOrder: 2 },
    ],
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && question) {
        setFormData({
          questionText: question.questionText,
          isActive: question.isActive,
          displayOrder: question.displayOrder,
          options: question.options.map((opt) => ({
            optionText: opt.optionText,
            isDisqualifying: opt.isDisqualifying,
            displayOrder: opt.displayOrder,
          })),
        });
      } else {
        setFormData({
          questionText: "",
          isActive: true,
          displayOrder: nextDisplayOrder,
          options: [
            { optionText: "Yes", isDisqualifying: false, displayOrder: 1 },
            { optionText: "No", isDisqualifying: false, displayOrder: 2 },
          ],
        });
      }
      setFormErrors({});
    }
  }, [isOpen, isEditMode, question, nextDisplayOrder]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.questionText.trim()) {
      errors.questionText = "Question text is required";
    }

    if (formData.displayOrder < 1) {
      errors.displayOrder = "Display order must be at least 1";
    }

    if (formData.options.length < 2) {
      errors.options = "At least 2 options are required";
    }

    formData.options.forEach((opt, index) => {
      if (!opt.optionText.trim()) {
        errors[`option_${index}`] = "Option text is required";
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fix form errors");
      return;
    }

    try {
      setLoading(true);

      if (isEditMode && question) {
        const updateData: UpdatePharmacyQuestionDto = {
          id: question.id,
          questionText: formData.questionText,
          isActive: formData.isActive,
          displayOrder: formData.displayOrder,
          options: formData.options.map((opt, index) => {
            const existingOption = question.options[index];
            return {
              id: existingOption?.id || crypto.randomUUID(),
              optionText: opt.optionText,
              isDisqualifying: opt.isDisqualifying,
              displayOrder: opt.displayOrder,
            };
          }),
        };

        await pharmacyQuestionsService.update(question.id, updateData);
        toast.success("Question updated successfully");
      } else {
        await pharmacyQuestionsService.create(formData);
        toast.success("Question created successfully");
      }

      onClose();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} question`);
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [
        ...formData.options,
        {
          optionText: "",
          isDisqualifying: false,
          displayOrder: formData.options.length + 1,
        },
      ],
    });
  };

  const removeOption = (index: number) => {
    if (formData.options.length <= 2) {
      toast.warning("At least 2 options are required");
      return;
    }
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({ ...formData, options: newOptions });
  };

  const updateOption = (index: number, field: string, value: any) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setFormData({ ...formData, options: newOptions });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-violet-500/10">
        <div className="p-4 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center">
                {isEditMode ? <Edit className="h-6 w-6 text-white" /> : <Plus className="h-6 w-6 text-white" />}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {isEditMode ? "Edit Question" : "Create New Question"}
                </h2>
                <p className="text-slate-400 text-sm">
                  {isEditMode ? "Update question details" : "Add a new pharmacy question"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-red-500/20 border border-transparent hover:border-red-500/50 rounded-lg transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          {/* Question Text */}
          <div>
            <label className="block text-sm text-slate-300 font-semibold mb-2">
              Question Text <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.questionText}
              onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
              placeholder="e.g., Are you pregnant or breastfeeding?"
              className={`w-full px-4 py-2.5 bg-slate-800/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                formErrors.questionText ? "border-red-500" : "border-slate-600"
              }`}
            />
            {formErrors.questionText && (
              <p className="text-red-400 text-xs mt-1">{formErrors.questionText}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Display Order */}
            <div>
              <label className="block text-sm text-slate-300 font-semibold mb-2">
                Display Order <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 1 })}
                className={`w-full px-4 py-2.5 bg-slate-800/50 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                  formErrors.displayOrder ? "border-red-500" : "border-slate-600"
                }`}
              />
              {formErrors.displayOrder && (
                <p className="text-red-400 text-xs mt-1">{formErrors.displayOrder}</p>
              )}
            </div>

            {/* Active Status */}
            <div>
              <label className="block text-sm text-slate-300 font-semibold mb-2">Status</label>
              <button
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                type="button"
                className={`w-full px-4 py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  formData.isActive
                    ? "bg-green-500/10 border-2 border-green-500/50 text-green-400"
                    : "bg-red-500/10 border-2 border-red-500/50 text-red-400"
                }`}
              >
                {formData.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                {formData.isActive ? "Active" : "Inactive"}
              </button>
            </div>
          </div>

          {/* Answer Options */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-300 font-semibold">
                Answer Options <span className="text-red-400">*</span>
              </label>
              <button
                onClick={addOption}
                type="button"
                className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Option
              </button>
            </div>

            <div className="space-y-2">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-sm font-bold shrink-0">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={option.optionText}
                    onChange={(e) => updateOption(index, "optionText", e.target.value)}
                    placeholder="Option text"
                    className={`flex-1 px-3 py-2 bg-slate-800/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                      formErrors[`option_${index}`] ? "border-red-500" : "border-slate-600"
                    }`}
                  />
                  <button
                    onClick={() => updateOption(index, "isDisqualifying", !option.isDisqualifying)}
                    type="button"
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      option.isDisqualifying
                        ? "bg-orange-500/10 border border-orange-500/50 text-orange-400"
                        : "bg-slate-800/50 border border-slate-600 text-slate-400 hover:text-white"
                    }`}
                    title="Toggle Disqualifying"
                  >
                    <AlertCircle className="h-4 w-4" />
                  </button>
                  {formData.options.length > 2 && (
                    <button
                      onClick={() => removeOption(index)}
                      type="button"
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Remove Option"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {formErrors.options && <p className="text-red-400 text-xs mt-1">{formErrors.options}</p>}
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              type="button"
              className="flex-1 px-4 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              type="button"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white rounded-xl transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{isEditMode ? "Updating..." : "Creating..."}</span>
                </div>
              ) : isEditMode ? (
                "Update Question"
              ) : (
                "Create Question"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
