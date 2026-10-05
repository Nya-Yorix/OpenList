import { createSignal } from "solid-js"
import { Box } from "@hope-ui/solid"
import { BsList } from "solid-icons/bs"
import { useT } from "."

/**
 * Native HTML5 drag-and-drop row sorting for tables.
 * Only the grip handle enables row dragging (press handle -> row draggable).
 * Returns props to spread on the handle element and each table row.
 */
export function useDragSort(onReorder: (from: number, to: number) => void) {
  const t = useT()
  const [dragIndex, setDragIndex] = createSignal(-1)
  const [overIndex, setOverIndex] = createSignal(-1)
  const [canDrag, setCanDrag] = createSignal(false)

  const reset = () => {
    setDragIndex(-1)
    setOverIndex(-1)
    setCanDrag(false)
  }

  const handleProps = () => ({
    onMouseDown: () => setCanDrag(true),
    onMouseUp: () => setCanDrag(false),
  })

  const rowProps = (index: number) => ({
    draggable: canDrag(),
    onDragStart: (e: DragEvent) => {
      e.dataTransfer?.setData("text/plain", String(index))
      if (e.dataTransfer) e.dataTransfer.effectAllowed = "move"
      setDragIndex(index)
    },
    onDragOver: (e: DragEvent) => {
      if (dragIndex() < 0) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move"
      if (overIndex() !== index) setOverIndex(index)
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      const from = dragIndex()
      const to = index
      reset()
      if (from >= 0 && from !== to) onReorder(from, to)
    },
    onDragEnd: reset,
  })

  const rowHighlight = (index: number) =>
    dragIndex() >= 0 && dragIndex() !== index && overIndex() === index
      ? { backgroundColor: "$primary2" }
      : {}

  const SortHandle = () => (
    <Box
      as="span"
      aria-label={t("global.drag_sort")}
      title={t("global.drag_sort")}
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      boxSize="$7"
      rounded="$sm"
      cursor="grab"
      color="$neutral10"
      _hover={{ color: "$primary9", backgroundColor: "$primary3" }}
      _active={{ cursor: "grabbing" }}
      {...handleProps()}
    >
      <BsList size={24} />
    </Box>
  )

  return { rowProps, rowHighlight, SortHandle }
}
