"use client";

import { Dispatch, SetStateAction } from "react";
import {
  CalendarClock,
  Mail,
  Phone,
  Reply,
  Send,
  Tag,
  UserRound,
  X,
} from "lucide-react";
import { ContactItem } from "@/lib/services/contact";
import { formatDate } from "../_utils/formatUtils";

export interface ContactReplyFormState {
  reply: string;
  internalNotes: string;
}

interface ContactModalsProps {
  viewingContact: ContactItem | null;
  setViewingContact: (contact: ContactItem | null) => void;
  replyingContact: ContactItem | null;
  setReplyingContact: (contact: ContactItem | null) => void;
  replyForm: ContactReplyFormState;
  setReplyForm: Dispatch<SetStateAction<ContactReplyFormState>>;
  onReplySubmit: () => void;
  isReplying: boolean;
}

const fieldClassName =
  "w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/70 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20";

const getStatusStyles = (status?: string) => {
  const normalized = status?.toLowerCase() ?? "";

  if (
    normalized.includes("reply") ||
    normalized.includes("closed") ||
    normalized.includes("resolved")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (normalized.includes("progress") || normalized.includes("assign")) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
  }

  return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300";
};

function ModalShell({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-2 backdrop-blur-md">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 flex min-h-full w-full items-center justify-center py-2">
        {children}
      </div>
    </div>
  );
}

export default function ContactModals({
  viewingContact,
  setViewingContact,
  replyingContact,
  setReplyingContact,
  replyForm,
  setReplyForm,
  onReplySubmit,
  isReplying,
}: ContactModalsProps) {
  return (
    <>
      <ModalShell
        open={!!viewingContact}
        onClose={() => setViewingContact(null)}
      >
        {viewingContact && (
          <div className="mx-auto flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 shadow-2xl shadow-cyan-950/40">
            <div className="border-b border-slate-200 dark:border-cyan-500/20 bg-slate-50 dark:bg-transparent dark:bg-gradient-to-r dark:from-cyan-500/10 dark:to-violet-500/10 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Contact Details
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    View full enquiry details, reply, and internal notes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingContact(null)}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.95fr)]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="break-all text-lg font-semibold text-slate-900 dark:text-white">
                          {viewingContact.subject || "No subject"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {viewingContact.category || "Uncategorized"}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] ${getStatusStyles(
                          viewingContact.status
                        )}`}
                      >
                        {viewingContact.status || "New"}
                      </span>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-500">
                        Customer message
                      </p>
                      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-200">
                        {viewingContact.message || "No message provided."}
                      </p>
                    </div>
                  </div>

                  {(viewingContact.adminReply || viewingContact.repliedAt) && (
                    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 p-4">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                        <Reply className="h-4 w-4" />
                        <p className="text-sm font-semibold">Admin reply</p>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-200">
                        {viewingContact.adminReply || "Reply sent from admin panel."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span>By: {viewingContact.repliedBy || "Admin"}</span>
                        <span>At: {formatDate(viewingContact.repliedAt)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-500">
                      Contact info
                    </p>
                    <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-200">
                      <div className="flex items-center gap-3">
                        <UserRound className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                        <span className="break-all">{viewingContact.name || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                        <span className="break-all">{viewingContact.email || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                        <span>{viewingContact.phone || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Tag className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                        <span className="break-all">
                          Order: {viewingContact.orderNumber || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CalendarClock className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                        <span>{formatDate(viewingContact.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-500">
                      Internal handling
                    </p>
                    <div className="mt-4 space-y-4 text-sm text-slate-700 dark:text-slate-200">
                      <div>
                        <p className="mb-1 text-xs text-slate-500 dark:text-slate-500">Assigned to</p>
                        <p className="break-all">
                          {viewingContact.assignedTo || "Unassigned"}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-slate-500 dark:text-slate-500">Internal notes</p>
                        <p className="whitespace-pre-wrap break-words leading-6 text-slate-600 dark:text-slate-300">
                          {viewingContact.internalNotes || "No internal notes added."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </ModalShell>

      <ModalShell
        open={!!replyingContact}
        onClose={() => {
          if (!isReplying) {
            setReplyingContact(null);
          }
        }}
      >
        {replyingContact && (
          <div className="mx-auto flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 shadow-2xl shadow-indigo-950/40">
            <div className="border-b border-slate-200 dark:border-indigo-500/20 bg-slate-50 dark:bg-transparent dark:bg-gradient-to-r dark:from-indigo-500/10 dark:to-cyan-500/10 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Reply to Contact
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Send a response and store internal notes for the team.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isReplying) {
                      setReplyingContact(null);
                    }
                  }}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 custom-scrollbar">
              <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {replyingContact.name}
                </p>
                <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">
                  {replyingContact.email} | {replyingContact.subject || "No subject"}
                </p>
                <p className="mt-2 line-clamp-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {replyingContact.message}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Reply <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={4}
                  value={replyForm.reply}
                  onChange={(event) =>
                    setReplyForm((previous) => ({
                      ...previous,
                      reply: event.target.value,
                    }))
                  }
                  placeholder="Write a clear reply for the customer..."
                  className={`${fieldClassName} min-h-[130px] resize-none`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Internal notes
                </label>
                <textarea
                  rows={3}
                  value={replyForm.internalNotes}
                  onChange={(event) =>
                    setReplyForm((previous) => ({
                      ...previous,
                      internalNotes: event.target.value,
                    }))
                  }
                  placeholder="Notes visible only to the admin team..."
                  className={`${fieldClassName} min-h-[110px] resize-none`}
                />
              </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!isReplying) {
                      setReplyingContact(null);
                    }
                  }}
                  disabled={isReplying}
                  className="inline-flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onReplySubmit}
                  disabled={isReplying || !replyForm.reply.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-[#ffffff] dark:from-violet-500 dark:to-cyan-500 px-4 py-2 text-sm font-semibold transition hover:shadow-lg hover:shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isReplying ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Reply
                    </>
                  )}
                </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </ModalShell>
    </>
  );
}
