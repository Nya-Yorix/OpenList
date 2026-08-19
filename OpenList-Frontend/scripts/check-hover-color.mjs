// 回归回路：验证 const.ts 的 hoverColor() 在组件外（模块加载场景）调用不抛错
//
// 原理：bug 根因是 hoverColor() 内部调用 useColorModeValue()（Hope UI hook），
// 该 hook 在 HopeProvider/组件上下文外调用时抛 "useColorMode must be used within a HopeProvider"。
// 回路加载【真实 const.ts 源码】，仅 stub @hope-ui/solid（模拟其真实抛错行为），
// 在组件外调用 hoverColor()，若调用 hook 则会抛错 → 回路红；纯函数实现 → 回路绿。
import { fileURLToPath } from "node:url"
import { createServer } from "vite"

const server = await createServer({
  root: fileURLToPath(new URL("..", import.meta.url)),
  server: { middlewareMode: true },
  logLevel: "error",
  appType: "custom",
  ssr: {
    noExternal: ["@hope-ui/solid", "@stitches/core"],
  },
})

try {
  // 用 vite 转换真实 const.ts（TS → ESM）
  const code = await server.transformRequest("/src/utils/const.ts")
  if (!code || !code.code) throw new Error("transformRequest 失败")

  // 去掉 import 行，注入 stub，并把 export 关键字剥离（ESM → 普通声明）
  const stripped = code.code
    .split("\n")
    .filter((l) => !l.trim().startsWith("import "))
    .join("\n")
    .replace(/export const /g, "const ")
  const wrapped = `
    // 模拟 @hope-ui/solid：useColorModeValue 在无 Provider 上下文时抛错（与真实实现一致）
    function useColorModeValue() {
      throw new Error("[Hope UI]: useColorMode must be used within a HopeProvider");
    }
    ${stripped}
    return { hoverColor };
  `
  const fn = new Function(wrapped)
  const { hoverColor } = fn()

  // 模拟 theme.ts 模块顶层执行：HopeProvider 外、组件外调用
  const result = hoverColor()
  if (typeof result !== "string" || !result.startsWith("rgba")) {
    console.error("FAIL: hoverColor() 返回值异常:", result)
    process.exit(1)
  }
  console.log("PASS: hoverColor() 在组件外调用成功 ->", result)
  process.exit(0)
} catch (e) {
  console.error("FAIL: 模块加载时调用 hoverColor() 抛错 ->", e.message)
  process.exit(1)
} finally {
  await server.close()
}