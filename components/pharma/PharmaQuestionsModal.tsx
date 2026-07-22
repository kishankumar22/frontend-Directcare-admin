"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast/CustomToast";
import { getPharmaSessionId } from "@/app/lib/pharmaSession";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2, CornerDownRight } from "lucide-react";

// A follow-up question nests recursively under the option that triggers it — itself Multiple
// Choice or Text, and its own options can carry a further follow-up, to any depth.
interface PharmaOption {
  optionId: string;
  optionText: string;
  hasFollowUpQuestion?: boolean;
  followUpQuestion?: PharmaQuestion | null;
}

interface PharmaQuestion {
  questionId: string;
  questionText: string;
  answerType: "Options" | "Text" | "Number";
  isRequired: boolean;
  displayOrder: number;
  options?: PharmaOption[];
}

interface ExistingResponse {
  questionId: string;
  answerText: string | null;
  selectedOptionId: string | null;
}

/// Recursively checks that `q`, and — if the selected option reveals one — its follow-up chain,
/// all have an answer.
function isQuestionAnswered(q: PharmaQuestion, answers: Record<string, any>): boolean {
  if (!q.isRequired) return true;

  const val = answers[q.questionId];

  if (q.answerType === "Options") {
    if (!val) return false;
    const selectedOpt = q.options?.find((o) => o.optionId === val);
    if (selectedOpt?.hasFollowUpQuestion && selectedOpt.followUpQuestion) {
      return isQuestionAnswered(selectedOpt.followUpQuestion, answers);
    }
    return true;
  }

  return val && String(val).trim().length > 0;
}

/// Recursively collects one response entry per answered question down the chain the customer
/// actually walked (top-level answer, then its follow-up if one was revealed and answered, etc).
function collectAnswers(q: PharmaQuestion, answers: Record<string, any>, out: any[]) {
  const val = answers[q.questionId];
  if (val === undefined || val === null || String(val).trim() === "") return;

  if (q.answerType === "Options") {
    out.push({ questionId: q.questionId, selectedOptionId: val, answerText: null });
    const selectedOpt = q.options?.find((o) => o.optionId === val);
    if (selectedOpt?.hasFollowUpQuestion && selectedOpt.followUpQuestion) {
      collectAnswers(selectedOpt.followUpQuestion, answers, out);
    }
  } else {
    out.push({ questionId: q.questionId, selectedOptionId: null, answerText: String(val) });
  }
}

