"use client";

interface GenderBadgeProps {
  gender?: string | null;
  className?: string; // optional override if ever needed
  absolute?: boolean; // ✅ THIS MUST EXIST
}

const getGenderConfig = (gender?: string | null) => {
  switch (gender?.toLowerCase()) {
    case "male":
      return {
        label: "Male",
        icon: "/icons/male.svg",
      };
    case "female":
      return {
        label: "Female",
        icon: "/icons/female.svg",
      };
    case "unisex":
      return {
        label: "Unisex",
        icon: "/icons/unisex.svg",
      };
    default:
      return null;
  }
};

export default function GenderBadge({
  gender,
  className = "",
  absolute = true,
}: GenderBadgeProps) {
  const config = getGenderConfig(gender);

  if (!config) return null;

  return (
<div
  className={`
    ${absolute ? "absolute top-1 left-1 sm:top-2 sm:left-2 z-20" : ""}
    bg-white/70 p-1 rounded-md shadow
    inline-flex items-center justify-center shrink-0
    ${className}
  `}
  title={config.label}
>
  {/* Only the icon — label shown as native tooltip so the badge never wraps */}
  <img
    src={config.icon}
    alt={config.label}
    className="h-4 w-4 sm:h-5 sm:w-5"
    loading="lazy"
  />
</div>
  );
}

