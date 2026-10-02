import { APP_FULL_NAME } from "@/lib/config";
import "./globals.css";

export const metadata = {
  title: {
    default: APP_FULL_NAME,
    template: `%s — ${APP_FULL_NAME}`,
  },
  description: "Member and membership management for Aura Fitness.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // Matches --bg-main, so the phone's browser bar blends with the header.
  themeColor: "#09090b",
};

/**
 * The root layout - just the document.
 *
 * The application shell (sidebar, header, bottom navigation) lives in
 * app/(app)/layout.js, which only signed-in pages use. The login page sits
 * outside that group, so it renders on its own without any navigation.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
