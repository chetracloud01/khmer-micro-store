import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@khmer-micro-store/shared", "@khmer-micro-store/ui"],
};

export default withNextIntl(nextConfig);
