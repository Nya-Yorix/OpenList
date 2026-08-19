import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbProps,
  BreadcrumbSeparator,
} from "@hope-ui/solid"
import { Link, useNavigate } from "@solidjs/router"
import { createMemo, For, Show, onMount } from "solid-js"
import { usePath, useRouter, useT } from "~/hooks"
import { getSetting, local } from "~/store"
import { encodePath, hoverColor, joinBase } from "~/utils"

export const Nav = () => {
  const { pathname, isShare } = useRouter()
  const navigate = useNavigate()
  const paths = createMemo(() => {
    if (!isShare()) {
      return ["", ...pathname().split("/").filter(Boolean)]
    } else {
      const p = pathname().split("/").filter(Boolean)
      return [`@s/${p[1] ?? ""}`, ...p.slice(2)]
    }
  })
  const t = useT()
  const { setPathAs } = usePath()

  const stickyProps = createMemo<BreadcrumbProps>(() => {
    const mask: BreadcrumbProps = {
      _after: {
        content: "",
        backgroundColor: "$background",
        position: "absolute",
        height: "100%",
        width: "99vw",
        zIndex: -1,
        transform: "translateX(-50%)",
        left: "50%",
        top: 0,
      },
    }

    switch (local["position_of_header_navbar"]) {
      case "only_navbar_sticky":
        return { ...mask, position: "sticky", zIndex: "$sticky", top: 0 }
      case "sticky":
        return { ...mask, position: "sticky", zIndex: "$sticky", top: 60 }
      default:
        return {
          _after: undefined,
          position: undefined,
          zIndex: undefined,
          top: undefined,
        }
    }
  })

  // 导航点击返回功能：点击最后一级，导航到父文件夹路径
  onMount(() => {
    document.addEventListener("click", function(e) {
      const last = document.querySelector(".nav.hope-breadcrumb li:last-child")
      if (!last || !last.contains(e.target as Node)) return
      if (last.textContent?.trim() === t("home.nav.home")) return
      // 获取当前路径，去掉最后一级得到父文件夹路径
      const currentPath = pathname()
      const segments = currentPath.split("/").filter(Boolean)
      // 处理共享根目录：/@s/<sid> 应视为根，点击返回无操作
      if (isShare() && segments.length === 2) {
        // 共享根目录，点击返回不跳转
        return
      }
      if (segments.length <= 1) {
        // 已经在根目录或一级目录，返回主页
        navigate(isShare() ? `/@s/${segments[0] || ""}` : "/")
      } else {
        // 去掉最后一级，导航到父文件夹
        const parentPath = "/" + segments.slice(0, -1).join("/")
        navigate(parentPath)
      }
    })
  })

  return (
    <Breadcrumb
      {...stickyProps}
      background="$background"
      class="nav"
      w="$full"
      css={{
        display: "flex",
        justifyContent: "center",
        width: "100%",
        padding: 0,
        "& li": {
          display: "none",
        },
        "& li:last-child": {
          display: "inline-flex",
          justifyContent: "center",
          alignItems: "center",
          margin: "0 auto",
          padding: "4px 12px",
          borderRadius: "8px",
          cursor: "pointer",
          transition: "transform 0.2s",
          userSelect: "none",
        },
        "& li:last-child:hover": {
          transform: "scale(1.1)",
        },
        "& li:last-child .nav-link": {
          fontSize: "22px",
          fontWeight: 600,
          textAlign: "center",
          background: "none",
        },
        "&.hope-c-hrsMRY": {
          maxWidth: "600px",
          width: "auto",
          backgroundColor: "transparent !important",
          backdropFilter: "none",
        },
      }}
    >
      <For each={paths()}>
        {(name, i) => {
          const isLast = createMemo(() => i() === paths().length - 1)
          const path = paths()
            .slice(0, i() + 1)
            .join("/")
          const href = encodePath(path)
          let text = () => name
          if (!isShare() && text() === "") {
            text = () => getSetting("home_icon") + t("manage.sidemenu.home")
          } else if (isShare() && i() === 0) {
            text = () => getSetting("share_icon") + t("manage.sidemenu.shares")
          }
          return (
            <BreadcrumbItem class="nav-item">
              <BreadcrumbLink
                class="nav-link"
                css={{
                  wordBreak: "break-all",
                }}
                color="unset"
                _hover={{ backgroundColor: hoverColor(), color: "unset" }}
                _active={{ transform: "scale(.95)", transition: "0.1s" }}
                cursor="pointer"
                p="$1"
                rounded="$lg"
                currentPage={isLast()}
                as={isLast() ? undefined : Link}
                href={joinBase(href)}
                onMouseEnter={() => setPathAs(path)}
              >
                {text()}
              </BreadcrumbLink>
              <Show when={!isLast()}>
                <BreadcrumbSeparator class="nav-separator" />
              </Show>
            </BreadcrumbItem>
          )
        }}
      </For>
    </Breadcrumb>
  )
}
