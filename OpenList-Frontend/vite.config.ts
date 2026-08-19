import path from "path"
import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import { dynamicBase } from "vite-plugin-dynamic-base"
import { viteStaticCopy } from "vite-plugin-static-copy"
import viteCompression from "vite-plugin-compression"

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "src"),
      // "@solidjs/router": path.resolve(__dirname, "solid-router/src"),
      "solid-icons": path.resolve(__dirname, "node_modules/solid-icons"),
    },
  },
  plugins: [
    solidPlugin(),
    dynamicBase({
      // dynamic public path var string, default window.__dynamic_base__
      publicPath: "window.__dynamic_base__",
      // dynamic load resources on index.html, default false. maybe change default true
      transformIndexHtml: true,
      transformIndexHtmlConfig: {
        insertBodyAfter: true,
      },
    }),
    process.env.VITE_LITE !== "true"
      ? viteStaticCopy({
          targets: [
            {
              src: "node_modules/katex/dist/katex.min.css",
              dest: "static/katex",
            },
            {
              src: "node_modules/katex/dist/fonts/*",
              dest: "static/katex/fonts",
            },
            {
              src: "node_modules/mermaid/dist/mermaid.min.js",
              dest: "static/mermaid",
            },
          ],
        })
      : null,
    // Gzip压缩
    viteCompression({
      algorithm: "gzip",
      ext: ".gz",
    }),
    // Brotli压缩
    viteCompression({
      algorithm: "brotliCompress",
      ext: ".br",
    }),
  ],
  base: process.env.NODE_ENV === "production" ? "/__dynamic_base__/" : "/",
  // base: "/",
  build: {
    // 提高chunk大小警告阈值
    chunkSizeWarningLimit: 1000,
    // 合并所有 CSS 为单个文件，减少样式请求数
    cssCodeSplit: false,
    // 启用terser压缩，移除console和debugger
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info", "console.debug"],
      },
      format: {
        comments: false,
      },
    },
  },
  // experimental: {
  //   renderBuiltUrl: (filename, { type, hostId, hostType }) => {
  //     if (type === "asset") {
  //       return { runtime: `window.OPENLIST_CONFIG.cdn/${filename}` };
  //     }
  //     return { relative: true };
  //   },
  // },
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:5244",
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
})
