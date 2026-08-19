import { Resp } from "~/types"
import { bus } from "./bus"
import { notify } from "./notify"
import { useT } from "~/hooks"

export const handleResp = <T>(
  resp: Resp<T>,
  success?: (data: T) => void,
  fail?: (message: string, code: number) => void,
  auth: boolean = true,
  notify_error: boolean = true,
  notify_success?: boolean,
) => {
  if (resp.code === 200) {
    notify_success && notify.success(resp.message)
    success?.(resp.data)
  } else {
    // 如果有错误码，使用翻译后的错误信息
    const t = useT()
    let errorMessage = resp.message
    if (resp.error_code) {
      const translated = t(`errors.${resp.error_code}`)
      // 如果翻译存在（不等于错误码本身），使用翻译后的信息
      if (translated !== `errors.${resp.error_code}`) {
        errorMessage = translated
      }
    }
    notify_error && notify.error(errorMessage)
    if (auth && resp.code === 401) {
      if (location.pathname === "/@manage") {
        bus.emit("to", "/")
      } else {
        bus.emit(
          "to",
          `/@login?redirect=${encodeURIComponent(location.pathname)}`,
        )
      }
      return
    }
    fail?.(errorMessage, resp.code)
  }
}

export const handleRespWithoutAuth = <T>(
  resp: Resp<T>,
  success?: (data: T) => void,
  fail?: (message: string, code?: number) => void,
  notify_error: boolean = true,
) => {
  return handleResp(resp, success, fail, false, notify_error)
}

export const handleRespWithoutNotify = <T>(
  resp: Resp<T>,
  success?: (data: T) => void,
  fail?: (message: string, code?: number) => void,
  auth: boolean = true,
) => {
  return handleResp(resp, success, fail, auth, false)
}

export const handleRespWithoutAuthAndNotify = <T>(
  resp: Resp<T>,
  success?: (data: T) => void,
  fail?: (message: string, code?: number) => void,
) => {
  return handleResp(resp, success, fail, false, false)
}

export const handleRespWithNotifySuccess = <T>(
  resp: Resp<T>,
  success?: (data: T) => void,
  fail?: (message: string, code?: number) => void,
  auth: boolean = true,
  notify_error: boolean = true,
) => {
  return handleResp(resp, success, fail, auth, notify_error, true)
}
