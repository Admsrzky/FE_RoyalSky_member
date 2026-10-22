import type { Metadata, Viewport } from "next";
import { Alex_Brush, JetBrains_Mono, Montserrat } from "next/font/google";

import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const alexBrush = Alex_Brush({
  variable: "--font-alex-brush",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Royal Sky Member Portal",
    template: "%s · Royal Sky",
  },
  description:
    "Kartu member digital Royal Sky Gym Club: QR akses pintu, status membership, saldo wallet, dan poin loyalty.",
  applicationName: "Royal Sky Member Portal",
};

export const viewport: Viewport = {
  themeColor: "#05080b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${montserrat.variable} ${jetbrainsMono.variable} ${alexBrush.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
