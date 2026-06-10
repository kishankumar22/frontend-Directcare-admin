"use client";

export default function GDPRPrivacyNoticePage() {
  return (
    <div className="bg-gray-50 min-h-screen">

      {/* HERO */}
      <div className="bg-[#445D41] text-white py-8 text-center px-4">
        <p className="text-sm uppercase tracking-widest text-green-200 mb-2">Legal &amp; Compliance</p>
        <h1 className="text-2xl md:text-4xl font-bold mb-2">Privacy Notice (UK GDPR)</h1>
        <p className="text-green-200 text-sm mt-2">Direct Care Ltd &nbsp;|&nbsp; Last Updated: June 2026</p>
      </div>

      {/* QUICK NAV BADGES */}
      <div className="bg-[#3a4f38] text-white py-2 px-2">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-2 justify-center text-xs">
          {[
            "Introduction", "Data We Collect", "Why We Collect",
            "Online Consultations", "Lawful Basis", "Data Sharing",
            "Data Security", "Retention", "Your Rights", "Cookies", "Contact",
          ].map((item) => (
            <span key={item} className="bg-white/10 hover:bg-white/20 rounded-full px-3 py-1 cursor-default">
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">

        {/* 1. INTRODUCTION */}
        <Section number="1" title="Introduction">
          <p className="text-sm text-gray-700 leading-relaxed">
            Direct Care Ltd (<strong>"we", "us", "our"</strong>) is committed to protecting your personal data and privacy.
            This Privacy Notice explains how we collect, use, and protect your personal information when you use our
            website and pharmacy services, including online consultations and medicine orders.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed mt-3">
            We process all personal and health data in accordance with <strong>UK GDPR</strong> and the{" "}
            <strong>Data Protection Act 2018</strong>.
          </p>
        </Section>

        {/* 2. DATA WE COLLECT */}
        <Section number="2" title="Data We Collect">
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            We may collect and process the following information:
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#445D41] mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-[#445D41] text-white rounded-full flex items-center justify-center text-xs">P</span>
                Personal Data
              </h3>
              <ul className="text-sm text-gray-700 space-y-1.5 list-none">
                {[
                  "Full name",
                  "Address",
                  "Email address",
                  "Phone number",
                  "Date of birth",
                  "Payment details (processed securely via third-party providers)",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-[#445D41] mt-0.5">&#10003;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">H</span>
                Health Data
                <span className="text-xs font-normal bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Special Category</span>
              </h3>
              <ul className="text-sm text-gray-700 space-y-1.5 list-none">
                {[
                  "Medical history",
                  "Symptoms and health conditions",
                  "Allergies",
                  "Current medications",
                  "Consultation questionnaire responses",
                  "Prescription details",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">&#10003;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* 3. WHY WE COLLECT */}
        <Section number="3" title="Why We Collect Your Data">
          <p className="text-sm text-gray-700 leading-relaxed mb-3">We collect your data to:</p>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm text-gray-700">
            {[
              "Provide safe pharmacy services",
              "Assess suitability of medicines",
              "Process online consultations",
              "Dispense and supply medicines safely",
              "Communicate with you regarding your order",
              "Process payments and prevent fraud",
              "Comply with legal and regulatory obligations",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 bg-gray-50 border rounded-lg px-3 py-2">
                <span className="text-[#445D41] font-bold mt-0.5">&#8250;</span>
                {item}
              </li>
            ))}
          </ul>
        </Section>



        {/* 5. LAWFUL BASIS */}
        <Section number="4" title="Lawful Basis for Processing">
          <p className="text-sm text-gray-700 mb-4">We process your personal and health data under UK GDPR:</p>
          <div className="space-y-3">
            {[
              { article: "Article 6(1)(c)", label: "Legal Obligation", color: "bg-purple-50 border-purple-200 text-purple-700" },
              { article: "Article 6(1)(e)", label: "Public Task / Healthcare Provision", color: "bg-teal-50 border-teal-200 text-teal-700" },
              { article: "Article 9(2)(h)", label: "Provision of Health or Social Care", color: "bg-green-50 border-green-200 text-green-700" },
            ].map((item) => (
              <div key={item.article} className={`flex items-center gap-4 border rounded-xl px-5 py-3 ${item.color}`}>
                <span className="font-mono font-semibold text-sm whitespace-nowrap">{item.article}</span>
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* 6. DATA SHARING */}
        <Section number="5" title="Data Sharing">
          <p className="text-sm text-gray-700 mb-4">We may share your data only when necessary with:</p>
          <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-700">
            {[
              "Registered pharmacists and healthcare professionals",
              "Delivery and logistics providers",
              "Payment processors",
              "Regulatory bodies (GPhC, MHRA, NHS or legal authorities where required)",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 bg-white border rounded-xl px-4 py-3 shadow-sm">
                <span className="text-[#445D41] font-bold text-base mt-0.5">&#9632;</span>
                {item}
              </div>
            ))}
          </div>
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm font-semibold text-red-700">
            We do <span className="underline">not</span> sell your personal data.
          </div>
        </Section>

        {/* 7. DATA SECURITY */}
        <Section number="6" title="Data Security">
          <p className="text-sm text-gray-700 leading-relaxed">
            We use appropriate technical and organisational measures to protect your data, including:
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            {["Secure servers", "Encryption", "Access control", "Restricted staff permissions"].map((item) => (
              <span key={item} className="bg-[#445D41] text-white text-xs font-medium px-4 py-2 rounded-full">
                {item}
              </span>
            ))}
          </div>
        </Section>

        {/* 8. DATA RETENTION */}
        <Section number="7" title="Data Retention">
          <p className="text-sm text-gray-700 mb-3">We retain your data only for as long as necessary to:</p>
          <ul className="text-sm text-gray-700 space-y-2">
            {[
              "Provide pharmacy services",
              "Comply with legal obligations",
              "Meet regulatory requirements",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#445D41] rounded-full inline-block flex-shrink-0"></span>
                {item}
              </li>
            ))}
          </ul>
        </Section>

        {/* 9. YOUR RIGHTS */}
        <Section number="8" title="Your Rights Under UK GDPR">
          <p className="text-sm text-gray-700 mb-4">You have the right to:</p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { right: "Access", desc: "Your personal data" },
              { right: "Correct", desc: "Request correction of inaccurate data" },
              { right: "Delete", desc: "Request deletion of your data (where applicable)" },
              { right: "Restrict", desc: "Restrict or object to processing" },
              { right: "Portability", desc: "Request data portability" },
              { right: "Complain", desc: "Lodge a complaint with the ICO" },
            ].map((item) => (
              <div key={item.right} className="bg-white border rounded-xl p-4 shadow-sm text-center">
                <div className="w-10 h-10 bg-[#445D41] text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-2">
                  {item.right[0]}
                </div>
                <p className="text-sm font-semibold text-gray-800">{item.right}</p>
                <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 10. COOKIES */}
        <Section number="9" title="Cookies & Website Tracking">
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            Our website may use cookies and tracking technologies for:
          </p>
          <ul className="text-sm text-gray-700 space-y-2 mb-3">
            {[
              "Website functionality",
              "Analytics (e.g., Google Analytics)",
              "Marketing and advertising (if enabled)",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#445D41] rounded-full flex-shrink-0"></span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-sm text-gray-600">
            You can control cookie preferences through your <strong>browser settings</strong>.
          </p>
        </Section>

        {/* 11. CONSENT */}
        <Section number="10" title="Consent for Health Data Processing">
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-sm text-gray-700">
            By using our consultation and pharmacy services, you consent to the processing of your health data
            for the purpose of providing safe pharmacy care.
          </div>
        </Section>

        {/* 12. CONTACT DPO */}
        <Section number="11" title="Contact Details (Data Protection Officer)">
          <p className="text-sm text-gray-700 mb-4">
            If you have any questions about this Privacy Notice or how we handle your data, please contact:
          </p>
          <div className="bg-white border rounded-xl p-5 shadow-sm text-sm text-gray-700 space-y-1">
            <p className="font-semibold text-[#445D41] text-base">Data Protection Officer</p>
            <p><strong>Direct Care Ltd</strong></p>
            <p>
              Email:{" "}
              <a href="mailto:brijesh@direct-care.co.uk" className="text-[#445D41] underline hover:text-green-800">
                brijesh@direct-care.co.uk
              </a>
            </p>
          </div>
        </Section>

        {/* 13. COMPLAINTS */}
        <Section number="12" title="Complaints">
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            If you are unhappy with how we handle your data, you also have the right to complain to:
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-gray-700 space-y-1">
            <p className="font-semibold text-blue-700 text-base">Information Commissioner&apos;s Office (ICO)</p>
            <p>
              Website:{" "}
              <a
                href="https://ico.org.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800"
              >
                https://ico.org.uk
              </a>
            </p>
          </div>
        </Section>

      </div>

      {/* FOOTER STRIP */}
      <div className="text-center py-4 text-md">
        Direct Care Ltd &mdash; UK GDPR Privacy Notice &mdash; Last Updated: June 2026
      </div>
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b bg-gray-50">
        <span className="w-8 h-8 bg-[#445D41] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
          {number}
        </span>
        <h2 className="text-base md:text-lg font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}
