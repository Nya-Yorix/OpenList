import * as i18n from "@solid-primitives/i18n"
import { createResource, createSignal } from "solid-js"
export { i18n }

// glob search by Vite
const langs = import.meta.glob("~/lang/*/index.json", {
  eager: true,
  import: "lang",
})

// preferred display order: Simplified Chinese, Neko Chinese, English, then the rest
const preferredLangOrder = ["zh", "zh_neko", "en"]

// all available languages
export const languages = Object.keys(langs)
  .map((langPath) => {
    const langCode = langPath.split("/")[3]
    const langName = langs[langPath] as string
    return { code: langCode, lang: langName }
  })
  .sort((a, b) => {
    const ia = preferredLangOrder.indexOf(a.code)
    const ib = preferredLangOrder.indexOf(b.code)
    if (ia === -1 && ib === -1) return 0
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })

// determine browser's default language
const userLang = navigator.language.toLowerCase()
const userLangParts = userLang.split("-")
// Devices using Simplified Chinese should default to the Neko Chinese pack.
const isTraditionalChinese = ["hant", "tw", "hk", "mo"].some((tag) =>
  userLangParts.includes(tag),
)
const isSimplifiedChinese = userLangParts[0] === "zh" && !isTraditionalChinese
const hasLang = (code: string) => languages.some((lang) => lang.code === code)
const defaultLang =
  (isSimplifiedChinese && hasLang("zh_neko") ? "zh_neko" : undefined) ||
  languages.find((lang) => lang.code.toLowerCase() === userLang)?.code ||
  languages.find(
    (lang) => lang.code.toLowerCase().split("-")[0] === userLangParts[0],
  )?.code ||
  "en"

// Get initial language from localStorage or fallback to defaultLang
export let initialLang = localStorage.getItem("lang") ?? defaultLang

if (!languages.some((lang) => lang.code === initialLang)) {
  initialLang = defaultLang
}

// Type imports
// use `type` to not include the actual dictionary in the bundle
import type * as en from "~/lang/en/entry"

export type Lang = keyof typeof langs
export type RawDictionary = typeof en.dict
export type Dictionary = i18n.Flatten<RawDictionary>

// English dictionary cache for fallback
let enDictCache: Dictionary | null = null

const fetchEnDict = async (): Promise<Dictionary> => {
  if (!enDictCache) {
    const dict: RawDictionary = (await import("~/lang/en/entry")).dict
    enDictCache = i18n.flatten(dict)
  }
  return enDictCache
}

// Fetch and flatten the dictionary, with English fallback
const fetchDictionary = async (locale: Lang): Promise<Dictionary> => {
  try {
    const dict: RawDictionary = (await import(`~/lang/${locale}/entry.ts`)).dict
    const flatDict = i18n.flatten(dict)

    // If not English, merge with English as fallback (English keys underneath, locale on top)
    if (locale !== "en") {
      const enDict = await fetchEnDict()
      return { ...enDict, ...flatDict } as Dictionary
    }

    return flatDict
  } catch (err) {
    console.error(`Error loading dictionary for locale: ${locale}`, err)
    // Fallback to English if the requested locale fails to load
    if (locale !== "en") {
      return await fetchEnDict()
    }
    throw new Error(`Failed to load dictionary for ${locale}`)
  }
}

// Signals to track current language and dictionary state
export const [currentLang, setCurrentLang] = createSignal<Lang>(initialLang)

export const [dict] = createResource(currentLang, fetchDictionary)
