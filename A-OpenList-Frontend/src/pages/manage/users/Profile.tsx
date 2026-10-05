import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  SimpleGrid,
  VStack,
  Text,
} from "@hope-ui/solid"
import { createSignal, For, JSXElement, Show } from "solid-js"
import { LinkWithBase } from "~/components"
import { useFetch, useManageTitle, useRouter, useT, useUtil } from "~/hooks"
import { setMe, me } from "~/store"
import {
  Group,
  PEmptyResp,
  PResp,
  SettingItem,
  UserMethods,
  VisibleUserPermissions,
} from "~/types"
import { handleResp, notify, r } from "~/utils"
import { FiEye, FiEyeOff, FiRotateCcw } from "solid-icons/fi"

const PermissionBadge = (props: { can: boolean; children: JSXElement }) => {
  return (
    <Badge colorScheme={props.can ? "success" : "danger"}>
      {props.children}
    </Badge>
  )
}

const Profile = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.profile")
  const { to } = useRouter()
  const [username, setUsername] = createSignal(me().username)
  const [password, setPassword] = createSignal("")
  const [confirmPassword, setConfirmPassword] = createSignal("")
  const [loading, save] = useFetch((): PEmptyResp =>
    r.post("/me/update", {
      username: username(),
      password: password(),
    }),
  )

  const saveMe = async () => {
    if (password() && password() !== confirmPassword()) {
      notify.warning(t("users.confirm_password_not_same"))
      return
    }
    const resp = await save()
    handleResp(resp, () => {
      setMe({ ...me(), username: username() })
      notify.success(t("users.update_profile_success"))
      to(`/@login?redirect=${encodeURIComponent(location.pathname)}`)
    })
  }

  const isAdmin = UserMethods.is_admin(me())
  const [token, setToken] = createSignal("")
  const [showToken, setShowToken] = createSignal(false)
  const [tokenHover, setTokenHover] = createSignal(false)
  const [tokenLoading, getToken] = useFetch((): PResp<SettingItem[]> =>
    r.get(`/admin/setting/list?groups=${Group.SINGLE}`),
  )
  if (isAdmin) {
    getToken().then((resp) => {
      handleResp(resp, (data) => {
        setToken(data.find((i) => i.key === "token")?.value || "")
      })
    })
  }
  const [resetTokenLoading, resetTokenReq] = useFetch((): PResp<string> =>
    r.post("/admin/setting/reset_token"),
  )
  const { copy } = useUtil()
  return (
    <VStack w="$full" spacing="$4" alignItems="start">
      <Show
        when={!UserMethods.is_guest(me())}
        fallback={
          <>
            <Alert
              status="warning"
              flexDirection={{
                "@initial": "column",
                "@lg": "row",
              }}
            >
              <AlertIcon mr="$2_5" />
              <AlertTitle mr="$2_5">{t("users.guest-tips")}</AlertTitle>
              <AlertDescription>{t("users.modify_nothing")}</AlertDescription>
            </Alert>
            <HStack spacing="$2">
              <Text>{t("global.have_account")}</Text>
              <Text
                color="$info9"
                as={LinkWithBase}
                href={`/@login?redirect=${encodeURIComponent(
                  location.pathname,
                )}`}
              >
                {t("global.go_login")}
              </Text>
            </HStack>
          </>
        }
      >
        <Heading>{t("users.update_profile")}</Heading>
        <SimpleGrid gap="$2" columns={{ "@initial": 1, "@md": 2 }}>
          <FormControl>
            <FormLabel for="username">{t("users.change_username")}</FormLabel>
            <Input
              id="username"
              value={username()}
              onInput={(e) => {
                setUsername(e.currentTarget.value)
              }}
            />
          </FormControl>
        </SimpleGrid>
        <SimpleGrid gap="$2" columns={{ "@initial": 1, "@md": 2 }}>
          <FormControl>
            <FormLabel for="password">{t("users.change_password")}</FormLabel>
            <Input
              id="password"
              type="password"
              placeholder="********"
              value={password()}
              onInput={(e) => {
                setPassword(e.currentTarget.value)
              }}
            />
            <FormHelperText>{t("users.change_password-tips")}</FormHelperText>
          </FormControl>
          <FormControl>
            <FormLabel for="confirm-password">
              {t("users.confirm_password")}
            </FormLabel>
            <Input
              id="confirm-password"
              type="password"
              placeholder="********"
              value={confirmPassword()}
              onInput={(e) => {
                setConfirmPassword(e.currentTarget.value)
              }}
            />
            <FormHelperText>{t("users.confirm_password-tips")}</FormHelperText>
          </FormControl>
        </SimpleGrid>
        <HStack spacing="$2">
          <Button loading={loading()} onClick={saveMe}>
            {t("global.save")}
          </Button>
          <Show when={!me().otp}>
            <Button
              colorScheme="accent"
              onClick={() => {
                to("/@manage/2fa")
              }}
            >
              {t("users.enable_2fa")}
            </Button>
          </Show>
        </HStack>
        <Show when={isAdmin}>
          <FormControl w="$full" maxW="850px">
            <FormLabel>{t("users.api_token")}</FormLabel>
            <InputGroup
              w="$full"
              onMouseEnter={() => setTokenHover(true)}
              onMouseLeave={() => setTokenHover(false)}
              onClick={() => {
                if (token()) copy(token())
              }}
            >
              <Input
                readOnly
                cursor="pointer"
                bg="transparent"
                font-family="monospace"
                css={{ userSelect: "none" }}
                value={showToken() ? token() : "•".repeat(67)}
              />
              <InputRightElement w="$20">
                <HStack
                  spacing="$1"
                  px="$1"
                  rounded="$sm"
                  bgColor="$neutral1"
                  shadow="$sm"
                  opacity={tokenHover() ? 1 : 0}
                  pointerEvents={tokenHover() ? "auto" : "none"}
                  transition="opacity 150ms ease"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconButton
                    aria-label={
                      showToken()
                        ? t("users.hide_token")
                        : t("users.show_token")
                    }
                    icon={showToken() ? <FiEyeOff /> : <FiEye />}
                    onClick={() => setShowToken(!showToken())}
                    variant="ghost"
                    size="xs"
                  />
                  <IconButton
                    aria-label={t("users.reset_token")}
                    icon={<FiRotateCcw />}
                    variant="ghost"
                    colorScheme="danger"
                    size="xs"
                    loading={resetTokenLoading()}
                    onClick={async () => {
                      const resp = await resetTokenReq()
                      handleResp(resp, (data) => {
                        notify.success(t("users.reset_token_success"))
                        setToken(data)
                        setShowToken(true)
                      })
                    }}
                  />
                </HStack>
              </InputRightElement>
            </InputGroup>
            <FormHelperText>{t("users.api_token-tips")}</FormHelperText>
          </FormControl>
        </Show>
      </Show>
      <HStack wrap="wrap" gap="$2" mt="$2">
        <For each={VisibleUserPermissions}>
          {(item) => (
            <PermissionBadge can={UserMethods.can(me(), item.index)}>
              {t(`users.permissions.${item.name}`)}
            </PermissionBadge>
          )}
        </For>
      </HStack>
    </VStack>
  )
}

export default Profile
