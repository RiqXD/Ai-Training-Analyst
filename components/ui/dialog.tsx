import { ReactNode, useEffect } from "react";
export function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean)=>void; children: ReactNode }) {
  useEffect(()=>{
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);
  if (!open) return null;
  return <div className="dialog-backdrop" onClick={()=>onOpenChange(false)}>{children}</div>;
}
export function DialogContent({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`dialog-panel ${className}`} onClick={(e)=>e.stopPropagation()}>{children}</div>;
}
export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="px-4 pt-4">{children}</div>;
}
export function DialogTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>;
}
export function DialogDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-gray-600">{children}</p>;
}
