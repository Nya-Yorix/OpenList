import {
  Box,
  Button,
  Grid,
  HStack,
  Select,
  SelectContent,
  SelectIcon,
  SelectListbox,
  SelectOption,
  SelectOptionIndicator,
  SelectOptionText,
  SelectPlaceholder,
  SelectTrigger,
  SelectValue,
  Spacer,
  Table,
  Tbody,
  Th,
  Thead,
  Tr,
  VStack,
  Switch as HopeSwitch,
} from "@hope-ui/solid"
import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js"
import { useFetch, useManageTitle, useRouter, useT, useDragSort } from "~/hooks"
import { handleResp, notify, r } from "~/utils"
import { EmptyResp, PageResp, Resp, Storage, PEmptyResp } from "~/types"
import { StorageGridItem, StorageListItem } from "./Storage"
import { createStorageSignal } from "@solid-primitives/storage"

const Storages = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.storages")
  const { to } = useRouter()
  const [getStoragesLoading, getStorages] = useFetch(
    (): Promise<PageResp<Storage>> => r.get("/admin/storage/list"),
  )
  const [storages, setStorages] = createSignal<Storage[]>([])
  const refresh = async () => {
    const resp = await getStorages()
    handleResp(resp, (data) => setStorages(data.content))
  }
  const [drivers, setDrivers] = createSignal<string[]>([])
  const [selectedDrivers, setSelectedDrivers] = createSignal<string[]>([])
  const getDrivers = async () => {
    const resp: Resp<string[]> = await r.get("/admin/driver/names")
    handleResp(resp, (data) => setDrivers(data))
  }
  getDrivers()
  refresh()
  const loadAll = async () => {
    const resp: EmptyResp = await r.post("/admin/storage/load_all")
    handleResp(resp, () => {
      notify.success(t("storages.other.start_load_success"))
    })
  }
  const shownStorages = createMemo(() => {
    return storages().filter((storage) => {
      if (selectedDrivers().length === 0) {
        return true
      }
      return selectedDrivers().includes(storage.driver)
    })
  })
  const submitOrders = (list: Storage[]): PEmptyResp =>
    r.post("/admin/storage/order", {
      orders: list.map((s, i) => ({ id: s.id, order: i })),
    })
  const [dragEnabled, setDragEnabled] = createSignal(false)
  const { rowProps, rowHighlight, SortHandle } = useDragSort(async (from, to) => {
    const shown = shownStorages().slice()
    const [moved] = shown.splice(from, 1)
    shown.splice(to, 0, moved)
    // splice the reordered subset back into the full list at their slots
    const shownIds = new Set(shown.map((s) => s.id))
    let k = 0
    const result = storages().map((s) => (shownIds.has(s.id) ? shown[k++] : s))
    setStorages(result)
    handleResp(await submitOrders(result), () => refresh())
  })
  const [layout, setLayout] = createStorageSignal(
    "storages-layout",
    "table" as "grid" | "table",
  )
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
          loading={getStoragesLoading()}
          onClick={refresh}
        >
          {t("global.refresh")}
        </Button>
        <Button
          onClick={() => {
            to("/@manage/storages/add")
          }}
        >
          {t("global.add")}
        </Button>
        <Button
          colorScheme="warning"
          loading={getStoragesLoading()}
          onClick={loadAll}
        >
          {t("storages.other.load_all")}
        </Button>
        <Show when={drivers().length > 0}>
          <Select
            multiple
            value={selectedDrivers()}
            onChange={setSelectedDrivers}
            // variant="outline"
          >
            <SelectTrigger>
              <SelectPlaceholder>
                {t("storages.other.filter_by_driver")}
              </SelectPlaceholder>
              <SelectValue />
              <SelectIcon />
            </SelectTrigger>
            <SelectContent>
              <SelectListbox>
                <For each={drivers()}>
                  {(item) => (
                    <SelectOption value={item}>
                      <SelectOptionText>
                        {t(`drivers.drivers.${item}`)}
                      </SelectOptionText>
                      <SelectOptionIndicator />
                    </SelectOption>
                  )}
                </For>
              </SelectListbox>
            </SelectContent>
          </Select>
        </Show>
        <HopeSwitch
          checked={layout() === "table"}
          css={{ whiteSpace: "nowrap" }}
          onChange={(e: Event) => {
            setLayout(
              (e.currentTarget as HTMLInputElement).checked ? "table" : "grid",
            )
          }}
        >
          {t("storages.other.table_layout")}
        </HopeSwitch>
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
      <Switch>
        <Match when={layout() === "grid"}>
          <Grid
            w="$full"
            gap="$2_5"
            templateColumns={{
              "@initial": "1fr",
              "@lg": "repeat(auto-fill, minmax(324px, 1fr))",
            }}
          >
            <For each={shownStorages()}>
              {(storage) => (
                <StorageGridItem storage={storage} refresh={refresh} />
              )}
            </For>
          </Grid>
        </Match>
        <Match when={layout() === "table"}>
          <Box w="$full" overflowX="auto">
            <Table highlightOnHover dense>
              <Thead>
                <Tr>
                  <Show when={dragEnabled()}>
                    <Th w="$8" />
                  </Show>
                  <For
                    each={[
                      "mount_path",
                      "driver",
                      "order",
                      "usage",
                      "status",
                      "remark",
                    ]}
                  >
                    {(title) => <Th>{t(`storages.common.${title}`)}</Th>}
                  </For>
                  <Th>{t("global.operations")}</Th>
                </Tr>
              </Thead>
              <Tbody>
                <For each={shownStorages()}>
                  {(storage, i) => (
                    <StorageListItem
                      storage={storage}
                      refresh={refresh}
                      handle={dragEnabled() ? <SortHandle /> : undefined}
                      rowProps={dragEnabled() ? rowProps(i()) : undefined}
                      rowHighlight={
                        dragEnabled() ? rowHighlight(i()) : undefined
                      }
                    />
                  )}
                </For>
              </Tbody>
            </Table>
          </Box>
        </Match>
      </Switch>
    </VStack>
  )
}

export default Storages
