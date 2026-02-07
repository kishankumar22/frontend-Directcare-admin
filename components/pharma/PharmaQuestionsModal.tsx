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
import { Loader2 } from "lucide-react";

interface PharmaOption {
  optionId: string;
  optionText: string;
}

interface PharmaQuestion {
  questionId: string;
  questionText: string;
  answerType: "Options" | "Text" | "Number";
  isRequired: boolean;
  displayOrder: number;
  options?: PharmaOption[];
}

export default function PharmaQuestionsModal({
  open,
  productId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  productId: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {

  const toast = useToast();

  const [questions, setQuestions] = useState<PharmaQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 🔹 FETCH QUESTIONS
  useEffect(() => {
    if (!open) return;

    const fetchQuestions = async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/Products/${productId}/pharmacy-form`
        );

        if (!res.ok) throw new Error("Failed");

        const json = await res.json();

        const sortedQuestions =
          json?.data?.questions?.sort(
            (a: PharmaQuestion, b: PharmaQuestion) =>
              a.displayOrder - b.displayOrder
          ) || [];

        setQuestions(sortedQuestions);
      } catch (error) {
        toast.error("Unable to load medical questions");
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [open, productId, toast, onClose]);

  // 🔹 VALIDATION
  const validate = () => {
    for (const q of questions) {
      if (q.isRequired && !answers[q.questionId]) {
        toast.error("Please answer all required questions");
        return false;
      }
    }
    return true;
  };

  // 🔹 SUBMIT
 const handleSubmit = async () => {
  if (!validate()) return;

  try {
    setSubmitting(true);

    const payload = {
      sessionId: crypto.randomUUID(),
      answers: questions.map((q) => {
        const value = answers[q.questionId];
        return {
          questionId: q.questionId,
          answerText:
            q.answerType === "Text" || q.answerType === "Number"
              ? String(value)
              : null,
          selectedOptionId:
            q.answerType === "Options" ? value : null,
        };
      }),
    };

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/Products/${productId}/pharmacy-form`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const json = await res.json();

    const message =
      json?.data?.message ??
      "Thank you for completing the questionnaire. Your responses have been submitted for review.";

    // ✅ USER FEEDBACK (YAHI DIKHANA HAI)
    toast.success(message);

    // ✅ parent ko sirf signal bhejna
    onSuccess(message);

  } catch (error) {
    toast.error("Failed to submit medical information");
  } finally {
    setSubmitting(false);
  }
};

  return (
  <Dialog open={open} onOpenChange={(v) => !v && onClose()}>

     <DialogContent
 className="max-w-xl max-h-[85vh] rounded-2xl p-0 flex flex-col"

        onInteractOutside={(e: Event) => e.preventDefault()}
        onEscapeKeyDown={(e: KeyboardEvent) => e.preventDefault()}
      >
       <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
  <DialogTitle className="text-xl font-semibold text-gray-900">
    Medical Information Required
  </DialogTitle>
  <p className="text-sm text-gray-600 mt-1">
    Please answer the following questions to continue with your purchase.
  </p>
</DialogHeader>


        {/* CONTENT */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
          </div>
        ) : (
       <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {questions.map((q) => (
            <div key={q.questionId} className="rounded-xl border bg-gray-50 px-4 py-4 space-y-3" >
              <label className="text-sm font-semibold text-gray-900">

                  {q.questionText}
                  {q.isRequired && (
                 <span className="text-red-500 ml-1 font-semibold">*</span>

                  )}
                </label>

                {/* OPTIONS */}
                {q.answerType === "Options" && (
                  <div className="flex flex-col gap-2">
                    {q.options?.map((opt) => (
                     <label
  key={opt.optionId}
  className={`flex items-center gap-3 px-4 py-2 rounded-lg border cursor-pointer transition
    ${
      answers[q.questionId] === opt.optionId
        ? "border-[#445D41] bg-green-50"
        : "border-gray-200 bg-white hover:border-gray-300"
    }`}
>

                      <input
  type="radio"
  className="accent-[#445D41]"
  name={q.questionId}
  checked={answers[q.questionId] === opt.optionId}
  onChange={() =>
    setAnswers((p) => ({
      ...p,
      [q.questionId]: opt.optionId,
    }))
  }
/>

                        {opt.optionText}
                      </label>
                    ))}
                  </div>
                )}

                {/* TEXT */}
                {q.answerType === "Text" && (
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#445D41]"
                    value={answers[q.questionId] ?? ""}
                    onChange={(e) =>
                      setAnswers((p) => ({
                        ...p,
                        [q.questionId]: e.target.value,
                      }))
                    }
                  />
                )}

                {/* NUMBER */}
                {q.answerType === "Number" && (
                  <input
                    type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#445D41]"
                    value={answers[q.questionId] ?? ""}
                    onChange={(e) =>
                      setAnswers((p) => ({
                        ...p,
                        [q.questionId]: Number(e.target.value),
                      }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ACTIONS */}
      <div className="px-6 py-4 border-t flex justify-end gap-3 shrink-0 bg-white">


      <Button variant="outline" onClick={onClose} className="rounded-lg">

            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || submitting}
           className="bg-[#445D41] text-white hover:bg-[#334a2c] rounded-lg px-6"

          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting
              </>
            ) : (
              "Submit & Continue"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