/// Renders one question field (options or free text) and, once an option revealing a follow-up
/// is selected, recursively renders that follow-up question beneath it.
function QuestionField({
  question,
  label,
  depth,
  answers,
  setAnswers,
}: {
  question: PharmaQuestion;
  label: string;
  depth: number;
  answers: Record<string, any>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}) {
  const selectedOptId = answers[question.questionId];
  const selectedOpt = question.options?.find((o) => o.optionId === selectedOptId);

  const body = (
    <div
      className={
        depth === 0
          ? "bg-white border rounded-lg p-3 shadow-sm space-y-2"
          : "bg-white border border-[#445D41]/20 rounded-lg p-3 space-y-2"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <label className="text-xs md:text-sm font-semibold text-gray-800 flex items-start gap-1.5">
          {depth > 0 && <CornerDownRight className="h-3.5 w-3.5 text-[#445D41] shrink-0 mt-0.5" />}
          <span className="whitespace-pre-line">
            {label}
            {question.questionText}
          </span>
        </label>

        {question.isRequired && (
          <span className="flex items-center gap-1 text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium shrink-0">
            <AlertCircle className="h-3 w-3" />
            Required
          </span>
        )}
      </div>

      {question.answerType === "Options" && (
        <div className="flex flex-wrap gap-2">
          {question.options?.map((opt) => {
            const selected = answers[question.questionId] === opt.optionId;

            return (
              <button
                key={opt.optionId}
                type="button"
                onClick={() => {
                  setAnswers((prev) => ({ ...prev, [question.questionId]: opt.optionId }));
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5
                  ${
                    selected
                      ? "bg-[#445D41] text-white border-[#445D41] shadow"
                      : "bg-white text-gray-700 border-gray-300 hover:border-[#445D41]"
                  }
                `}
              >
                {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                {opt.optionText}
              </button>
            );
          })}
        </div>
      )}

      {question.answerType !== "Options" && (
        <textarea
          rows={depth === 0 ? 3 : 2}
          value={answers[question.questionId] ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            setAnswers((prev) => ({ ...prev, [question.questionId]: val }));
          }}
          placeholder="Type your answer here..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs md:text-sm focus:ring-2 focus:ring-[#445D41]/30 focus:border-[#445D41] outline-none resize-y transition-all"
        />
      )}
    </div>
  );

  const followUp = selectedOpt?.hasFollowUpQuestion ? selectedOpt.followUpQuestion : null;

  return (
    <div>
      {body}
      {followUp && (
        <div className="mt-2 pl-3 border-l-2 border-[#445D41]/30">
          <QuestionField
            question={followUp}
            label=""
            depth={depth + 1}
            answers={answers}
            setAnswers={setAnswers}
          />
        </div>
      )}
    </div>
  );
}

export default function PharmaQuestionsModal({
  open,
  productId,
  mode = "add",
  onClose,
  onSuccess,
}: {
  open: boolean;
  productId: string;
  mode?: "add" | "edit";
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const toast = useToast();
  const { isAuthenticated } = useAuth();

  const [questions, setQuestions] = useState<PharmaQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // ✅ Check required answers (recursively, down any answered follow-up chain) before allowing submit
  const isFormValid = questions.every((q) => isQuestionAnswered(q, answers));

  // 🔥 LOAD QUESTIONS + CHECK EXISTING RESPONSES
  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      try {
        setLoading(true);

        // ✅ Safe Headers Creation
        const headers: HeadersInit = {};

        if (isAuthenticated) {
          const token = localStorage.getItem("accessToken");
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }
        }

        // 1️⃣ GET QUESTIONS
        const formRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}/pharmacy-form`,
          { headers }
        );

        const formJson = await formRes.json();
        const qs: PharmaQuestion[] = formJson?.data?.questions || [];

        const sortedQs = qs.sort((a, b) => a.displayOrder - b.displayOrder);

        setQuestions(sortedQs);

        // If no questions → allow cart directly
        if (sortedQs.length === 0) {
          onSuccess("No medical questions required.");
          return;
        }

        // 2️⃣ CHECK EXISTING RESPONSES (ONLY FOR EDIT MODE)
        if (mode === "edit") {
          const sessionId = isAuthenticated ? null : getPharmaSessionId();

          const query = isAuthenticated || !sessionId ? "" : `?sessionId=${sessionId}`;

          const respRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}/pharmacy-responses${query}`,
            { headers }
          );

          const respJson = await respRes.json();
          const existing: ExistingResponse[] = respJson?.data || [];

          if (existing.length > 0) {
            // Every question in the chain — top-level or any nested follow-up — has its own
            // response row keyed by its own questionId, so a flat map covers the whole tree.
            const prefilled: Record<string, any> = {};
            existing.forEach((r) => {
              prefilled[r.questionId] = r.selectedOptionId ?? r.answerText ?? "";
            });

            setAnswers(prefilled);
            setIsEditMode(true);
          } else {
            setAnswers({});
            setIsEditMode(false);
          }
        } else {
          // 🔥 ADD TO CART MODE → always fresh form
          setAnswers({});
          setIsEditMode(false);
        }
      } catch (err) {
        toast.error("Unable to load medical form");
        onClose();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, productId, mode, isAuthenticated, toast, onClose, onSuccess]);

  // 🔥 SUBMIT / UPDATE
  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const requestHeaders: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (isAuthenticated) {
        const token = localStorage.getItem("accessToken");
        if (token) {
          requestHeaders["Authorization"] = `Bearer ${token}`;
        }
      }

      const sessionId = isAuthenticated ? null : getPharmaSessionId();

      const collected: any[] = [];
      questions.forEach((q) => collectAnswers(q, answers, collected));

      const payload = { sessionId, answers: collected };
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}/pharmacy-form`,
        {
          method,
          headers: requestHeaders,
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();

      if (!json?.data?.success) {
        // backend validation errors array
        if (json?.data?.errors && Array.isArray(json.data.errors)) {
          json.data.errors.forEach((err: string) => {
            toast.error(err);
          });
        } else {
          toast.error(json?.data?.message || "Validation failed. Please check your answers.");
        }
        return;
      }

      toast.success(json?.data?.message);
      onSuccess(json?.data?.message);
    } catch (err) {
      toast.error("Failed to submit medical information");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[calc(100%-0.5rem)] max-w-3xl max-h-[80vh] rounded-xl p-0 flex flex-col overflow-hidden">
        {/* HEADER */}
        <DialogHeader className="px-3 pt-3 pb-2 border-b bg-gradient-to-r from-[#445D41]/5 to-transparent shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-[#445D41]/10 p-1.5 rounded-lg shrink-0">
              <ShieldCheck className="h-5 w-5 text-[#445D41]" />
            </div>
            <div>
              <DialogTitle className="text-sm md:text-base font-semibold text-gray-900 leading-tight">
                Medical Information Required
              </DialogTitle>
              <p className="text-[11px] md:text-xs text-gray-500 mt-0.5">
                P Medicines are sold under pharmacist Supervision. Please answer the following questions to continue safely.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* BODY */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#445D41]" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50">
            {questions.map((q, index) => (
              <QuestionField
                key={q.questionId}
                question={q}
                label={`${index + 1}. `}
                depth={0}
                answers={answers}
                setAnswers={setAnswers}
              />
            ))}
          </div>
        )}

        {/* FOOTER */}
        <div className="px-3 py-2 border-t bg-white flex flex-col-reverse md:flex-row md:justify-end items-stretch md:items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-lg flex items-center justify-center gap-2 w-full md:w-auto h-8 text-xs"
          >
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !isFormValid}
            className="bg-[#445D41] hover:bg-black text-white rounded-lg px-5 flex items-center justify-center gap-2 w-full md:w-auto h-8 text-xs"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitting
              ? "Submitting..."
              : !isFormValid
              ? "Answer required questions"
              : isEditMode
              ? "Update Answers"
              : "Submit & Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
