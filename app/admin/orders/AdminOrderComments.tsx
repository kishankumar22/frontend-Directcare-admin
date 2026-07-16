'use client';

import React, { useState, useEffect } from 'react';
import { AdminOrderCommentService, AdminComment } from '@/lib/services/AdminOrderComment';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/app/admin/_components/CustomToast';
import { Edit2, Trash2, MessageSquare, Loader2, Send, User, Clock, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import ConfirmDialog from '@/app/admin/_components/ConfirmDialog';

interface Props {
  orderId: string;
}

export default function AdminOrderComments({ orderId }: Props) {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await AdminOrderCommentService.getAdminComments(orderId);
      if (res?.success && res.data) {
        setComments(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load admin comments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchComments();
    }
  }, [orderId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      setIsSubmitting(true);
      const res = await AdminOrderCommentService.createAdminComment(orderId, newComment);
      if (res?.success) {
        toast.success("Comment added successfully");
        setNewComment("");
        fetchComments();
      } else {
        toast.error(res?.message || "Failed to add comment");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateComment = async (id: string) => {
    if (!editContent.trim()) return;
    try {
      const res = await AdminOrderCommentService.updateAdminComment(id, editContent);
      if (res?.success) {
        toast.success("Comment updated successfully");
        setEditingId(null);
        fetchComments();
      } else {
        toast.error(res?.message || "Failed to update comment");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update comment");
    }
  };

  const handleDeleteClick = (id: string) => {
    setCommentToDelete(id);
  };

  const confirmDelete = async () => {
    if (!commentToDelete) return;
    setIsDeleting(true);
    try {
      const res = await AdminOrderCommentService.deleteAdminComment(commentToDelete);
      if (res?.success) {
        toast.success("Comment deleted");
        fetchComments();
      } else {
        toast.error(res?.message || "Failed to delete comment");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete comment");
    } finally {
      setIsDeleting(false);
      setCommentToDelete(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
      
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-600 dark:bg-blue-500 rounded-md">
              <MessageSquare className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Comments</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Internal notes & discussions</p>
            </div>
          </div>
          {comments.length > 0 && (
            <span className="text-[11px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800">
              {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
            </span>
          )}
        </div>
      </div>

      {/* Add Comment */}
      <div className="p-3 border-b border-gray-200 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/30">
        <div className="flex items-start gap-3">
          <div className="hidden sm:flex w-7 h-7 rounded-full bg-blue-600 dark:bg-blue-500 text-white items-center justify-center text-xs font-bold flex-shrink-0">
            <User className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="w-full lg:w-[70%] xl:w-[50%] flex flex-col sm:flex-row gap-2 sm:items-start">
              <Textarea 
                placeholder="Add an internal note or comment..." 
                value={newComment} 
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[50px] max-h-[50px] flex-1 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 rounded-md resize-none text-sm text-gray-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500"
              />
            <button
  type="button"
  onClick={handleAddComment}
  disabled={!newComment.trim() || isSubmitting}
  className={`
    h-[50px]
    min-w-[190px]
    px-5
    rounded-md
    flex
    items-center
    justify-center
    gap-2
    text-sm
    font-medium
    shrink-0
    w-full
    sm:w-auto
    transition-all
    duration-200
    text-white

    ${
      !newComment.trim() || isSubmitting
        ? `
          cursor-not-allowed
          bg-slate-200
          text-white
          border border-slate-300
          

          dark:bg-slate-700
          dark:text-white
          dark:border-slate-600
        `
        : `
          bg-blue-600
          hover:bg-blue-700
          text-white

          dark:bg-blue-500
          dark:hover:bg-blue-600
          dark:text-white
        `
    }

  `}
  title='Add  order comment '
>
  {isSubmitting ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Posting...</span>
    </>
  ) : (
    <>
      <Send className="h-4 w-4" />
      <span className="whitespace-nowrap  text-white">
        Post Comment
      </span>
    </>
  )}
</button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="p-3 max-h-[350px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-500" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-6">
            <MessageSquare className="h-6 w-6 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-slate-400">No comments yet</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {comments.map((comment) => (
              <div 
                key={comment.id} 
                className={`bg-gray-50 dark:bg-slate-800/50 rounded-md p-2.5 border border-gray-200 dark:border-slate-700 transition-all ${
                  comment.isMine ? 'border-l-[3px] border-l-blue-500 dark:border-l-blue-400' : ''
                }`}
              >
                {/* Comment Header */}
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-6 h-6 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {comment.createdByName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                          {comment.createdByName || 'Unknown User'}
                        </span>
                        {comment.isMine && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-[9px] font-medium text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                            <Check className="h-2.5 w-2.5" />
                            You
                          </span>
                        )}
                        {comment.updatedAt !== comment.createdAt && (
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 italic">(edited)</span>
                        )}
                        {/* Actions */}
                        {comment.isMine && (
                          <div className="flex items-center gap-0.5 ml-1">
                            {editingId === comment.id ? (
                              <>
                                <button 
                                  onClick={() => handleUpdateComment(comment.id)} 
                                  className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-all"
                                  title="Save"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                                <button 
                                  onClick={() => setEditingId(null)} 
                                  className="p-1 text-gray-400 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-all"
                                  title="Cancel"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  onClick={() => {
                                    setEditingId(comment.id);
                                    setEditContent(comment.comment);
                                  }} 
                                  className="p-1 text-gray-400 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-all"
                                  title="Edit"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteClick(comment.id)} 
                                  className="p-1 text-gray-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comment Content */}
                {editingId === comment.id ? (
                  <Textarea 
                    value={editContent} 
                    onChange={(e) => setEditContent(e.target.value)} 
                    className="mt-1 bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 rounded-md resize-none text-sm h-14 text-gray-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500/50"
                  />
                ) : (
                  <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap pl-8">
                    {comment.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmDialog
        isOpen={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  );
}