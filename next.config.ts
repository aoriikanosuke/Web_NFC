import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  // 以下の設定を追加
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value: "nfc=(self)", // NFCの実行を自分自身のドメインに許可
          },
        ],
      },
    ];
  },
};

export default nextConfig;