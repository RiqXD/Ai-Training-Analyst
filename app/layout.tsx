import "./../styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Dashboard Training Analyst AI",
  description: "AI evaluator via OpenRouter",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
