package errs

import (
	"errors"
	"fmt"

	pkgerr "github.com/pkg/errors"
)

var (
	NotImplement = errors.New("not implement")
	NotSupport   = errors.New("not support")
	RelativePath = errors.New("using relative path is not allowed")

	UploadNotSupported = errors.New("upload not supported")
	MetaNotFound       = errors.New("meta not found")
	StorageNotFound    = errors.New("storage not found")
	StorageNotInit     = errors.New("storage not init")

	UnknownArchiveFormat      = errors.New("unknown archive format")
	WrongArchivePassword      = errors.New("wrong archive password")
	DriverExtractNotSupported = errors.New("driver extraction not supported")

	WrongShareCode  = errors.New("wrong share code")
	InvalidSharing  = errors.New("invalid sharing")
	SharingNotFound = errors.New("sharing not found")

	FileExists           = errors.New("file exists")
	EmptyFileNames       = errors.New("empty file names")
	InvalidFileName      = errors.New("invalid file name")
	UserNotFound         = errors.New("user not found")
	GuestDisabled        = errors.New("guest user is disabled, login please")
	InvalidCredentials   = errors.New("password is incorrect or you have no permission")
	AdminGuestForbidden  = errors.New("admin or guest user can not be created")
	RoleChangeForbidden  = errors.New("role can not be changed")
	AdminDisableForbidden = errors.New("admin user can not be disabled")
	GuestProfileForbidden = errors.New("guest cannot update profile")
	Guest2FAForbidden     = errors.New("guest cannot generate 2fa")
	Invalid2FACode       = errors.New("invalid 2fa code")
	TooManyAttempts      = errors.New("too many attempts")
	InvalidUsernameOrPassword = errors.New("invalid username or password")
	GuestCannotUpdateProfile  = errors.New("guest cannot update profile")
	GuestCannotGenerate2FA    = errors.New("guest cannot generate 2fa")
	InvalidShareID            = errors.New("invalid share id")
	ShareArchivePreviewForbidden = errors.New("sharing archives previewing is not allowed")
	MustAddAtLeastOneObject   = errors.New("must add at least 1 object")
	NoSuchUser                = errors.New("no such a user")
	MultipartDisabled         = errors.New("multipart upload is disabled")
	MultipartRequiresSize     = errors.New("multipart upload requires a valid X-File-Size header")
	MultipartRequiresPositiveSize = errors.New("multipart upload requires a positive X-File-Size; upload empty files via /fs/put")
	InvalidChunkIndex         = errors.New("invalid X-Chunk-Index header")
	StatusLookupRequiresID    = errors.New("status lookup requires upload_id, or path and size")
	ManualScanNotRunning      = errors.New("manual scan is not running")
	IndexIsRunning            = errors.New("index is running")
	UpdateNotSupported        = errors.New("update is not supported for current index")
	IndexNotRunning           = errors.New("index is not running")
	DriverNotFound            = errors.New("driver not found")
	TaskNotFound              = errors.New("task not found")
	UserInvalid               = errors.New("user invalid")
	InvalidRequestFormat      = errors.New("invalid request format")
	PasswordChanged           = errors.New("password has been changed, login please")
	UserDisabled              = errors.New("current user is disabled, replace please")
	GuestForbidden            = errors.New("you are a guest")
	NotAdmin                  = errors.New("you are not an admin")
)

// NewErr wrap constant error with an extra message
// use errors.Is(err1, StorageNotFound) to check if err belongs to any internal error
func NewErr(err error, format string, a ...any) error {
	return fmt.Errorf("%w; %s", err, fmt.Sprintf(format, a...))
}

func IsNotFoundError(err error) bool {
	return errors.Is(pkgerr.Cause(err), ObjectNotFound) || errors.Is(pkgerr.Cause(err), StorageNotFound)
}

func IsNotSupportError(err error) bool {
	return errors.Is(pkgerr.Cause(err), NotSupport)
}
func IsNotImplementError(err error) bool {
	return errors.Is(pkgerr.Cause(err), NotImplement)
}
