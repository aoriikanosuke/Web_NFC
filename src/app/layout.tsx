import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "NFCスタンプラリー",
  description: "Web NFCを使用したスタンプラリーアプリ",
  themeColor: "#9ebbe6", // index.html の theme-color
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        {/* index.html 相当 */}
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#9ebbe6" />

        {/* Google Font（index.html） */}
        <link
          href="https://fonts.googleapis.com/css2?family=LINE+Seed+JP:wght@400;700;800&display=swap"
          rel="stylesheet"
        />

        {/* CSSを public/css/stylesheet.css から読み込む */}
        <link rel="stylesheet" href="/css/stylesheet.css" />
      </head>

      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
