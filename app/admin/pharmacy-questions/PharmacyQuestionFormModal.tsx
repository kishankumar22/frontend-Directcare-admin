"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, X, ToggleLeft, ToggleRight, List, Type, CornerDownRight } from "lucide-react";
import { useToast } from "@/app/admin/_components/CustomToast";
import {
  PharmacyQuestion,
  CreatePharmacyQuestionDto,
  CreatePharmacyQuestionOptionDto,
  CreatePharmacyFollowUpQuestionDto,
  UpdatePharmacyQuestionDto,
  UpdatePharmacyQuestionOptionDto,
  UpdatePharmacyFollowUpQuestionDto,
  PharmacyQuestionOption,
  pharmacyQuestionsService,
} from "@/lib/services/PharmacyQuestions";
import { getBackendMessage } from "../_utils/errorUtils";

// Matches PharmacyQuestionTreeHelper.MaxFollowUpDepth on the backend — a soft cap so the UI
// doesn't let an admin build a chain the API will reject anyway.
const MAX_FOLLOW_UP_DEPTH = 6;

interface PharmacyQuestionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  question?: PharmacyQuestion | null;
  isEditMode?: boolean;
  onSuccess?: () => void;
  nextDisplayOrder?: number;
}

// ─── Local editable tree shape (unifies Create/Update option payloads) ────────────────────────
// `id` is present only when editing an existing option/follow-up question; omitted for new ones.
interface EditableFollowUp {
  id?: string;
  questionText: string;
  isActive: boolean;
  answerType: string; // "Options" | "Text"
  options: EditableOption[];
}

interface EditableOption {
  id?: string;
  optionText: string;
  displayOrder: number;
  hasFollowUpQuestion: boolean;
  followUpQuestion: EditableFollowUp | null;
}

const emptyOption = (displayOrder: number, optionText = ""): EditableOption => ({
  optionText,
  displayOrder,
  hasFollowUpQuestion: false,
  followUpQuestion: null,
});

const emptyFollowUp = (): EditableFollowUp => ({
  questionText: "",
  isActive: true,
  answerType: "Options",
  options: [emptyOption(1, "Yes"), emptyOption(2, "No")],
});

function toEditableOptions(options: PharmacyQuestionOption[]): EditableOption[] {
  return options.map((opt) => ({
    id: opt.id,
    optionText: opt.optionText,
    displayOrder: opt.displayOrder,
    hasFollowUpQuestion: opt.hasFollowUpQuestion ?? false,
    followUpQuestion: opt.followUpQuestion
      ? {
          id: opt.followUpQuestion.id,
          questionText: opt.followUpQuestion.questionText,
          isActive: opt.followUpQuestion.isActive,
          answerType: opt.followUpQuestion.answerType || "Options",
          options: toEditableOptions(opt.followUpQuestion.options || []),
        }
      : null,
  }));
}

function toCreateOptions(options: EditableOption[]): CreatePharmacyQuestionOptionDto[] {
  return options.map((opt) => {
    const followUp: CreatePharmacyFollowUpQuestionDto | null =
      opt.hasFollowUpQuestion && opt.followUpQuestion
        ? {
            questionText: opt.followUpQuestion.questionText,
            isActive: opt.followUpQuestion.isActive,
            answerType: opt.followUpQuestion.answerType,
            options:
              opt.followUpQuestion.answerType === "Text" ? [] : toCreateOptions(opt.followUpQuestion.options),
          }
        : null;

    return {
      optionText: opt.optionText,
      displayOrder: opt.displayOrder,
      hasFollowUpQuestion: opt.hasFollowUpQuestion,
      followUpQuestion: followUp,
    };
  });
}

