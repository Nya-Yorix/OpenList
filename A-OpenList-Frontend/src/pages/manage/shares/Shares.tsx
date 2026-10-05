import {
  Box,
  Button,
  HStack,
  Spacer,
  Switch as HopeSwitch,
  Table,
  Tbody,
  Th,
  Thead,
  Tooltip,
  Tr,
  VStack,
} from "@hope-ui/solid"
import { createSignal, For, Show } from "solid-js"
import { useFetch, useManageTitle, useRouter, useT, useDragSort } from "~/hooks"
import { PageResp, PEmptyResp, ShareInfo, UserMethods, UserPermissions } from "~/types"
import { handleResp, r } from "~/utils"
import { ShareListItem } from "./Share"
import { me } from "~/store"

const Shares = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.shares")
  const { to } = useRouter()
  const [getSharesLoading, getShares] = useFetch(
    (): Promise<PageResp<ShareInfo>> => r.get("/share/list"),
  )
  const [shares, setShares] = createSignal<ShareInfo[]>([])
  const refresh = async () => {
    const resp = await getShares()
    handleResp(resp, (data) => setShares(data.content))
  }
  const canShare = UserMethods.can(
    me(),
    UserPermissions.findIndex((item) => item === "share"),
  )
  const submitOrders = (list: ShareInfo[]): PEmptyResp =>
    r.post("/share/order", {
      orders: list.map((s, i) => ({ id: s.id, order: i })),
    })
  const [dragEnabled, setDragEnabled] = createSignal(false)
  const { rowProps, rowHighlight, SortHandle } = useDragSort(async (from, to) => {
    const list = shares().slice()
    const [moved] = list.splice(from, 1)
    list.splice(to, 0, moved)
    setShares(list)
    handleResp(await submitOrders(list), () => refresh())
  })
  refresh()
  return (
    <VStack spacing="$3" alignItems="start" w="$full">
      <HStack
        spacing="$2"
        gap="$2"
        w="$full"
        wrap={{
          "@initial": "wrap",
          "@md": "unset",
        }}
      >
        <Button
          colorScheme="accent"
          loading={getSharesLoading()}
          onClick={refresh}
        >
          {t("global.refresh")}
        </Button>
        <Show
          when={!canShare}
          fallback={
            <Button onClick={() => to("/@manage/shares/add")}>
              {t("global.add")}
            </Button>
          }
        >
          <Tooltip
            withArrow
            label={t("shares.no_permission_tip")}
            placement="right"
          >
            <Button disabled> {t("global.add")} </Button>
          </Tooltip>
        </Show>
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
              <For each={["files", "id"]}>
                {(title) => <Th>{t(`shares.${title}`)}</Th>}
              </For>
              <Show when={UserMethods.is_admin(me())}>
                <Th>{t(`shares.creator`)}</Th>
              </Show>
              <For each={["expires", "accessed", "status", "remark"]}>
                {(title) => <Th>{t(`shares.${title}`)}</Th>}
              </For>
              <Th>{t("global.operations")}</Th>
            </Tr>
          </Thead>
          <Tbody>
            <For each={shares()}>
              {(share, i) => (
                <ShareListItem
                  share={share}
                  refresh={refresh}
                  canShare={canShare}
                  handle={dragEnabled() ? <SortHandle /> : undefined}
                  rowProps={dragEnabled() ? rowProps(i()) : undefined}
                  rowHighlight={dragEnabled() ? rowHighlight(i()) : undefined}
                />
              )}
            </For>
          </Tbody>
        </Table>
      </Box>
    </VStack>
  )
}

export default Shares
