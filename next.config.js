/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ✅ Evita o erro do Helvetica.afm no pdfkit (não empacota)
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
  },
};

module.exports = nextConfig;
