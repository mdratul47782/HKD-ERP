// frontend/next.config.mjs

import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../'),
  turbopack: {
    root: path.join(__dirname, '../'),
  },
  allowedDevOrigins: ['192.169.10.220'], // ← এটা যোগ করো
}

export default nextConfig