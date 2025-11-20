"use client";

import { useState, useEffect, FormEvent } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://testapi.knowledgemarkg.com";

interface CommentFormProps {
  blogPostId: string;
}

export default function CommentForm({ blogPostId }: CommentFormProps) {
  // Fields
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [commentText, setCommentText] = useState("");

  // Validation errors per field
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    comment: "",
    captcha: "",
  });

  // Captcha state
  const [challenge, setChallenge] = useState("");
  const [solution, setSolution] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");

  // Form messages
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    generateChallenge();
  }, []);

  function generateChallenge() {
    const a = Math.floor(Math.random() * 10) + 5;
    const b = Math.floor(Math.random() * 10) + 3;
    const c = Math.floor(Math.random() * 5) + 2;

    const exp = `(${a} × ${b}) - ${c}`;
    const ans = a * b - c;

    setChallenge(exp);
    setSolution(ans);
    setUserAnswer("");
  }

  function validateEmail(email: string) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.trim());
  }

  async function submitHandler(e: FormEvent) {
    e.preventDefault();

    setSuccessMsg("");
    setErrorMsg("");

    const newErrors = { name: "", email: "", comment: "", captcha: "" };

    // VALIDATION RULES
    if (!authorName.trim()) newErrors.name = "Name is required.";
    if (!authorEmail.trim()) {
      newErrors.email = "Email is required.";
    } else if (!validateEmail(authorEmail)) {
      newErrors.email = "Enter a valid email address.";
    }
    if (!commentText.trim()) newErrors.comment = "Comment cannot be empty.";

    if (Number(userAnswer) !== solution) {
      newErrors.captcha = "Incorrect answer. Please try again.";
    }

    // If validation fails → stop
    if (
      newErrors.name ||
      newErrors.email ||
      newErrors.comment ||
      newErrors.captcha
    ) {
      setErrors(newErrors);
      if (newErrors.captcha) generateChallenge();
      return;
    }

    // Clear previous errors
    setErrors({ name: "", email: "", comment: "", captcha: "" });

    const payload = {
      commentText,
      authorName,
      authorEmail,
      authorIpAddress: "0.0.0.0",
      userId: "",
      parentCommentId: null,
      blogPostId,
    };

    const res = await fetch(`${API_BASE}/api/BlogComments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setErrorMsg("Failed to submit comment. Please try again.");
      return;
    }

    // Refresh comments list
    window.dispatchEvent(new Event("comment-added"));

    // Success UI
    setSuccessMsg("Your comment has been submitted! Pending approval.");

    // Reset fields
    setAuthorName("");
    setAuthorEmail("");
    setCommentText("");
    setUserAnswer("");

    generateChallenge();

    setTimeout(() => setSuccessMsg(""), 4000);
  }

  return (
    <form
      onSubmit={submitHandler}
      className="p-4 border rounded-xl bg-gray-50 space-y-4"
    >
      <h3 className="text-lg font-semibold mb-4">Leave a Comment</h3>

      {/* GLOBAL ERROR */}
      {errorMsg && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm border border-red-300">
          {errorMsg}
        </div>
      )}

     
      {/* NAME */}
      <div>
        <label className="text-sm font-medium">Name</label>
        <input
          className="w-full border p-2 rounded"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
        />
        {errors.name && (
          <p className="text-red-600 text-xs mt-1">{errors.name}</p>
        )}
      </div>

      {/* EMAIL */}
      <div>
        <label className="text-sm font-medium">Email</label>
       <input
  type="email"
  className="w-full border p-2 rounded"
  value={authorEmail}
  onChange={(e) => {
    const value = e.target.value;
    setAuthorEmail(value);

    if (!value.trim()) {
      setErrors((prev) => ({ ...prev, email: "Email is required." }));
    } else if (!validateEmail(value)) {
      setErrors((prev) => ({ ...prev, email: "Please enter a valid email address." }));
    } else {
      setErrors((prev) => ({ ...prev, email: "" }));
    }
  }}
/>

{errors.email && (
  <p className="text-red-600 text-xs mt-1">{errors.email}</p>
)}

      </div>

      {/* COMMENT */}
      <div>
        <label className="text-sm font-medium">Comment</label>
        <textarea
          className="w-full border p-2 rounded h-28"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
        />
        {errors.comment && (
          <p className="text-red-600 text-xs mt-1">{errors.comment}</p>
        )}
      </div>

      {/* CAPTCHA */}
      <div>
        <label className="text-sm font-medium">Solve to verify</label>
        <div className="font-semibold text-lg mb-2">{challenge}</div>

        <input
          className="w-full border p-2 rounded"
          placeholder="Enter answer"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
        />
        {errors.captcha && (
          <p className="text-red-600 text-xs mt-1">{errors.captcha}</p>
        )}
      </div>

      {/* BUTTON */}
      <button
        type="submit"
        className="bg-green-700 text-white px-4 py-2 rounded"
      >
        Submit Comment
      </button>
       {/* SUCCESS */}
      {successMsg && (
        <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm border border-green-300">
          {successMsg}
        </div>
      )}

    </form>
  );
}
