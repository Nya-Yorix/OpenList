import { Box } from "@hope-ui/solid"
import {
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
} from "solid-js"
import { useRouter, useLink } from "~/hooks"
import {
  getSettingBool,
  objStore,
  setShouldKeepState,
} from "~/store"
import { ObjType } from "~/types"
import { pathDir, pathJoin } from "~/utils"
import { useNavigate } from "@solidjs/router"
import { VideoBox } from "./video_box"

// 使用原生 HTML5 video 标签替代 artplayer + HLS + mpegts
// 移除弹幕、字幕切换等高级功能，保留基本播放和自动下一个视频
const Preview = () => {
  const { searchParams } = useRouter()
  const navigate = useNavigate()
  const videos = createMemo(() =>
    objStore.objs.filter((obj) => obj.type === ObjType.VIDEO),
  )

  // 下一个视频
  const next_video = () => {
    const index = videos().findIndex((f) => f.name === objStore.obj.name)
    if (index < videos().length - 1) {
      navigate(pathJoin(pathDir(location.pathname), videos()[index + 1].name))
    }
  }

  // 上一个视频
  const previous_video = () => {
    const index = videos().findIndex((f) => f.name === objStore.obj.name)
    if (index > 0) {
      navigate(pathJoin(pathDir(location.pathname), videos()[index - 1].name))
    }
  }

  let videoRef: HTMLVideoElement | undefined

  // 动态视频高度：根据视频宽高比自动调整
  const [videoHeight, setVideoHeight] = createSignal("60vh")

  const onVideoLoaded = () => {
    if (!videoRef) return
    const { videoWidth, videoHeight: vh } = videoRef
    if (videoWidth > 0 && vh > 0) {
      const ratio = vh / videoWidth
      // 限制最大高度为 90vh，最小为 30vh
      const containerWidth = videoRef.parentElement?.clientWidth || window.innerWidth
      const computedHeight = containerWidth * ratio
      const maxHeight = window.innerHeight * 0.9
      const minHeight = window.innerHeight * 0.3
      const finalHeight = Math.min(Math.max(computedHeight, minHeight), maxHeight)
      setVideoHeight(`${finalHeight}px`)
    }
  }

  // 当视频 URL 变化时更新 video src
  createEffect(on(() => objStore.raw_url, (url) => {
    if (videoRef && url) {
      videoRef.src = url
      videoRef.load()
    }
  }))

  onMount(() => {
    // 自动全屏
    const auto_fullscreen = searchParams["auto_fullscreen"] === "true"
    if (auto_fullscreen && videoRef) {
      videoRef.requestFullscreen?.()
    }
  })

  onCleanup(() => {
    setShouldKeepState(false)
  })

  const [autoNext, setAutoNext] = createSignal(false)

  return (
    <VideoBox onAutoNextChange={setAutoNext}>
      <Box w="$full" h={videoHeight()}>
        <video
          ref={videoRef}
          src={objStore.raw_url}
          controls
          autoplay={getSettingBool("video_autoplay")}
          style={{ width: "100%", height: "100%", "object-fit": "contain" }}
          crossOrigin="anonymous"
          playsinline
          onLoadedMetadata={onVideoLoaded}
          onEnded={() => {
            if (autoNext()) next_video()
          }}
        />
      </Box>
    </VideoBox>
  )
}

export default Preview
