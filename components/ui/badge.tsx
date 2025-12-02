import { ReactNode } from "react";
export function Badge({ children, className = "", variant }: { children: ReactNode; className?: string; variant?: "outline" | undefined }) {
  const base = variant === "outline" ? "badge border-gray-300 text-gray-700" : "badge border-gray-200 bg-gray-50";
  return <span className={`${base} ${className}`}>{children}</span>;
}
