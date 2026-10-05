import {
  Box,
  Button,
  HStack,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Spacer,
  Switch as HopeSwitch,
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
import { Meta, PEmptyResp, PPageResp } from "~/types"
import { DeletePopover } from "../common/DeletePopover"
import { Wether } from "~/components"

const Metas = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.metas")
  const { to } = useRouter()
  const [getMetasLoading, getMetas] = useFetch((): PPageResp<Meta> =>
    r.get("/admin/meta/list"),
  )
  const [metas, setMetas] = createSignal<Meta[]>([])
  const refresh = async () => {
    const resp = await getMetas()
    handleResp(resp, (data) => setMetas(data.content))
  }
  refresh()

  const [deleting, deleteMeta] = useListFetch((id: number): PEmptyResp =>
    r.post(`/admin/meta/delete?id=${id}`),
  )
  const submitOrders = (list: Meta[]): PEmptyResp =>
    r.post("/admin/meta/order", {
      orders: list.map((m, i) => ({ id: m.id, order: i })),
    })
  const [dragEnabled, setDragEnabled] = createSignal(false)
  const { rowProps, rowHighlight, SortHandle } = useDragSort(async (from, to) => {
    const list = metas().slice()
    const [moved] = list.splice(from, 1)
    list.splice(to, 0, moved)
    setMetas(list)
    handleResp(await submitOrders(list), () => refresh())
  })
  return (
    <VStack spacing="$2" alignItems="start" w="$full">
      <HStack spacing="$2" w="$full">
        <Button
          colorScheme="accent"
          loading={getMetasLoading()}
          onClick={refresh}
        >
          {t("global.refresh")}
        </Button>
        <Button
          onClick={() => {
            to("/@manage/metas/add")
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
              <For each={["path", "password", "write"]}>
                {(title) => <Th>{t(`metas.${title}`)}</Th>}
              </For>
              <Th>{t("global.operations")}</Th>
            </Tr>
          </Thead>
          <Tbody>
            <For each={metas()}>
              {(meta, i) => (
                <Tr
                  {...(dragEnabled() ? rowProps(i()) : {})}
                  css={dragEnabled() ? rowHighlight(i()) : undefined}
                >
                  <Show when={dragEnabled()}>
                    <Td w="$8">
                      <SortHandle />
                    </Td>
                  </Show>
                  <Td>{meta.path}</Td>
                  <Td>{meta.password}</Td>
                  <Td>
                    <Wether yes={meta.write} />
                  </Td>
                  {/* <Td>{meta.hide}</Td> */}
                  <Td>
                    <HStack spacing="$2">
                      <Button
                        onClick={() => {
                          to(`/@manage/metas/edit/${meta.id}`)
                        }}
                      >
                        {t("global.edit")}
                      </Button>
                      <DeletePopover
                        name={meta.path}
                        loading={deleting() === meta.id}
                        onClick={async () => {
                          const resp = await deleteMeta(meta.id)
                          handleResp(resp, () => {
                            notify.success(t("global.delete_success"))
                            refresh()
                          })
                        }}
                      />
                    </HStack>
                  </Td>
                </Tr>
              )}
            </For>
          </Tbody>
        </Table>
      </Box>
    </VStack>
  )
}

export default Metas
