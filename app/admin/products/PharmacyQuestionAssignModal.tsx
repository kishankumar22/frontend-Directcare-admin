"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Check, List, Type, Plus, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/app/admin/_components/CustomToast";
import {
  PharmacyQuestion,
  AssignProductPharmacyQuestionDto,
  pharmacyQuestionsService,
} from "@/lib/services/PharmacyQuestions";
import PharmacyQuestionFormModal from "@/app/admin/pharmacy-questions/PharmacyQuestionFormModal";

interface PharmacyQuestionAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string | null;
  initialSelections?: AssignProductPharmacyQuestionDto[];
  onSave: (selections: AssignProductPharmacyQuestionDto[]) => void;
}

export default function PharmacyQuestionAssignModal({
  isOpen,
  onClose,
  productId,
  initialSelections = [],
  onSave,
}: PharmacyQuestionAssignModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<PharmacyQuestion[]>([]);
  const [selections, setSelections] = useState<
    Map<string, { isRequired: boolean; displayOrder: number; answerType: string }>
  >(new Map());
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
const [searchTerm, setSearchTerm] = useState("");
const [debouncedSearch, setDebouncedSearch] = useState("");
const [isSearching, setIsSearching] = useState(false);

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchTerm);
    setIsSearching(false);
  }, 400);

  setIsSearching(true);

  return () => clearTimeout(timer);
}, [searchTerm]);

const fetchAssignedQuestions = async () => {
  try {
    const response = await pharmacyQuestionsService.getProductQuestions(productId!);

    const assigned = response.data?.data || [];

    const prefilledMap = new Map();

    assigned.forEach((item: any) => {
      prefilledMap.set(item.pharmacyQuestionId, {
        isRequired: item.isRequired,
        displayOrder: item.displayOrder,
        answerType: item.answerType,
      });
    });

    setSelections(prefilledMap);

  } catch (error) {
    console.error("Failed to fetch assigned questions");
  }
};


useEffect(() => {
  if (!isOpen) return;

  const loadData = async () => {
    await fetchQuestions();

    if (productId) {
      await fetchAssignedQuestions();
    }
  };

  loadData();
}, [isOpen]);




const filteredQuestions = useMemo(() => {
  let filtered = questions;

  // 🔎 Search filter
  if (debouncedSearch.trim()) {
    filtered = questions.filter((q) =>
      q.questionText
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase())
    );
  }

  // 🔥 Latest created first
  return [...filtered].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );
}, [questions, debouncedSearch]);




const fetchQuestions = async () => {
  try {
    setLoading(true);

    const response = await pharmacyQuestionsService.getAll({
      onlyActive: true,
    });

    setQuestions(response.data?.data || []);
  } catch {
    toast.error("Failed to load pharmacy questions");
  } finally {
    setLoading(false);
  }
};




  const toggleQuestion = (question: PharmacyQuestion) => {
    const newSelections = new Map(selections);
    if (newSelections.has(question.id)) {
      newSelections.delete(question.id);
    } else {
      newSelections.set(question.id, {
        isRequired: true,
        displayOrder: newSelections.size + 1,
        answerType: question.answerType || "Options",
      });
    }
    setSelections(newSelections);
  };

  const toggleExpand = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const updateSelection = (
    questionId: string,
    field: "isRequired" | "displayOrder",
    value: boolean | number
  ) => {
    const newSelections = new Map(selections);
    const current = newSelections.get(questionId);
    if (current) {
      newSelections.set(questionId, { ...current, [field]: value });
      setSelections(newSelections);
    }
  };

const handleSave = async () => {
  // 🚨 Prevent empty selection
  if (selections.size === 0) {
    toast.error("Please select at least one pharmacy question.");
    return;
  }

  const assignData: AssignProductPharmacyQuestionDto[] = [];

  selections.forEach((config, questionId) => {
    assignData.push({
      pharmacyQuestionId: questionId,
      answerType: config.answerType,
      isRequired: config.isRequired,
      displayOrder: config.displayOrder,
    });
  });

  if (productId) {
    try {
      setSaving(true);

      await pharmacyQuestionsService.assignProductQuestions(productId, {
        questions: assignData,
      });

      toast.success("Pharmacy questions assigned successfully");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to assign pharmacy questions"
      );
      return;
    } finally {
      setSaving(false);
    }
  }

  onSave(assignData);
  onClose();
};


  const handleQuestionCreated = () => {
    // Refresh the questions list after creating a new one
    fetchQuestions();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-violet-500/20 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-violet-500/10">
          {/* Header */}
          <div className="p-4 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center">
                  <List className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Configure Pharmacy Questions
                  </h2>
                  <p className="text-slate-400 text-sm">
                    Select questions customers must answer for this product
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

     
            {/* Search + Add New Question Row */}
<div className="px-4 pt-4">
  <div className="flex items-center justify-between gap-3">

    {/* 🔎 Search Box */}
    <div className="relative flex-1 max-w-md">
      <input
        type="search"
        placeholder="Search questions..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full pl-4 pr-10 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
      />

      {isSearching && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
        </div>
      )}
    </div>

    {/* ➕ Add New Question */}
    <button
      type="button"
      onClick={() => setShowCreateModal(true)}
      className="px-4 py-2.5 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/40 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all font-semibold flex items-center gap-2 shrink-0"
    >
      <Plus className="h-4 w-4" />
      Add New Question
    </button>

  </div>
