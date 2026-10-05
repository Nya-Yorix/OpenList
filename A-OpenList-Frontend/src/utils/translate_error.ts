import { dict, i18n } from "~/app/i18n"

// Module-level translator, same source as useT, so this can run outside components.
const translator = i18n.translator(dict)

// Backend error fragments (lowercase, matched as substrings) mapped to errors.json keys.
// Order matters: more specific fragments must come before generic ones.
const BACKEND_ERROR_MAP: [string, string][] = [
  ["please add a storage first", "STORAGE_NOT_FOUND"],
  ["storage not found", "STORAGE_NOT_FOUND"],
  ["storage not init", "STORAGE_NOT_INIT"],
  ["failed get storage driver", "STORAGE_DRIVER_ERROR"],
  ["object not found", "OBJECT_NOT_FOUND"],
  ["object already exists", "FILE_EXISTS"],
  ["system file upload ignored", "IGNORED_SYSTEM_FILE"],
  ["using relative path is not allowed", "RELATIVE_PATH"],
  ["upload not supported", "UPLOAD_NOT_SUPPORTED"],
  ["meta not found", "META_NOT_FOUND"],
  ["upload/download stream incomplete", "STREAM_ERROR"],
  ["unknown archive format", "UNKNOWN_ARCHIVE_FORMAT"],
  ["wrong archive password", "WRONG_ARCHIVE_PASSWORD"],
  ["driver extraction not supported", "DRIVER_EXTRACT_NOT_SUPPORTED"],
  ["wrong share code", "WRONG_SHARE_CODE"],
  ["invalid sharing", "INVALID_SHARING"],
  ["sharing not found", "SHARING_NOT_FOUND"],
  ["search not available", "SEARCH_NOT_AVAILABLE"],
  ["build index is running", "INDEX_IS_RUNNING"],
  ["password is incorrect or you have no permission", "PERMISSION_DENIED"],
  ["permission denied", "PERMISSION_DENIED"],
  ["invalid username or password", "INVALID_CREDENTIALS"],
  ["guest user is disabled", "USER_DISABLED"],
  ["not implement", "NOT_IMPLEMENT"],
  ["not support", "NOT_SUPPORT"],
]

// Map a raw backend (English) error message to an errors.json key.
// Returns undefined when no known fragment matches.
export const backendErrorKey = (message: string): string | undefined => {
  if (!message) return undefined
  const lower = message.toLowerCase()
  return BACKEND_ERROR_MAP.find(([fragment]) => lower.includes(fragment))?.[1]
}

// Translate a raw backend error message into the current locale.
// Unmatched (e.g. dynamic) messages are returned unchanged so no information is lost.
export const translateBackendError = (message: string): string => {
  if (!message) return message
  const key = backendErrorKey(message)
  if (!key) return message
  const value = translator(`errors.${key}`)
  return typeof value === "string" ? value : message
}
