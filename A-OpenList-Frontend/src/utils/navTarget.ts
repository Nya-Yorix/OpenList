// 解析面包屑最后一级标题点击的跳转目标。
// 返回 null 表示不跳转(站点根目录 / 分享根目录 /@s/<id>)。
export const resolveNavParent = (
  pathname: string,
  isShare: boolean,
): string | null => {
  const segments = pathname.split("/").filter(Boolean)
  if (isShare) {
    // /@s/<id> 为分享根目录,不跳转
    if (segments.length <= 2) return null
  } else {
    // 站点根目录不跳转
    if (segments.length === 0) return null
  }
  const parent = pathname.split("/").slice(0, -1).join("/")
  if (parent === pathname) return null
  // 一级目录的父级为空串,即站点根目录 /
  return parent || "/"
}
