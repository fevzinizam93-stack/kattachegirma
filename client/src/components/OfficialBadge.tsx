import { BadgeCheck } from "lucide-react";

// Значок «официально от Katta Chegirma» — синяя галочка без текста (как в Instagram).
export default function OfficialBadge({
  size = 16,
  className = "",
  label = "Официально от Katta Chegirma",
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <span
      title={label}
      aria-label={label}
      className={`inline-flex items-center text-blue-500 shrink-0 ${className}`}
    >
      <BadgeCheck size={size} className="fill-blue-500 text-white" />
    </span>
  );
}