function toUpdateOptions(options: EditableOption[]): UpdatePharmacyQuestionOptionDto[] {
  return options.map((opt) => {
    const followUp: UpdatePharmacyFollowUpQuestionDto | null =
      opt.hasFollowUpQuestion && opt.followUpQuestion
        ? {
            id: opt.followUpQuestion.id,
            questionText: opt.followUpQuestion.questionText,
            isActive: opt.followUpQuestion.isActive,
            answerType: opt.followUpQuestion.answerType,
            options:
              opt.followUpQuestion.answerType === "Text" ? [] : toUpdateOptions(opt.followUpQuestion.options),
          }
        : null;

    return {
      id: opt.id,
      optionText: opt.optionText,
      displayOrder: opt.displayOrder,
      hasFollowUpQuestion: opt.hasFollowUpQuestion,
      followUpQuestion: followUp,
    };
  });
}

/// Recursively validates an options tree, appending human-readable messages to `errors`.
function validateOptionsTree(options: EditableOption[], errors: string[], depth: number) {
  if (depth > MAX_FOLLOW_UP_DEPTH) {
    errors.push(`Follow-up questions cannot be nested more than ${MAX_FOLLOW_UP_DEPTH} levels deep.`);
    return;
  }

  const suffix = depth > 0 ? " in a follow-up question" : "";

  if (options.length < 2) errors.push(`At least 2 options are required${suffix}`);

  const texts = options.map((o) => o.optionText.trim().toLowerCase());
  if (new Set(texts).size !== texts.length) errors.push(`Duplicate options are not allowed${suffix}`);

  options.forEach((opt) => {
    if (!opt.optionText.trim()) errors.push(`Option text is required${suffix}`);

    if (opt.hasFollowUpQuestion) {
      if (!opt.followUpQuestion || !opt.followUpQuestion.questionText.trim()) {
        errors.push(`Follow-up question text is required for option "${opt.optionText || "(untitled)"}"`);
      } else if (opt.followUpQuestion.answerType === "Options") {
        validateOptionsTree(opt.followUpQuestion.options, errors, depth + 1);
      }
    }
  });
}

