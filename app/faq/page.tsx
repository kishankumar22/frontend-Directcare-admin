"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Who is Direct Care?",
    answer:
      "Direct Care is an online platform offering a wide range of healthcare and wellness products with reliable delivery services.",
  },
  {
    question: "What is the best way to get in touch with your Customer Care team?",
    answer:
      "You can contact our customer support via phone or email. Our team is always ready to assist you.",
  },
  {
    question: "What are the steps to place an order with Direct Care?",
    answer:
      "Browse products, add them to your cart, proceed to checkout, and complete your payment securely.",
  },
  {
    question: "How can I keep track of my order's status?",
    answer:
      "Once your order is dispatched, you will receive a tracking link via email.",
  },
  {
    question: "What is the usual time frame for refund processing?",
    answer:
      "Refunds are usually processed within 3–4 working days after inspection.",
  },
  {
    question: "Which types of payment do you accept?",
    answer:
      "We accept major payment methods including debit/credit cards and online payment options.",
  },
  {
    question: "What should I do to qualify for free delivery?",
    answer:
      "Orders above £35 qualify for free delivery.",
  },
  {
    question: "How can I return my purchase?",
    answer:
      "You can return items within 30 days by contacting our support team and following the return process.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="bg-gray-50 min-h-screen">

      {/* 🔥 HERO */}
      <div className="bg-[#445D41] text-white py-3 text-center">
        <h1 className="text-3xl md:text-5xl font-bold">
          Frequently Asked Questions
        </h1>
        <p className="mt-3 text-sm md:text-lg opacity-90">
          Quick answers to common queries
        </p>
      </div>

      {/* 🔥 FAQ LIST */}
      <div className="max-w-4xl mx-auto px-4 py-12">

        <div className="bg-white rounded-xl border shadow-sm divide-y">

          {faqs.map((faq, index) => (
            <div key={index}>

              {/* QUESTION */}
              <button
                onClick={() => toggle(index)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition"
              >
                <span className="text-sm md:text-base font-medium text-gray-900">
                  {faq.question}
                </span>

                {openIndex === index ? (
                  <ChevronUp className="text-[#445D41]" size={18} />
                ) : (
                  <ChevronDown className="text-[#445D41]" size={18} />
                )}
              </button>

              {/* ANSWER */}
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index
                    ? "max-h-40 opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
                  {faq.answer}
                </div>
              </div>

            </div>
          ))}

        </div>

      </div>
    </div>
  );
}