import { ContextMenu } from "./context-menu"
import { Pager } from "./Pager"
import { Search } from "./Search"
import ListLayout from "./List"

const Folder = () => {
  return (
    <>
      <ListLayout />
      <Pager />
      <Search />
      <ContextMenu />
    </>
  )
}

export default Folder