import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UnlockEvents - Alabama Business Events",
  description: "Discover professional and business events across Alabama",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