</div>

  

          {/* Content */}
      <div className="overflow-y-auto p-4 flex-1">
  {loading ? (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-3 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
      <span className="ml-3 text-slate-400">Loading questions...</span>
    </div>
  ) : questions.length === 0 ? (
    <div className="text-center py-12 text-slate-400">
      <p className="text-lg font-semibold">
        No active pharmacy questions found
      </p>
      <p className="text-sm mt-1">
        Click "Add New Question" above to create one.
      </p>
    </div>
  ) : filteredQuestions.length === 0 ? (
    <div className="text-center py-12 text-slate-400">
      <p className="text-lg font-semibold">
        No questions found related to "{debouncedSearch}"
      </p>
    </div>
  ) : (
<div className="space-y-2">
  {filteredQuestions.map((question,index) => {
    const isSelected = selections.has(question.id);
    const config = selections.get(question.id);
    const isExpanded = expandedQuestions.has(question.id);
    const hasOptions =
      question.answerType !== "Text" &&
      question.options &&
      question.options.length > 0;

    return (
      <div
        key={question.id}
        className={`border rounded-xl p-4 transition-all ${
          isSelected
            ? "border-violet-500/50 bg-violet-500/5"
            : "border-slate-700 bg-slate-800/30 hover:border-slate-600"
        }`}
      >
        {/* Question Row */}
<div className="flex items-center gap-3">

  {/* 🔢 Index Badge (separate from checkbox) */}
  <span className="w-7 h-7 rounded-full bg-slate-700 text-xs text-slate-300 flex items-center justify-center shrink-0">
    {index + 1}
  </span>

  {/* ✅ Select Checkbox */}
  <button
    onClick={() => toggleQuestion(question)}
    type="button"
    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
      isSelected
        ? "bg-violet-500 border-violet-500"
        : "border-slate-500 hover:border-violet-400"
    }`}
  >
    {isSelected && <Check className="h-4 w-4 text-white" />}
  </button>

  {/* 📝 Question Text */}
  <div className="flex-1 min-w-0">
    <p className="text-white font-medium truncate">
      {question.questionText}
    </p>
  </div>

  {/* 🎯 Type + Expand */}
  <div className="flex items-center gap-2 shrink-0">

    {/* Type Badge */}
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
        question.answerType === "Text"
          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
          : "bg-violet-500/10 text-violet-400 border border-violet-500/30"
      }`}
    >
      {question.answerType === "Text" ? (
        <Type className="h-3 w-3" />
      ) : (
        <List className="h-3 w-3" />
      )}
      {question.answerType === "Text"
        ? "Text"
        : `${question.options?.length || 0} Opt`}
    </span>

    {/* Expand Button */}
    {hasOptions && (
      <button
        onClick={() => toggleExpand(question.id)}
        type="button"
        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
      >
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
    )}
  </div>
</div>



        {/* Options List */}
        {isExpanded && hasOptions && (
          <div className="mt-3 ml-9 space-y-1.5">
            {question.options
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((option) => (
                <div
                  key={option.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg"
                >
                  <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {option.displayOrder}
                  </span>

                  <span className="text-sm text-slate-300 flex-1">
                    {option.optionText}
                  </span>

                  {option.isDisqualifying && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded text-[10px] font-semibold">
                      <AlertCircle className="h-3 w-3" />
                      Disqualifying
                    </span>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Text Info */}
        {isExpanded && question.answerType === "Text" && (
          <div className="mt-3 ml-9 px-3 py-2 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
            <p className="text-xs text-cyan-400">
              Customer will type a free-text answer for this question.
            </p>
          </div>
        )}

        {/* Configuration When Selected */}
        {isSelected && config && (
          <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center gap-4 ml-9">
            {/* Required Toggle */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Required:</label>
              <button
                onClick={() =>
                  updateSelection(
                    question.id,
                    "isRequired",
                    !config.isRequired
                  )
                }
                type="button"
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  config.isRequired
                    ? "bg-green-500/10 border border-green-500/50 text-green-400"
                    : "bg-slate-800 border border-slate-600 text-slate-400"
                }`}
              >
                {config.isRequired ? "Yes" : "No"}
              </button>
            </div>

            {/* Display Order */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Order:</label>
              <input
                type="number"
                min="1"
                value={config.displayOrder}
                onChange={(e) =>
                  updateSelection(
                    question.id,
                    "displayOrder",
                    parseInt(e.target.value) || 1
                  )
                }
                className="w-16 px-2 py-1 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-xs text-center focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
        )}
      </div>
    );
  })}
</div>

  )}
</div>


          {/* Footer */}
          <div className="p-4 border-t border-violet-500/20 bg-slate-900/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                {selections.size} question{selections.size !== 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  type="button"
                  className="px-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
  onClick={handleSave}
  type="button"
  disabled={saving || selections.size === 0}
  className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 
  hover:from-violet-700 hover:to-cyan-700 text-white rounded-xl 
  transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
>

                  {saving ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </div>
                  ) : (
                    "Save Questions"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Question Modal (layered on top) */}
      <PharmacyQuestionFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleQuestionCreated}
        nextDisplayOrder={questions.length + 1}
      />
    </>
  );
}
