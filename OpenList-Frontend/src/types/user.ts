export enum UserRole {
  GENERAL,
  GUEST,
  ADMIN,
}

export interface User {
  id: number
  username: string
  password: string
  base_path: string
  role: UserRole
  permission: number
  disabled: boolean
  // otp: boolean;
}

export const UserPermissions = [
  "see_hides",
  "access_without_password",
  "write_content",
  "rename",
  "move",
  "copy",
  "delete",
  "webdav_read",
  "webdav_manage",
  "read_archives",
  "decompress",
  "share",
  "customize_share_id",
] as const

export const UserMethods = {
  is_guest: (user: User) => user.role === UserRole.GUEST,
  is_admin: (user: User) => user.role === UserRole.ADMIN,
  is_general: (user: User) => user.role === UserRole.GENERAL,
  can: (user: User, permission: number) => {
    return ((user.permission >> permission) & 1) == 1
  },
}
