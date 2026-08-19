import { Box, VStack, HStack, Text, IconButton } from "@hope-ui/solid"
import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { useLink, useRouter, useT } from "~/hooks"
import { getSettingBool, ObjStore, objStore, password } from "~/store"
import { ObjType, StoreObj } from "~/types"
import { fsList, pathDir, pathJoin } from "~/utils"
import { BsPlayFill, BsPauseFill, BsSkipStartFill, BsSkipEndFill } from "solid-icons/bs"
import { useNavigate } from "@solidjs/router"

// 原生 HTML5 audio 播放器，上下结构：上方文件名+控制，下方播放列表
const Preview = () => {
  const { rawLink } = useLink()
  const { pathname } = useRouter()
  const navigate = useNavigate()
  const t = useT()

  // audio 元素引用：使用信号确保响应式就绪
  const [audioEl, setAudioEl] = createSignal<HTMLAudioElement | undefined>(undefined)

  // 如果 objStore.objs 为空（直接访问音频文件 URL），静默获取父目录列表
  onMount(() => {
    const path = pathname()
    if (objStore.objs.length === 0 && path.endsWith(objStore.obj.name)) {
      fsList(pathDir(path), password()).then((resp) => {
        if (resp.code === 200 && resp.data?.content) {
          ObjStore.setObjs(resp.data.content)
        }
      })
    }
  })

  // 响应式音频列表
  const audios = createMemo(() => {
    let list = objStore.objs.filter((obj) => obj.type === ObjType.AUDIO)
    if (list.length === 0) list = [objStore.obj]
    return list
  })

  // 响应式当前索引：跟随 objStore.obj.name 变化
  const currentIndex = createMemo(() => {
    return audios().findIndex((obj) => obj.name === objStore.obj.name)
  })

  const [isPlaying, setIsPlaying] = createSignal(false)
  const [currentTime, setCurrentTime] = createSignal(0)
  const [duration, setDuration] = createSignal(0)

  // 播放指定索引：改变 URL 地址栏
  const playAtIndex = (index: number) => {
    if (index < 0 || index >= audios().length) return
    const audio = audios()[index]
    const dir = pathDir(pathname())
    navigate(pathJoin(dir, audio.name))
  }

  const togglePlay = () => {
    const el = audioEl()
    if (!el) return
    isPlaying() ? el.pause() : el.play().catch(() => {})
  }

  const prevTrack = () => {
    const idx = currentIndex()
    playAtIndex(idx > 0 ? idx - 1 : audios().length - 1)
  }

  const nextTrack = () => {
    const idx = currentIndex()
    playAtIndex(idx < audios().length - 1 ? idx + 1 : 0)
  }

  const formatTime = (s: number): string => {
    if (isNaN(s)) return "0:00"
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  // 核心：监听 raw_url 和 audioEl 两个信号，两者都就绪时自动播放
  createEffect(() => {
    const url = objStore.raw_url
    const el = audioEl()
    if (!url || !el) return
    // 设置 src 并播放
    el.src = url
    const doPlay = () => {
      if (getSettingBool("audio_autoplay")) {
        el.play().catch(() => {})
        setIsPlaying(true)
      }
    }
    if (el.readyState >= 3) {
      doPlay()
    } else {
      el.addEventListener("canplay", doPlay, { once: true })
    }
  })

  // MediaSession 支持
  onMount(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("previoustrack", prevTrack)
      navigator.mediaSession.setActionHandler("nexttrack", nextTrack)
    }
  })

  onCleanup(() => {
    const el = audioEl()
    if (el) {
      el.pause()
      el.src = ""
    }
  })

  return (
    <VStack w="$full" spacing="$2" p="$3">
      {/* 上方：文件名 + 时间 + 进度条 + 控制按钮 */}
      <VStack w="$full" spacing="$1" bg="$neutral2" borderRadius="$md" p="$3">
        <Text
          fontWeight="$semibold"
          w="$full"
          textAlign="center"
          css={{
            "word-break": "break-all",
            "text-overflow": "ellipsis",
            "white-space": "nowrap",
          }}
          overflow="hidden"
        >
          {audios()[currentIndex()]?.name || objStore.obj.name}
        </Text>
        <Text fontSize="$xs" color="$neutral11">
          {formatTime(currentTime())} / {formatTime(duration())}
        </Text>
        <input
          type="range"
          min="0"
          max={duration() || 0}
          value={currentTime()}
          onInput={(e) => {
            const time = parseFloat(e.currentTarget.value)
            const el = audioEl()
            if (el) el.currentTime = time
            setCurrentTime(time)
          }}
          style={{ width: "100%", cursor: "pointer" }}
        />
        <HStack spacing="$3">
          <IconButton
            aria-label={t("home.preview.prev_track")}
            icon={<BsSkipStartFill />}
            variant="ghost"
            size="sm"
            onClick={prevTrack}
          />
          <IconButton
            aria-label={isPlaying() ? t("home.preview.pause") : t("home.preview.play")}
            icon={isPlaying() ? <BsPauseFill /> : <BsPlayFill />}
            variant="solid"
            colorScheme="accent"
            size="sm"
            onClick={togglePlay}
          />
          <IconButton
            aria-label={t("home.preview.next_track")}
            icon={<BsSkipEndFill />}
            variant="ghost"
            size="sm"
            onClick={nextTrack}
          />
        </HStack>
      </VStack>

      {/* 下方：播放列表 */}
      <Show when={audios().length > 1}>
        <VStack w="$full" spacing="0" alignItems="stretch">
          <VStack
            w="$full"
            spacing="0"
            border="1px solid"
            borderColor="$neutral4"
            borderRadius="$md"
            overflow="hidden"
            maxH="40vh"
            overflowY="auto"
          >
            <For each={audios()}>
              {(audio, i) => (
                <HStack
                  w="$full"
                  px="$3"
                  py="$2"
                  spacing="$2"
                  cursor="pointer"
                  bg={i() === currentIndex() ? "$neutral4" : "transparent"}
                  _hover={{ bg: "$neutral3" }}
                  onClick={() => playAtIndex(i())}
                >
                  <Text
                    fontSize="$sm"
                    flex="1"
                    overflow="hidden"
                    css={{
                      "text-overflow": "ellipsis",
                      "white-space": "nowrap",
                    }}
                    fontWeight={i() === currentIndex() ? "$semibold" : "$normal"}
                  >
                    {audio.name}
                  </Text>
                </HStack>
              )}
            </For>
          </VStack>
        </VStack>
      </Show>

      {/* 隐藏的 audio 元素：用 ref 回调设置信号 */}
      <Box
        as="audio"
        ref={(el: HTMLAudioElement) => setAudioEl(el)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => setCurrentTime(audioEl()?.currentTime || 0)}
        onDurationChange={() => setDuration(audioEl()?.duration || 0)}
        onEnded={nextTrack}
        style={{ display: "none" }}
      />
    </VStack>
  )
}

export default Preview
