import { VStack } from "@hope-ui/solid"
import { Nav } from "./Nav"
import { Obj } from "./Obj"
import { Container } from "./Container"
import { Sidebar } from "./Sidebar"
import { Readme } from "./Readme"

export const Body = () => {
  return (
    <Container>
      <VStack
        class="body"
        mt="$1"
        py="$2"
        px="2%"
        minH="80vh"
        w="$full"
        gap="$4"
      >
        <Readme files={["header.md", "top.md", "index.md"]} fromMeta="header" />
        <Nav />
        <Obj />
        <Readme
          files={["readme.md", "footer.md", "bottom.md"]}
          fromMeta="readme"
        />
        <Sidebar />
      </VStack>
    </Container>
  )
}