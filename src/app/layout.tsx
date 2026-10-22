import type { Metadata, Viewport } from "next";
import { Alex_Brush, JetBrains_Mono, Montserrat } from "next/font/google";
import Script from "next/script";

import "./globals.css";

const themeInitScript = `
(function () {
  try {
    var key = "rs-theme";
    var stored = window.localStorage.getItem(key);
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    var root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;

    function setThemeColor() {
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute("content", theme === "light" ? "#eef5f4" : "#05080b");
      }
    }

    setThemeColor();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", setThemeColor, { once: true });
    }
  } catch (error) {
    document.documentElement.dataset.theme = "dark";
  }
})();
`;

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
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${montserrat.variable} ${jetbrainsMono.variable} ${alexBrush.variable}`}
    >
      <body>
        {children}
        <Script
          id="royal-sky-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </body>
    </html>
  );
}
