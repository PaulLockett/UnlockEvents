import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UnlockEvents Admin - Source Management",
  description: "Operator interface for managing event sources",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
