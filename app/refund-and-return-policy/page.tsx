"use client";

import { RefreshCw, AlertCircle, PackageCheck, Mail } from "lucide-react";

export default function RefundPage() {
  return (
    <div className="bg-gray-50 min-h-screen">

      {/* HERO */}
      <div className="bg-[#445D41] text-white py-3 px-4 text-center">
        <h1 className="text-xl md:text-3xl font-bold">
          Refund and Returns Policy
        </h1>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* OVERVIEW */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Overview</h2>
          <p className="text-sm black leading-relaxed">
            We always strive for your highest possible satisfaction, and we hope the product you ordered at Direct Care is what you were expecting. In case you have changed your mind about keeping your Direct Care purchase, please return the item(s) to us in an unused condition, within 30 working days of receiving it. We will process the exchange or refund, as long as the item meets our terms and conditions explained in this policy.
          </p>

          <p className="text-sm black mt-3">
            Customers must understand that the returned product should not be damaged or show any signs of wear, and also it should be in its original packing with manufacturer labels still attached. It is important to know that a refund will not be processed if the returned product/item is damaged, washed, or shows any signs of frequent use, the refund will not be processed.
          </p>
        </div>

        {/* NON RETURNABLE */}
        <div className="bg-red-50 border border-red-200 p-6 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="text-red-600" />
            <h2 className="text-lg font-semibold text-red-700">
              Please Note
            </h2>
          </div>

          <p className="text-sm text-red-700 mb-3">
            Direct Care is unable to accept returns for items below unless they are damaged or faulty:
          </p>

          <ul className="list-disc pl-5 text-sm text-red-700 space-y-1">
            <li>Perishable items.</li>
            <li>Baby Milks</li>
            <li>Mixed goods post-delivery that cannot be separated</li>
            <li>Custom-made or personalised items</li>
            <li>Items with broken or removed protective seals (for health or hygiene reasons)</li>
          </ul>

          <p className="text-xs text-red-600 mt-3">
            Remember, this does not affect your statutory rights.
          </p>
        </div>

        {/* REFUND PROCESS */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="text-[#445D41]" />
            <h2 className="text-lg font-semibold">Refund Process</h2>
          </div>

          <p className="text-sm black">
            Once the returned product/item is back in our warehouse and passed the inspection process, your refunds will automatically be processed.
          </p>
        </div>

        {/* CONTACT + RETURN PROCESS */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-lg font-semibold mb-3">
            How to Contact Us When Returning Your Product/Item?
          </h2>

          <p className="text-sm black mb-3">
            Our customer service team is available between 8am to 8pm to assist you, so feel free to call<strong> +441214616835 or email customersupport@direct-care.co.uk.</strong> If you choose to reach out through email, you are advised to provide all the necessary details of your return request, including:
          </p>

          <ul className="list-disc pl-5 text-sm black space-y-1">
            <li>First and last name</li>
            <li>Order Date</li>
            <li>Order number</li>
            <li>Date of delivery</li>
            <li>Address (including postcode)</li>
            <li>Telephone number</li>
            <li>Reason for refund</li>
          </ul>

          <p className="text-sm black mt-3">
            As soon as you notify us that you want to return the product/item(s), a return label will be created and sent to you. You will be requested to send the parcel to our warehouse at the address below and within 30 days of your notice:
          </p>
        </div>

        {/* PHARMACY MEDICINES POLICY */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-[#445D41] text-white px-6 py-4">
            <h2 className="text-base md:text-lg font-bold">Returns &amp; Complaints Policy – Pharmacy Medicines Only</h2>
            <p className="text-green-200 text-xs mt-1">Direct Care Ltd – Online Pharmacy &nbsp;|&nbsp; Last Updated: June 2026</p>
          </div>

          <div className="px-6 py-5 space-y-6">

            {/* 1. Introduction */}
            <div>
              <SectionHeading number="1" title="Introduction" />
              <p className="text-sm text-gray-700 leading-relaxed mt-3">
                This policy explains how returns, refunds, and complaints are handled for <strong>Pharmacy (P) medicines</strong> purchased from Direct Care Ltd through our online pharmacy service.
              </p>
              <p className="text-sm text-gray-700 leading-relaxed mt-2">
                We operate as an online pharmacy supplying Pharmacy medicines (P medicines) only.
              </p>
            </div>

            {/* 2. Medicines Return Policy */}
            <div>
              <SectionHeading number="2" title="Medicines Return Policy" />

              <div className="mt-3 space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-red-700 mb-2">2.1 Pharmacy (P) Medicines</h3>
                  <p className="text-xs text-gray-600 mb-2 italic">For safety, hygiene, and regulatory reasons:</p>
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 font-bold">✕</span>
                      All Pharmacy medicines (P medicines) supplied once dispensed and dispatched <strong>cannot be returned, refunded, or reused</strong>, even if the packaging is unopened.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 font-bold">✕</span>
                      Medicines are regulated healthcare products and cannot be reintroduced into supply once they leave pharmacy control.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 font-bold">✕</span>
                      This policy is in line with UK pharmacy safety standards.
                    </li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-[#445D41] mb-3">2.2 Exceptions – When We May Offer a Refund or Replacement</h3>
                  <p className="text-sm text-gray-700 mb-3">A refund or replacement may only be provided in the following cases:</p>
                  <ul className="text-sm text-gray-700 space-y-2">
                    {[
                      "The incorrect medicine was supplied due to our error",
                      "The medicine was damaged during delivery",
                      "The order was cancelled before dispensing and dispatch",
                      "The item supplied is incorrect compared to what was ordered",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-[#445D41] mt-0.5 font-bold">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3 font-medium">
                    In such cases, you must contact us immediately.
                  </p>
                </div>

                <div className="bg-gray-50 border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">2.3 Unwanted Medicines</h3>
                  <p className="text-sm text-gray-700">
                    For patient safety reasons, we <strong>cannot accept returns of unwanted medicines</strong>, even if they are unopened and unused.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Refund Policy */}
            <div>
              <SectionHeading number="3" title="Refund Policy" />
              <p className="text-sm text-gray-700 mt-3 mb-3">Where a refund is approved:</p>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { label: "Payment Method", desc: "Refunds issued to the original payment method" },
                  { label: "Processing Time", desc: "5–10 working days depending on your bank" },
                  { label: "Delivery Charges", desc: "Non-refundable unless the error is on our side" },
                ].map((item) => (
                  <div key={item.label} className="bg-white border rounded-xl p-4 shadow-sm text-center">
                    <p className="text-sm font-semibold text-[#445D41] mb-1">{item.label}</p>
                    <p className="text-xs text-gray-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Delivery Issues */}
            <div>
              <SectionHeading number="4" title="Delivery Issues" />
              <div className="mt-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl p-4 text-sm text-gray-700">
                If your order is delayed, lost, or arrives damaged, please contact us within{" "}
                <strong>48 hours</strong> of the expected delivery date. We will investigate the issue with our
                delivery provider and take appropriate action.
              </div>
            </div>

            {/* 5. Complaints Procedure */}
            <div>
              <SectionHeading number="5" title="Complaints Procedure" />
              <p className="text-sm text-gray-700 mt-3">
                We aim to provide a safe, professional, and high-quality pharmacy service. If you are not satisfied with our service, you may make a complaint.
              </p>

              <div className="mt-4 space-y-4">
                <div className="bg-white border rounded-xl p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">5.1 How to Make a Complaint</h3>
                  <p className="text-sm text-gray-700 mb-3">You can contact us via:</p>
                  <div className="space-y-2 text-sm text-gray-700 mb-4">
                    <p className="flex items-center gap-2">
                      <Mail size={15} className="text-[#445D41]" />
                      Email:{" "}
                      <a href="mailto:customersupport@direct-care.co.uk" className="text-[#445D41] underline">
                        customersupport@direct-care.co.uk
                      </a>
                    </p>
                    <p className="flex items-center gap-2">
                      <PackageCheck size={15} className="text-[#445D41]" />
                      Website Contact Form
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">Please include:</p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {["Full name", "Order number", "Details of the issue"].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#445D41] rounded-full flex-shrink-0"></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white border rounded-xl p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">5.2 Complaint Handling Process</h3>
                  <div className="space-y-3">
                    {[
                      { step: "1", text: "We will acknowledge your complaint within 2 working days" },
                      { step: "2", text: "A full investigation will be carried out by a senior member of staff or pharmacist" },
                      { step: "3", text: "We aim to respond within 10 working days" },
                      { step: "4", text: "If further time is required, we will inform you and provide updates" },
                    ].map((item) => (
                      <div key={item.step} className="flex items-start gap-3">
                        <span className="w-6 h-6 bg-[#445D41] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {item.step}
                        </span>
                        <p className="text-sm text-gray-700 pt-0.5">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Escalation */}
            <div>
              <SectionHeading number="6" title="Escalation" />
              <p className="text-sm text-gray-700 mt-3 mb-3">
                If you are not satisfied with our response, you may escalate your complaint to:
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
                  <p className="font-semibold text-blue-700 mb-1">General Pharmaceutical Council (GPhC)</p>
                  <a href="https://www.pharmacyregulation.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">
                    www.pharmacyregulation.org
                  </a>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm">
                  <p className="font-semibold text-purple-700 mb-1">Information Commissioner's Office (ICO)</p>
                  <p className="text-xs text-gray-500 mb-1">For data-related complaints</p>
                  <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-purple-600 underline text-xs">
                    ico.org.uk
                  </a>
                </div>
              </div>
            </div>

            {/* 7. Patient Safety */}
            <div>
              <SectionHeading number="7" title="Patient Safety Statement" />
              <div className="mt-3 bg-[#445D41] text-white rounded-xl px-5 py-4 text-sm leading-relaxed">
                Patient safety is our highest priority. We reserve the right to refuse supply of any medicine where it is clinically or operationally appropriate to do so.
              </div>
            </div>

            {/* 8. Contact */}
            <div>
              <SectionHeading number="8" title="Contact Details" />
              <div className="mt-3 bg-white border rounded-xl p-5 shadow-sm text-sm text-gray-700 space-y-1">
                <p className="font-semibold text-[#445D41] text-base">Direct Care Ltd</p>
                <p className="flex items-center gap-2">
                  <Mail size={14} className="text-[#445D41]" />
                  <a href="mailto:customersupport@direct-care.co.uk" className="text-[#445D41] underline">
                    customersupport@direct-care.co.uk
                  </a>
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* ADDRESS */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <p className="text-sm black">
            Direct Care Warehouse address:<strong> Spacebox Business Park Unit 38A, Plume Street, B6 7RT, Birmingham, United Kingdom.</strong>
          </p>

          <p className="text-sm black mt-3">
            Upon receiving the returned product/item back to our warehouse and conducting the inspection process, the total purchase price will be refunded to your original payment option. Normally, the refund process will take up to 3-4 working days, and this may depend on the bank’s handling time.
          </p>
        </div>

        {/* EXCHANGE */}
        <div className="bg-green-50 border border-green-200 p-6 rounded-xl">
          <h2 className="text-lg font-semibold text-green-700 mb-2">
            An Exchange Instead Of A Refund
          </h2>

          <p className="text-sm text-green-700">
            At Direct Care, we do offer exchange facilities on products/items that are quality for exchange. If you are returning your items, keep in mind that we will collect your unwanted item in its original packaging when we deliver the new one, this means NO delivery charges for your exchanged product.
          </p>
        </div>

        {/* CONTACT */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-lg font-semibold mb-3">
            Contact Us
          </h2>

          <div className="space-y-2 text-sm black">
            Call our customer service team at <strong>+441214616835 or email customersupport@direct-care.co.uk.</strong> for any questions about our refund and return policy.
          </div>
        </div>

      </div>
    </div>
  );
}

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 border-b pb-2">
      <span className="w-7 h-7 bg-[#445D41] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
        {number}
      </span>
      <h3 className="text-sm md:text-base font-semibold text-gray-800">{title}</h3>
    </div>
  );
}