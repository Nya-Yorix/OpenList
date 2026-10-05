import {
  Badge,
  Box,
  Button,
  HStack,
  Spacer,
  Switch as HopeSwitch,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tooltip,
  Tr,
  VStack,
} from "@hope-ui/solid"
import { createSignal, For, Show } from "solid-js"
import {
  useFetch,
  useListFetch,
  useManageTitle,
  useRouter,
  useT,
  useDragSort,
} from "~/hooks"
import { handleResp, notify, r } from "~/utils"
import {
  User,
  UserMethods,
  VisibleUserPermissions,
  PPageResp,
  PEmptyResp,
} from "~/types"
import { DeletePopover } from "../common/DeletePopover"
import { Wether } from "~/components"

const Role = (props: { role: number }) => {
  const roles = [
    { name: "general", color: "info" },
    { name: "guest", color: "neutral" },
    { name: "admin", color: "accent" },
  ]
  return (
    <Badge colorScheme={roles[props.role].color as any}>
      {roles[props.role].name}
    </Badge>
  )
}

const Permissions = (props: { user: User }) => {
  const t = useT()
  const color = (can: boolean) => `$${can ? "success" : "danger"}9`
  return (
    <HStack spacing="$0_5">
      <For each={VisibleUserPermissions}>
        {(item) => (
          <Tooltip label={t(`users.permissions.${item.name}`)}>
            <Box
              boxSize="$2"
              rounded="$full"
              bg={color(UserMethods.can(props.user, item.index))}
            ></Box>
          </Tooltip>
        )}
      </For>
    </HStack>
  )
}

const Users = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.users")
  const { to } = useRouter()
  const [getUsersLoading, getUsers] = useFetch((): PPageResp<User> =>
    r.get("/admin/user/list"),
  )
  const [users, setUsers] = createSignal<User[]>([])
  const refresh = async () => {
    const resp = await getUsers()
    handleResp(resp, (data) => setUsers(data.content))
  }
  refresh()

  const [deleting, deleteUser] = useListFetch((id: number): PEmptyResp =>
    r.post(`/admin/user/delete?id=${id}`),
  )
  const [cancel_2faId, cancel_2fa] = useListFetch((id: number): PEmptyResp =>
    r.post(`/admin/user/cancel_2fa?id=${id}`),
  )
  const [dragEnabled, setDragEnabled] = createSignal(false)
  const submitOrders = (list: User[]): PEmptyResp =>
    r.post("/admin/user/order", {
      orders: list.map((u, i) => ({ id: u.id, order: i })),
    })
  const { rowProps, rowHighlight, SortHandle } = useDragSort(
    async (from, to) => {
      const list = users().slice()
      const [moved] = list.splice(from, 1)
      list.splice(to, 0, moved)
      setUsers(list)
      handleResp(await submitOrders(list), () => refresh())
    },
  )
  return (
    <VStack spacing="$2" alignItems="start" w="$full">
      <HStack spacing="$2" w="$full">
        <Button
          colorScheme="accent"
          loading={getUsersLoading()}
          onClick={refresh}
        >
          {t("global.refresh")}
        </Button>
        <Button
          onClick={() => {
            to("/@manage/users/add")
          }}
        >
          {t("global.add")}
        </Button>
        <Spacer />
        <HopeSwitch
          checked={dragEnabled()}
          css={{ whiteSpace: "nowrap" }}
          onChange={(e: Event) =>
            setDragEnabled((e.currentTarget as HTMLInputElement).checked)
          }
        >
          {t("global.drag_sort")}
        </HopeSwitch>
      </HStack>
      <Box w="$full" overflowX="auto">
        <Table highlightOnHover dense>
          <Thead>
            <Tr>
              <Show when={dragEnabled()}>
                <Th w="$8" />
              </Show>
              <For
                each={[
                  "username",
                  "base_path",
                  "role",
                  "permission",
                  "available",
                ]}
              >
                {(title) => <Th>{t(`users.${title}`)}</Th>}
              </For>
              <Th>{t("global.operations")}</Th>
            </Tr>
          </Thead>
          <Tbody>
            <For each={users()}>
              {(user, i) => {
                const fixed =
                  UserMethods.is_admin(user) || UserMethods.is_guest(user)
                return (
                <Tr
                  {...(fixed || !dragEnabled() ? {} : rowProps(i()))}
                  css={fixed || !dragEnabled() ? undefined : rowHighlight(i())}
                >
                  <Show when={dragEnabled()}>
                    <Td w="$8">{fixed ? null : <SortHandle />}</Td>
                  </Show>
                  <Td>{user.username}</Td>
                  <Td>{user.base_path}</Td>
                  <Td>
                    <Role role={user.role} />
                  </Td>
                  <Td>
                    <Permissions user={user} />
                  </Td>
                  <Td>
                    <Wether yes={!user.disabled} />
                  </Td>
                  <Td>
                    <HStack spacing="$2">
                      <Button
                        onClick={() => {
                          to(`/@manage/users/edit/${user.id}`)
                        }}
                      >
                        {t("global.edit")}
                      </Button>
                      <DeletePopover
                        name={user.username}
                        loading={deleting() === user.id}
                        onClick={async () => {
                          const resp = await deleteUser(user.id)
                          handleResp(resp, () => {
                            notify.success(t("global.delete_success"))
                            refresh()
                          })
                        }}
                      />
                      <Button
                        colorScheme="accent"
                        loading={cancel_2faId() === user.id}
                        onClick={async () => {
                          const resp = await cancel_2fa(user.id)
                          handleResp(resp, () => {
                            notify.success(t("users.cancel_2fa_success"))
                            refresh()
                          })
                        }}
                      >
                        {t("users.cancel_2fa")}
                      </Button>
                    </HStack>
                  </Td>
                </Tr>
                )
              }}
            </For>
          </Tbody>
        </Table>
      </Box>
    </VStack>
  )
}

export default Users
