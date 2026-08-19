import { useColorModeValue } from "@hope-ui/solid"

export const hoverColor = () => "rgba(132,133,141,0.18)"

export const alphaColor = (level: number, reverse = false) => {
  if (reverse) {
    return `rgba(0,0,0,${level / 100})`
  }
  return `rgba(255,255,255,${level / 100})`
}

export const alphaBgColor = () =>
  useColorModeValue("$whiteAlpha10", "$blackAlpha11")()
