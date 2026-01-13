/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel serverless functions config
  experimental: {
    serverComponentsExternalPackages: ['@notionhq/client']
  }
}

module.exports = nextConfig
