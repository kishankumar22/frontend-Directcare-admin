interface InfoProps {
  label: string;
  value: React.ReactNode;
}

export default function Info({ label, value }: InfoProps) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
