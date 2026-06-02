import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Betel Media Organiser",
  description: "Local church media control center"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
