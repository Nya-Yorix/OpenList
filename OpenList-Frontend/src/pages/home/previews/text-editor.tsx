import {
  Box,
  Button,
  HStack,
  IconButton,
  Tooltip,
  useColorMode,
  VStack,
} from "@hope-ui/solid"
import { BiRegularRedo, BiRegularUndo } from "solid-icons/bi"
import {
  TbDeviceFloppy,
} from "solid-icons/tb"
import {
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show,
} from "solid-js"
import { BoxWithFullScreen, MaybeLoading } from "~/components"
import { useFetchText, useParseText, useRouter, useT, useUtil } from "~/hooks"
import { StreamUpload } from "~/pages/home/uploads/stream"
import { objStore, setLocal, local, userCan } from "~/store"
import { notify } from "~/utils"

// 使用原生 textarea 替代 Monaco Editor
// 保留基本文本编辑、保存、撤销/重做功能
// 移除语法高亮、代码折叠、minimap 等高级功能

function Editor(props: { data?: string | ArrayBuffer; contentType?: string }) {
  const { colorMode } = useColorMode()
  const { pathname } = useRouter()
  const { isString, text } = useParseText(props.data)
  const [value, setValue] = createSignal(text("utf-8"))
  const t = useT()

  let textareaRef: HTMLTextAreaElement | undefined
  let savedContent = ""

  // 跟踪修改状态
  const [modified, setModified] = createSignal(false)
  const [saving, setSaving] = createSignal(false)
  const [wordCount, setWordCount] = createSignal(0)

  const canWrite = createMemo(
    () =>
      (userCan("write_content") || objStore.write_content_bypass) &&
      objStore.write !== false,
  )

  // 更新字数统计
  const updateWordCount = (content: string) => {
    const trimmed = content.trim()
    setWordCount(trimmed ? trimmed.split(/\s+/).length : 0)
  }

  // 内容变化处理
  const onInput = (e: Event) => {
    const val = (e.target as HTMLTextAreaElement).value
    setValue(val)
    setModified(val !== savedContent)
    updateWordCount(val)
  }

  // 保存文件
  async function onSave() {
    if (saving()) return
    setSaving(true)
    try {
      const file = new File([value()], objStore.obj.name, {
        type: props.contentType || "text/plain",
      })
      await StreamUpload(pathname(), file, () => {}, false, true, false)
      savedContent = value()
      setModified(false)
      notify.success(t("global.save_success"))
    } catch (e: any) {
      notify.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  // 撤销
  const undo = () => {
    textareaRef?.focus()
    document.execCommand("undo")
  }

  // 重做
  const redo = () => {
    textareaRef?.focus()
    document.execCommand("redo")
  }

  onMount(() => {
    savedContent = value()
    updateWordCount(value())

    if (canWrite()) {
      // Ctrl+S / Cmd+S 保存
      const keyHandler = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
          e.preventDefault()
          onSave()
        }
      }
      window.addEventListener("keydown", keyHandler)
      onCleanup(() => window.removeEventListener("keydown", keyHandler))

      // 页面关闭前警告
      const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
        if (modified()) {
          e.preventDefault()
        }
      }
      window.addEventListener("beforeunload", beforeUnloadHandler)
      onCleanup(() => window.removeEventListener("beforeunload", beforeUnloadHandler))
    }
  })

  return (
    <VStack
      w="$full"
      h="$full"
      alignItems="stretch"
      spacing={0}
    >
      {/* 工具栏 */}
      <HStack
        px="$3"
        py="$1_5"
        spacing="$1"
        borderBottom="1px solid"
        borderColor={colorMode() === "light" ? "$neutral4" : "$neutral3"}
        bg={colorMode() === "light" ? "$neutral2" : "$neutral1"}
        flexShrink={0}
      >
        <Show when={canWrite()}>
          <Tooltip label={`${t("global.save")} (Ctrl+S)`} withArrow>
            <Button
              aria-label={t("global.save")}
              disabled={!modified() || saving()}
              leftIcon={<TbDeviceFloppy />}
              size="sm"
              variant="solid"
              loading={saving()}
              onClick={onSave}
            >
              {t("global.save")}
            </Button>
          </Tooltip>

          <Tooltip label={`${t("global.undo")} (Ctrl+Z)`} withArrow>
            <IconButton
              aria-label={t("global.undo")}
              icon={<BiRegularUndo />}
              size="sm"
              variant="ghost"
              onClick={undo}
            />
          </Tooltip>
          <Tooltip label={`${t("global.redo")} (Ctrl+Y)`} withArrow>
            <IconButton
              aria-label={t("global.redo")}
              icon={<BiRegularRedo />}
              size="sm"
              variant="ghost"
              onClick={redo}
            />
          </Tooltip>
        </Show>
      </HStack>

      {/* 编辑器 */}
      <Box flex="1" position="relative">
        <textarea
          ref={textareaRef}
          value={value()}
          onInput={onInput}
          readOnly={!canWrite()}
          spellcheck={false}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            outline: "none",
            resize: "none",
            padding: "12px",
            "font-family": "'Consolas', 'Monaco', 'Courier New', monospace",
            "font-size": `${local.editor_font_size || 14}px`,
            "line-height": "1.5",
            "tab-size": "4",
            "white-space": local.editor_word_wrap === "true" ? "pre-wrap" : "pre",
            "word-wrap": local.editor_word_wrap === "true" ? "break-word" : "normal",
            "overflow-x": local.editor_word_wrap === "true" ? "hidden" : "auto",
            "background-color": colorMode() === "light" ? "#ffffff" : "#1e1e1e",
            color: colorMode() === "light" ? "#24292f" : "#d4d4d4",
          }}
        />
      </Box>

      {/* 状态栏 */}
      <HStack
        px="$3"
        py="$1"
        spacing="$3"
        borderTop="1px solid"
        borderColor={colorMode() === "light" ? "$neutral4" : "$neutral3"}
        bg={colorMode() === "light" ? "$neutral2" : "$neutral1"}
        fontSize="$xs"
        color="$neutral11"
        flexShrink={0}
      >
        <Box flex="1" />
        <Box style={{ "white-space": "nowrap" }}>{wordCount()} words</Box>
        <Show when={modified()}>
          <Box color="$warning11" style={{ "white-space": "nowrap" }}>
            ●
          </Box>
        </Show>
      </HStack>
    </VStack>
  )
}

const TextEditor = () => {
  const [content] = useFetchText()
  return (
    <BoxWithFullScreen w="$full" h="70vh">
      <MaybeLoading loading={content.loading}>
        <Editor
          data={content()?.content}
          contentType={content()?.contentType}
        />
      </MaybeLoading>
    </BoxWithFullScreen>
  )
}

export default TextEditor
