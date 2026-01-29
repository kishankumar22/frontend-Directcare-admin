interface SidebarButtonProps {
  children: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  onClick?: () => void;
}

export default function SidebarButton({
  children,
  active,
  danger,
  onClick,
}: SidebarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition
        ${
          danger
            ? "text-red-600 hover:bg-red-50"
            : active
            ? "bg-[#445D41] text-white"
            : "text-gray-600 hover:bg-gray-50"
        }`}
    >
      {children}
    </button>
  );
}
