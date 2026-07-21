/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // citeproc (citeproc-js) ships its own hand-rolled string-based XML
  // parser. When webpack bundles and minifies it for a server route,
  // Terser mis-optimises CSL.parseXml's final `return _obj.children[0]`
  // down to an equivalent of `return [][0]` (always undefined), which
  // breaks every citation render with "Cannot read properties of
  // undefined (reading 'name')". Confirmed by direct comparison: the
  // identical style file and code render correctly under plain
  // `node -e` and `npx tsx`, and fail only once webpack/Terser have
  // processed the same file. Excluding citeproc from server bundling
  // makes Next.js load it via Node's native require() at runtime
  // instead, which uses the real, unmodified file and fixes it.
  experimental: {
    serverComponentsExternalPackages: ["citeproc"],
  },
};

export default nextConfig;
