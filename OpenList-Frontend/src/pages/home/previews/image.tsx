import {
  Box,
  Button,
  Center,
  Flex,
  HStack,
  IconButton,
  Spacer,
  Text,
  Tooltip,
  VStack,
} from "@hope-ui/solid"
import { FaSolidAngleLeft, FaSolidAngleRight } from "solid-icons/fa"
import {
  createSignal,
  onCleanup,
  onMount,
  Show,
} from "solid-js"
import {
  BoxWithFullScreen,
  Error,
  FullLoading,
  ImageWithError,
} from "~/components"
import { useRouter, useT } from "~/hooks"
import { objStore } from "~/store"
import { Obj, ObjType } from "~/types"
import { ext, formatDate, getFileSize } from "~/utils"

// 移除 lightgallery 和 libheif 库，使用原生 img 标签
// 保留基本导航、图片信息显示

interface PreviewProps {
  images?: Obj[]
  navigate?: (name: string) => void
}

// ── 图片预览主组件 ──
const Preview = (props: PreviewProps) => {
  const t = useT()
  const { replace } = useRouter()

  const [showInfo, setShowInfo] = createSignal(false)
  const [imgSize, setImgSize] = createSignal({ w: 0, h: 0 })

  let images =
    props.images ||
    objStore.objs.filter((o) => o.type === ObjType.IMAGE)
  if (images.length === 0) images = [objStore.obj]

  const curIdx = () => images.findIndex((f) => f.name === objStore.obj.name)

  // ── 导航 ──
  const goTo = (obj: Obj) => {
    if (props.navigate) props.navigate(obj.name)
    else replace(obj.name)
  }
  const prev = () => {
    const i = curIdx()
    if (i > 0) goTo(images[i - 1])
  }
  const next = () => {
    const i = curIdx()
    if (i < images.length - 1) goTo(images[i + 1])
  }

  // ── 图片加载回调 ──
  const onImgLoad = (e: Event) => {
    const img = e.target as HTMLImageElement
    setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
  }

  // ── 键盘快捷键 ──
  const onKey = (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowLeft":
        return prev()
      case "ArrowRight":
        return next()
      case "i":
        return setShowInfo((v) => !v)
    }
  }

  onMount(() => {
    window.addEventListener("keydown", onKey)
  })
onCleanup(() => {
     window.removeEventListener("keydown", onKey)
   })

   return (
    <BoxWithFullScreen w="$full" h="70vh">
      <Box w="$full" h="$full" display="flex" flexDirection="column">
        {/* ── 工具栏 ── */}
        <Flex
          w="$full"
          bg="$neutral1"
          p="$2"
          flexShrink={0}
        >
          <HStack spacing="$1">
            <Show when={curIdx() > 0}>
              <Tooltip label={`${t("home.preview.prev_image")} (←)`}>
                <IconButton
                  icon={<FaSolidAngleLeft />}
                  aria-label={t("home.preview.prev_image")}
                  variant="ghost"
                  size="sm"
                  onClick={prev}
                />
              </Tooltip>
            </Show>
            <Show when={curIdx() < images.length - 1}>
              <Tooltip label={`${t("home.preview.next_image")} (→)`}>
                <IconButton
                  icon={<FaSolidAngleRight />}
                  aria-label={t("home.preview.next_image")}
                  variant="ghost"
                  size="sm"
                  onClick={next}
                />
              </Tooltip>
            </Show>
            <Text
              size="sm"
              maxW="280px"
              overflow="hidden"
              ml="$1"
              css={{
                "text-overflow": "ellipsis",
                "white-space": "nowrap",
              }}
              display={{ "@initial": "none", "@sm": "block" }}
            >
              {objStore.obj.name}
            </Text>
            <Show when={images.length > 1}>
              <Text color="$neutral11" size="xs">
                {curIdx() + 1}/{images.length}
              </Text>
            </Show>
          </HStack>
          <Spacer />
          <HStack spacing="$1">
            <Tooltip label={`${t("home.preview.image_info")} (I)`}>
              <IconButton
                icon={<Text fontSize="$xs">i</Text>}
                aria-label={t("home.preview.image_info")}
                variant={showInfo() ? "subtle" : "ghost"}
                size="sm"
                onClick={() => setShowInfo((v) => !v)}
              />
            </Tooltip>
          </HStack>
        </Flex>

        {/* ── 图片区域 ── */}
        <Center
          w="$full"
          flex="1"
          backgroundColor="$neutral2"
          overflow="hidden"
          position="relative"
        >
<Center w="$full" h="$full">
             <ImageWithError
               src={objStore.raw_url}
               fallback={<FullLoading />}
               fallbackErr={
                 <Error msg={t("home.preview.failed_load_img")} />
               }
               onLoad={onImgLoad}
               w="$full"
               h="$full"
               objectFit="contain"
             />
           </Center>

          {/* ── 信息叠加层 ── */}
          <Show when={showInfo()}>
            <Box
              position="absolute"
              bottom="$2"
              left="$2"
              p="$2"
              bg="$blackAlpha9"
              borderRadius="$md"
              zIndex="$docked"
              fontSize="$sm"
              css={{
                "backdrop-filter": "blur(8px)",
              }}
            >
              <Text color="$whiteAlpha12" fontWeight="$semibold">
                {objStore.obj.name}
              </Text>
              <Text color="$whiteAlpha11">
                {getFileSize(objStore.obj.size)}
              </Text>
              <Show when={imgSize().w > 0}>
                <Text color="$whiteAlpha11">
                  {imgSize().w} x {imgSize().h}px
                </Text>
              </Show>
              <Text color="$whiteAlpha11">
                {formatDate(objStore.obj.modified)}
              </Text>
            </Box>
          </Show>
        </Center>
      </Box>
    </BoxWithFullScreen>
  )
}

export default Preview
