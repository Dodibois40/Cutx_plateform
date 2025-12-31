import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

// Root layout is a simple pass-through
// HTML/body tags and fonts are in [locale]/layout.tsx for proper i18n lang attribute
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      {children}
    </ClerkProvider>
  );
}
