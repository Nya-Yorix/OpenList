// 面包屑标题点击目标的回归测试(反馈环)
// 用法: node --experimental-strip-types scripts/test-nav-parent.mjs
import { resolveNavParent } from "../src/utils/navTarget.ts"

let failed = 0
const cases = [
  // [描述, pathname, isShare, 期望( null=不跳转 )]
  ["首页一级目录 /目录1 应返回根 /", "/目录1", false, "/"],
  ["首页一级目录 /目录3 应返回根 /", "/目录3", false, "/"],
  ["首页二级目录 /目录1/目录2 返回目录1", "/目录1/目录2", false, "/目录1"],
  ["站点根目录 / 不跳转", "/", false, null],
  ["分享根目录 /@s/abc 不跳转", "/@s/abc", true, null],
  ["分享子目录 /@s/abc/x 返回上级", "/@s/abc/x", true, "/@s/abc"],
]

for (const [desc, pathname, isShare, expected] of cases) {
  const got = resolveNavParent(pathname, isShare)
  const pass = got === expected
  if (!pass) failed++
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${desc}  (got: ${JSON.stringify(got)}, want: ${JSON.stringify(expected)})`,
  )
}

if (failed > 0) {
  console.error(`\n${failed} case(s) FAILED — bug reproduced`)
  process.exit(1)
}
console.log("\nall cases passed")
