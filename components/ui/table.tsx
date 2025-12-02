import { ReactNode } from "react";
export function Table({ children }: { children: ReactNode }) { return <table className="table">{children}</table>; }
export function TableHeader({ children }: { children: ReactNode }) { return <thead>{children}</thead>; }
export function TableBody({ children }: { children: ReactNode }) { return <tbody>{children}</tbody>; }
export function TableRow({ children, className = "" }: { children: ReactNode; className?: string }) { return <tr className={className}>{children}</tr>; }
export function TableHead({ children }: { children: ReactNode }) { return <th>{children}</th>; }
export function TableCell({ children, className = "" }: { children: ReactNode; className?: string }) { return <td className={className}>{children}</td>; }
export function TableCaption({ children }: { children: ReactNode }) { return <caption className="text-xs text-gray-500 text-left py-2">{children}</caption>; }
