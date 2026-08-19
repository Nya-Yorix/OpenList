import { Box, Center, Text, VStack, Select } from "@hope-ui/solid"
import { Show, createMemo, createSignal, onCleanup, onMount, For } from "solid-js"
import { useRouter, useLink, useFetch } from "~/hooks"
import {
  getSettingBool,
  objStore,
  password,
  setShouldKeepState,
} from "~/store"
import { ObjType, PResp } from "~/types"
import { handleResp, notify, r, pathDir, pathJoin } from "~/utils"
import { VideoBox } from "./video_box"
import { useNavigate } from "@solidjs/router"
import { TiWarning } from "solid-icons/ti"

// 移除 artplayer + HLS.js，使用原生 HTML5 video
// 阿里云盘视频使用转码链接，部分浏览器可能不支持 m3u8 格式

export interface Data {
  drive_id: string
  file_id: string
  video_preview_play_info: VideoPreviewPlayInfo
}

export interface VideoPreviewPlayInfo {
  category: string
  live_transcoding_task_list: LiveTranscodingTaskList[]
  meta: Meta
}

export interface LiveTranscodingTaskList {
  stage: string
  status: string
  template_height: number
  template_id: string
  template_name: string
  template_width: number
  url: string
}

export interface Meta {
  duration: number
  height: number
  width: number
}

const Preview = () => {
  const { pathname, searchParams } = useRouter()
  const navigate = useNavigate()
  const videos = createMemo(() =>
    objStore.objs.filter((obj) => obj.type === ObjType.VIDEO),
  )

  const next_video = () => {
    const index = videos().findIndex((f) => f.name === objStore.obj.name)
    if (index < videos().length - 1) {
      navigate(pathJoin(pathDir(location.pathname), videos()[index + 1].name))
    }
  }

  let videoRef: HTMLVideoElement | undefined
  const [qualityList, setQualityList] = createSignal<LiveTranscodingTaskList[]>([])
  const [currentQuality, setCurrentQuality] = createSignal("")
  const [autoNext, setAutoNext] = createSignal(false)
  const [warnVisible, setWarnVisible] = createSignal(false)

  const [, post] = useFetch((): PResp<Data> =>
    r.post("/fs/other", {
      path: pathname(),
      password: password(),
      method: "video_preview",
    }),
  )

  onMount(async () => {
    const resp = await post()
    setWarnVisible(resp.code !== 200)
    handleResp(resp, (data) => {
      const list =
        data.video_preview_play_info.live_transcoding_task_list.filter(
          (l) => l.url,
        )
      if (list.length === 0) {
        notify.error("No transcoding video found")
        return
      }
      setQualityList(list)
      // 默认播放最高画质
      const bestUrl = list[list.length - 1].url
      setCurrentQuality(list[list.length - 1].template_id)
      if (videoRef) {
        videoRef.src = bestUrl
        videoRef.load()
        if (getSettingBool("video_autoplay")) {
          videoRef.play().catch(() => {})
        }
      }
    })
  })

  onCleanup(() => {
    setShouldKeepState(false)
  })

  // 切换画质
  const switchQuality = (templateId: string) => {
    const item = qualityList().find((l) => l.template_id === templateId)
    if (item && videoRef) {
      const wasPlaying = !videoRef.paused
      const curTime = videoRef.currentTime
      videoRef.src = item.url
      videoRef.load()
      videoRef.currentTime = curTime
      if (wasPlaying) videoRef.play().catch(() => {})
      setCurrentQuality(templateId)
    }
  }

  return (
    <VideoBox onAutoNextChange={setAutoNext}>
      <Box w="$full" h="60vh">
        <Show
          when={!warnVisible()}
          fallback={
            <Center w="100%" h="60vh" bgColor="black">
              <TiWarning size="4rem" />
            </Center>
          }
        >
          <VStack w="$full" h="$full" spacing="0">
            <video
              ref={videoRef}
              controls
              playsinline
              crossOrigin="anonymous"
              style={{ width: "100%", flex: "1", "object-fit": "contain", background: "black" }}
              onEnded={() => {
                if (autoNext()) next_video()
              }}
            />
            {/* 画质选择 */}
            <Show when={qualityList().length > 1}>
              <Box w="$full" px="$2" py="$1" bg="$neutral1">
                <Select
                  size="sm"
                  value={currentQuality()}
                  onChange={(e) => switchQuality(e.currentTarget.value)}
                >
                  <For each={qualityList()}>
                    {(item) => (
                      <option value={item.template_id}>{item.template_id}</option>
                    )}
                  </For>
                </Select>
              </Box>
            </Show>
          </VStack>
        </Show>
      </Box>
    </VideoBox>
  )
}

export default Preview
