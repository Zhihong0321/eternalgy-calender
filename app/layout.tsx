import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Eternalgy Calendar",
  description: "Team appointments and tasks"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-mist text-ink">
        {children}
      </body>
    </html>
  );
}
