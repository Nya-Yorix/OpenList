import { Type } from "."

export enum Group {
  SINGLE,
  SITE,
  STYLE,
  PREVIEW,
  GLOBAL,
  INDEX,
  TRAFFIC,
}
export enum Flag {
  PUBLIC,
  PRIVATE,
  READONLY,
}

export interface SettingItem {
  key: string
  value: string
  type: Type
  help: string
  options?: string
  group: Group
  flag: Flag
}