// ─── Recursive follow-up question editor ───────────────────────────────────────────────────────
function FollowUpQuestionEditor({
  value,
  onChange,
  onRemove,
  depth,
  showErrors,
}: {
  value: EditableFollowUp;
  onChange: (v: EditableFollowUp) => void;
  onRemove: () => void;
  depth: number;
  showErrors: boolean;
}) {
  const atDepthCap = depth >= MAX_FOLLOW_UP_DEPTH;

  const addOption = () => {
    onChange({
      ...value,
      options: [...value.options, emptyOption(value.options.length + 1)],
    });
  };

  const removeOption = (index: number) => {
    if (value.options.length <= 2) return;
    onChange({ ...value, options: value.options.filter((_, i) => i !== index) });
  };

  const updateOption = (index: number, patch: Partial<EditableOption>) => {
    const next = [...value.options];
    next[index] = { ...next[index], ...patch };
    onChange({ ...value, options: next });
  };

  return (
    <div className="mt-2 pl-3 border-l-2 border-cyan-300 dark:border-cyan-500/40 space-y-3">
      <div className="p-3 rounded-lg border border-cyan-200 dark:border-cyan-500/30 bg-cyan-50/50 dark:bg-cyan-500/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-400">
            <CornerDownRight className="h-3.5 w-3.5" />
            Follow-up Question
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-all"
            title="Remove follow-up question"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Follow-up question text */}
        <div>
          <textarea
            value={value.questionText}
            onChange={(e) => onChange({ ...value, questionText: e.target.value })}
            placeholder="Follow-up question text (multi-line / bullet points supported)"
            rows={2}
            className={`w-full px-3 py-2 bg-white dark:bg-slate-800/50 border rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm transition-all resize-y ${
              showErrors && !value.questionText.trim()
                ? "border-red-500"
                : "border-slate-200 dark:border-slate-600"
            }`}
          />
        </div>

        {/* Follow-up answer type */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...value, answerType: "Options" })}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              value.answerType === "Options"
                ? "bg-violet-50 dark:bg-violet-500/20 border-2 border-violet-200 dark:border-violet-500/50 text-violet-700 dark:text-violet-400"
                : "bg-white dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            Multiple Choice
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...value, answerType: "Text", options: [] })}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              value.answerType === "Text"
                ? "bg-cyan-100 dark:bg-cyan-500/20 border-2 border-cyan-300 dark:border-cyan-500/50 text-cyan-700 dark:text-cyan-400"
                : "bg-white dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400"
            }`}
          >
            <Type className="h-3.5 w-3.5" />
            Text Answer
          </button>
        </div>

        {/* Follow-up options (Multiple Choice only) */}
        {value.answerType === "Options" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Answer Options</span>
              <button
                type="button"
                onClick={addOption}
                className="px-2 py-1 bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-300 dark:border-cyan-500/50 text-cyan-700 dark:text-cyan-400 rounded-lg text-[11px] font-semibold flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Add Option
              </button>
            </div>

            {value.options.map((opt, index) => (
              <div
                key={index}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs font-bold shrink-0">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={opt.optionText}
                    onChange={(e) => updateOption(index, { optionText: e.target.value })}
                    placeholder="Option text"
                    className={`flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-800/50 border rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm transition-all ${
                      showErrors && !opt.optionText.trim() ? "border-red-500" : "border-slate-200 dark:border-slate-600"
                    }`}
                  />
                  {value.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="pl-8">
                  <label
                    className={`flex items-center gap-2 select-none text-xs text-slate-600 dark:text-slate-400 ${
                      atDepthCap ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
                    title={atDepthCap ? `Maximum nesting depth (${MAX_FOLLOW_UP_DEPTH}) reached` : undefined}
                  >
                    <input
                      type="checkbox"
                      disabled={atDepthCap}
                      checked={opt.hasFollowUpQuestion}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        updateOption(index, {
                          hasFollowUpQuestion: checked,
                          followUpQuestion: checked ? opt.followUpQuestion ?? emptyFollowUp() : null,
                        });
                      }}
                      className="rounded border-slate-300 dark:border-slate-600 text-cyan-600 focus:ring-cyan-500"
                    />
                    Requires a follow-up question
                  </label>

                  {opt.hasFollowUpQuestion && opt.followUpQuestion && (
                    <FollowUpQuestionEditor
                      value={opt.followUpQuestion}
                      onChange={(fq) => updateOption(index, { followUpQuestion: fq })}
                      onRemove={() => updateOption(index, { hasFollowUpQuestion: false, followUpQuestion: null })}
                      depth={depth + 1}
                      showErrors={showErrors}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Customer will type their answer in a free-text field.
          </p>
        )}
      </div>
    </div>
  );
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
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [formData, setFormData] = useState<{
    questionText: string;
    isActive: boolean;
    displayOrder: number;
    answerType: string;
    options: EditableOption[];
  }>({
    questionText: "",
    isActive: true,
    displayOrder: nextDisplayOrder,
    answerType: "Options",
    options: [emptyOption(1, "Yes"), emptyOption(2, "No")],
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (isEditMode && question) {
      // The list view only returns the top-level shape (no nested follow-up questions) —
      // fetch the full tree so existing follow-ups can be edited, not silently dropped.
      setLoadingDetail(true);
      pharmacyQuestionsService
        .getById(question.id)
        .then((res) => {
          const full = res.data?.data ?? question;
          setFormData({
            questionText: full.questionText,
            isActive: full.isActive,
            displayOrder: full.displayOrder,
            answerType: full.answerType || "Options",
            options:
              full.options.length > 0
                ? toEditableOptions(full.options)
                : [emptyOption(1, "Yes"), emptyOption(2, "No")],
          });
        })
        .catch(() => {
          toast.error("Failed to load full question details");
          setFormData({
            questionText: question.questionText,
            isActive: question.isActive,
            displayOrder: question.displayOrder,
            answerType: question.answerType || "Options",
            options: toEditableOptions(question.options),
          });
        })
        .finally(() => setLoadingDetail(false));
    } else {
      setFormData({
        questionText: "",
        isActive: true,
        displayOrder: nextDisplayOrder,
        answerType: "Options",
        options: [emptyOption(1, "Yes"), emptyOption(2, "No")],
      });
    }
    setFormErrors({});
    setSubmitAttempted(false);
  }, [isOpen, isEditMode, question, nextDisplayOrder]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.questionText.trim()) {
      errors.questionText = "Question text is required";
    }

    if (formData.displayOrder < 1) {
      errors.displayOrder = "Display order must be at least 1";
    }

    if (formData.answerType === "Options") {
      const treeErrors: string[] = [];
      validateOptionsTree(formData.options, treeErrors, 0);
      if (treeErrors.length > 0) {
        errors.options = treeErrors[0];
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);
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
          answerType: formData.answerType,
          options: formData.answerType === "Text" ? [] : toUpdateOptions(formData.options),
        };

        const response = await pharmacyQuestionsService.update(question.id, updateData);
        toast.success(getBackendMessage(response));
      } else {
        const createData: CreatePharmacyQuestionDto = {
          questionText: formData.questionText,
          isActive: formData.isActive,
          displayOrder: formData.displayOrder,
          answerType: formData.answerType,
          options: formData.answerType === "Text" ? [] : toCreateOptions(formData.options),
        };

        const response = await pharmacyQuestionsService.create(createData);
        toast.success(getBackendMessage(response));
      }

      onClose();
      onSuccess?.();
    } catch (error: any) {
      toast.error(getBackendMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, emptyOption(formData.options.length + 1)],
    });
  };

  const removeOption = (index: number) => {
    if (formData.options.length <= 2) {
      toast.warning("At least 2 options are required");
      return;
    }
    setFormData({ ...formData, options: formData.options.filter((_, i) => i !== index) });
  };

  const updateOption = (index: number, patch: Partial<EditableOption>) => {
    const next = [...formData.options];
    next[index] = { ...next[index], ...patch };
    setFormData({ ...formData, options: next });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border border-slate-200 dark:border-violet-500/20 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-violet-500/10">
        <div className="p-4 border-b border-slate-200 dark:border-violet-500/20 bg-gradient-to-r from-slate-50 dark:from-purple-500/10 to-cyan-50 dark:to-cyan-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-gradient-to-r dark:from-purple-500 dark:to-cyan-500 flex items-center justify-center">
                {isEditMode ? <Edit className="h-6 w-6 text-violet-600 dark:text-white" /> : <Plus className="h-6 w-6 text-violet-600 dark:text-white" />}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {isEditMode ? "Edit Question" : "Create New Question"}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  {isEditMode ? "Update question details" : "Add a new pharmacy question"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-red-50 dark:hover:bg-red-500/20 border border-transparent hover:border-red-200 dark:hover:border-red-500/50 rounded-lg transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loadingDetail ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
          </div>
        ) : (
        <div className="overflow-y-auto p-4 space-y-4">
          {/* Question Text */}
          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 font-semibold mb-2">
              Question Text <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.questionText}
              onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
              placeholder={"e.g., Please confirm if any of the following statements are true?\n* Has a doctor or nurse advised you to avoid physical activity for any medical reason?\n* Have you had a heart attack or stroke within the last 6 months?"}
              rows={4}
              className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all resize-y ${
                formErrors.questionText ? "border-red-500" : "border-slate-200 dark:border-slate-600"
              }`}
            />
            <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">
              Use new lines and "*" for bullet-style statements — formatting is preserved exactly as typed.
            </p>
            {formErrors.questionText && (
              <p className="text-red-400 text-xs mt-1">{formErrors.questionText}</p>
            )}
          </div>

          {/* Answer Type Toggle */}
          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 font-semibold mb-2">
              Answer Type <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormData({ ...formData, answerType: "Options" })}
                type="button"
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  formData.answerType === "Options"
                    ? "bg-violet-50 dark:bg-violet-500/20 border-2 border-violet-200 dark:border-violet-500/50 text-violet-700 dark:text-violet-400"
                    : "bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-500"
                }`}
              >
                <List className="h-4 w-4" />
                Multiple Choice
              </button>
              <button
                onClick={() => setFormData({ ...formData, answerType: "Text" })}
                type="button"
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  formData.answerType === "Text"
                    ? "bg-cyan-50 dark:bg-cyan-500/20 border-2 border-cyan-500/50 text-cyan-700 dark:text-cyan-400"
                    : "bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-500"
                }`}
              >
                <Type className="h-4 w-4" />
                Text Answer
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Display Order */}
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-300 font-semibold mb-2">
                Display Order <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 1 })}
                className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                  formErrors.displayOrder ? "border-red-500" : "border-slate-200 dark:border-slate-600"
                }`}
              />
              {formErrors.displayOrder && (
                <p className="text-red-400 text-xs mt-1">{formErrors.displayOrder}</p>
              )}
            </div>

            {/* Active Status */}
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-300 font-semibold mb-2">Status</label>
              <button
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                type="button"
                className={`w-full px-4 py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  formData.isActive
                    ? "bg-green-50 dark:bg-green-500/10 border-2 border-green-200 dark:border-green-500/50 text-green-700 dark:text-green-400"
                    : "bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/50 text-red-700 dark:text-red-400"
                }`}
              >
                {formData.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                {formData.isActive ? "Active" : "Inactive"}
              </button>
            </div>
          </div>

          {/* Answer Options - only shown for Options type */}
          {formData.answerType === "Options" ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-slate-700 dark:text-slate-300 font-semibold">
                  Answer Options <span className="text-red-400">*</span>
                </label>

                <button
                  onClick={addOption}
                  type="button"
                  className="px-3 py-1.5 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/50 text-cyan-600 dark:text-cyan-400 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-all text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Option
                </button>
              </div>

              <div className="space-y-2">
                {formData.options.map((option, index) => (
                  <div
                    key={index}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      {/* Index */}
                      <span className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center text-sm font-bold shrink-0">
                        {index + 1}
                      </span>

                      {/* Option Text */}
                      <input
                        type="text"
                        value={option.optionText}
                        onChange={(e) => updateOption(index, { optionText: e.target.value })}
                        placeholder="Option text"
                        className={`flex-1 px-3 py-2 bg-white dark:bg-slate-800/50 border rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                          submitAttempted && !option.optionText.trim()
                            ? "border-red-500"
                            : "border-slate-200 dark:border-slate-600"
                        }`}
                      />

                      {/* Remove Option */}
                      {formData.options.length > 2 && (
                        <button
                          onClick={() => removeOption(index)}
                          type="button"
                          className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                          title="Remove Option"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Follow-up question toggle */}
                    <div className="pl-10">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={option.hasFollowUpQuestion}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            updateOption(index, {
                              hasFollowUpQuestion: checked,
                              followUpQuestion: checked ? option.followUpQuestion ?? emptyFollowUp() : null,
                            });
                          }}
                          className="rounded border-slate-300 dark:border-slate-600 text-violet-600 focus:ring-violet-500"
                        />
                        Requires a follow-up question
                      </label>

                      {option.hasFollowUpQuestion && option.followUpQuestion && (
                        <FollowUpQuestionEditor
                          value={option.followUpQuestion}
                          onChange={(fq) => updateOption(index, { followUpQuestion: fq })}
                          onRemove={() => updateOption(index, { hasFollowUpQuestion: false, followUpQuestion: null })}
                          depth={1}
                          showErrors={submitAttempted}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {formErrors.options && (
                <p className="text-red-400 text-xs mt-1">{formErrors.options}</p>
              )}
            </div>
          ) : (
            <div className="p-4 bg-cyan-50 dark:bg-cyan-500/5 border border-cyan-200 dark:border-cyan-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400">
                <Type className="h-5 w-5" />
                <span className="font-semibold">Text Answer</span>
              </div>

              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                Customers will type their answer in a free-text field. No predefined
                options needed.
              </p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              type="button"
              className="flex-1 px-4 py-3 bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-white rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all font-semibold"
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
        )}
      </div>
    </div>
  );
}
