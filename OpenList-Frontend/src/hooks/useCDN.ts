// 精简版：移除 Monaco/libheif/libass/docx 等重型库的 CDN 路径
import { joinBase } from "~/utils"
import {
  name as pkgName,
  version as pkgVersion,
  dependencies as pkgDeps,
} from "../../package.json"

// 注意：这是无状态的路径工厂（非 hook），只能在渲染/调用时使用，禁止在模块顶层调用
export const getCDNPaths = () => {
  const static_path = joinBase("static")

  // OpenList Resource CDN: https://github.com/OpenListTeam/OpenList-Resource
  const resource = "https://res.oplist.org.cn"

  // npmmirror CDN, whitelist
  const npm = (name: string, version: string, path: string) => {
    return `https://registry.npmmirror.com/${name}/${version}/files/${path}`
  }

  // Read version from package.json dependencies (strips ^ ~ prefixes)
  const dep = (name: string) => {
    const ver = (pkgDeps as Record<string, string>)[name]
    if (!ver)
      throw new Error(
        `[getCDNPaths] "${name}" not found in package.json dependencies`,
      )
    return ver.replace(/^[^\d]*/, "")
  }

  const res = (path: string) => {
    return `${resource}/${path}`
  }

  const katexCSSPath = () => {
    return import.meta.env.VITE_LITE === "true"
      ? npm("katex", dep("katex"), "dist/katex.min.css")
      : `${static_path}/katex/katex.min.css`
  }

  const mermaidJSPath = () => {
    return import.meta.env.VITE_LITE === "true"
      ? npm("mermaid", dep("mermaid"), "dist/mermaid.min.js")
      : `${static_path}/mermaid/mermaid.min.js`
  }

  const rufflePath = () => res("ruffle/ruffle.js")

  return {
    npm,
    res,
    katexCSSPath,
    mermaidJSPath,
    rufflePath,
  }
}
