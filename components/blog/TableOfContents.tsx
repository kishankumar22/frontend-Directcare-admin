"use client";

import { List } from "lucide-react";

interface Props {
  content: string;
}

interface Heading {
  id: string;
  text: string;
  level: "h2" | "h3" | "h4";
}

export default function TableOfContents({
  content,
}: Props) {
  const headings: Heading[] = [];

  const regex = /<(h2|h3|h4)[^>]*>(.*?)<\/\1>/gi;

  let match;
  let index = 0;

 while ((match = regex.exec(content)) !== null) {
  const fullMatch = match[0];

  const level = match[1] as "h2" | "h3";

  const text = match[2]
    .replace(/<[^>]+>/g, "")
    .trim();

  // ✅ Prefer existing heading ID
  const existingIdMatch = fullMatch.match(
    /id=["']([^"']+)["']/
  );

  const existingId = existingIdMatch?.[1];

  const generatedId =
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-") +
    `-${index}`;

  headings.push({
    id: existingId || generatedId,
    text,
    level,
  });

  index++;
}

  if (headings.length === 0) return null;

  const handleScroll = (id: string) => {
    const el = document.getElementById(id);

    if (!el) return;

 const scrollContainer = document.querySelector(
  ".blog-scroll-container"
) as HTMLElement | null;

if (scrollContainer) {
  const containerTop =
    scrollContainer.getBoundingClientRect().top;

  const elementTop =
    el.getBoundingClientRect().top;

  const scrollOffset =
    elementTop -
    containerTop +
    scrollContainer.scrollTop -
    100;

  scrollContainer.scrollTo({
    top: scrollOffset,
    behavior: "smooth",
  });
}
  };

return (
  <div
    className="
      rounded-2xl
      border border-gray-200
      bg-gradient-to-b from-white to-gray-50
      p-4
      shadow-sm
    "
  >
    {/* HEADER */}
    <div className="flex items-center gap-2.5 mb-3">
      <div
        className="
          flex h-8 w-8 items-center justify-center
          rounded-lg
          border border-[#445D41]/15
          bg-[#445D41]/8
        "
      >
        <List className="h-4 w-4 text-[#445D41]" />
      </div>

      <div>
        <h3 className="text-[15px] font-semibold text-gray-900 leading-none">
          Table of Contents
        </h3>
      </div>
    </div>

    {/* LIST */}
    <nav className="space-y-1">
      {headings.map((heading) => {
        const isSubHeading =
          heading.level === "h3";

        return (
          <button
            key={heading.id}
            onClick={() =>
              handleScroll(heading.id)
            }
            className={`
              group
              flex items-start gap-2.5
              w-full text-left
              rounded-lg
              px-2.5 py-2
              transition-all duration-200
              hover:bg-[#445D41]/6
              ${
                isSubHeading
                  ? "ml-4 text-[13px] text-gray-500"
                  : "text-[14px] font-medium text-gray-800"
              }
            `}
          >
            {/* DOT */}
            <span
              className={`
                mt-[7px]
                flex-shrink-0
                rounded-full
                transition-all duration-200
                ${
                  isSubHeading
                    ? "h-1.5 w-1.5 bg-gray-400"
                    : "h-2 w-2 bg-[#445D41]"
                }
              `}
            />

            {/* TEXT */}
            <span
              className="
                leading-5
                transition-colors duration-200
                group-hover:text-[#445D41]
              "
            >
              {heading.text}
            </span>
          </button>
        );
      })}
    </nav>
  </div>
);
}