package errs

// 错误码常量，用于前端国际化
const (
	// 存储相关
	ErrorCodeStorageNotFound    = "STORAGE_NOT_FOUND"
	ErrorCodeStorageNotInit     = "STORAGE_NOT_INIT"
	ErrorCodeStorageDriverError = "STORAGE_DRIVER_ERROR"

	// 搜索相关
	ErrorCodeSearchNotAvailable = "SEARCH_NOT_AVAILABLE"

	// 分享相关
	ErrorCodeShareNotFound   = "SHARE_NOT_FOUND"
	ErrorCodeShareCodeWrong  = "SHARE_CODE_WRONG"
	ErrorCodeShareInvalid    = "SHARE_INVALID"
	ErrorCodeShareExpired    = "SHARE_EXPIRED"

	// 用户相关
	ErrorCodeUserDisabled      = "USER_DISABLED"
	ErrorCodeLoginRequired     = "LOGIN_REQUIRED"
	ErrorCodeAdminGuestForbidden = "ADMIN_GUEST_FORBIDDEN"
	ErrorCodeRoleChangeForbidden = "ROLE_CHANGE_FORBIDDEN"
	ErrorCodeAdminDisableForbidden = "ADMIN_DISABLE_FORBIDDEN"
	ErrorCodeGuestProfileForbidden = "GUEST_PROFILE_FORBIDDEN"
	ErrorCodeGuest2FAForbidden   = "GUEST_2FA_FORBIDDEN"
	ErrorCodeInvalid2FACode      = "INVALID_2FA_CODE"
	ErrorCodeTooManyAttempts     = "TOO_MANY_ATTEMPTS"
	ErrorCodeInvalidCredentials  = "INVALID_CREDENTIALS"

	// 文件相关
	ErrorCodeFileNotFound      = "FILE_NOT_FOUND"
	ErrorCodeFileExists        = "FILE_EXISTS"
	ErrorCodeUploadFailed      = "UPLOAD_FAILED"
	ErrorCodeDownloadFailed    = "DOWNLOAD_FAILED"
	ErrorCodeDeleteFailed      = "DELETE_FAILED"
	ErrorCodeRenameFailed      = "RENAME_FAILED"
	ErrorCodeMoveFailed        = "MOVE_FAILED"
	ErrorCodeCopyFailed        = "COPY_FAILED"
	ErrorCodeCreateDirFailed   = "CREATE_DIR_FAILED"
	ErrorCodeEmptyFileNames    = "EMPTY_FILE_NAMES"
	ErrorCodeInvalidFileName   = "INVALID_FILE_NAME"
	ErrorCodeIgnoredSystemFile = "IGNORED_SYSTEM_FILE"

	// 任务相关
	ErrorCodeTaskNotFound = "TASK_NOT_FOUND"
	ErrorCodeTaskFailed   = "TASK_FAILED"

	// 权限相关
	ErrorCodePermissionDenied = "PERMISSION_DENIED"
	ErrorCodeNoSuchUser       = "NO_SUCH_USER"
	ErrorCodeUserNotFound     = "USER_NOT_FOUND"
	ErrorCodeGuestForbidden   = "GUEST_FORBIDDEN"
	ErrorCodeNotAdmin         = "NOT_ADMIN"
	ErrorCodePasswordChanged  = "PASSWORD_CHANGED"
	ErrorCodeUserDisabledError = "USER_DISABLED_ERROR"

	// 上传相关
	ErrorCodeMultipartDisabled          = "MULTIPART_DISABLED"
	ErrorCodeMultipartRequiresSize      = "MULTIPART_REQUIRES_SIZE"
	ErrorCodeMultipartRequiresPositiveSize = "MULTIPART_REQUIRES_POSITIVE_SIZE"
	ErrorCodeInvalidChunkIndex          = "INVALID_CHUNK_INDEX"
	ErrorCodeStatusLookupRequiresID     = "STATUS_LOOKUP_REQUIRES_ID"

	// 索引/扫描相关
	ErrorCodeManualScanNotRunning = "MANUAL_SCAN_NOT_RUNNING"
	ErrorCodeIndexIsRunning       = "INDEX_IS_RUNNING"
	ErrorCodeUpdateNotSupported   = "UPDATE_NOT_SUPPORTED"
	ErrorCodeIndexNotRunning      = "INDEX_NOT_RUNNING"

	// 驱动相关
	ErrorCodeDriverNotFound = "DRIVER_NOT_FOUND"

	// 通用
	ErrorCodeBadRequest   = "BAD_REQUEST"
	ErrorCodeForbidden    = "FORBIDDEN"
	ErrorCodeInternal     = "INTERNAL_ERROR"
	ErrorCodeNotImplement = "NOT_IMPLEMENT"
	ErrorCodeNotSupport   = "NOT_SUPPORT"
	ErrorCodeUploadNotSupported = "UPLOAD_NOT_SUPPORTED"
)

// GetErrorCode 根据错误类型返回错误码
func GetErrorCode(err error) string {
	if err == nil {
		return ""
	}

	errMsg := err.Error()

	// 存储相关
	if IsNotFoundError(err) || contains(errMsg, "storage not found") {
		return ErrorCodeStorageNotFound
	}
	if contains(errMsg, "storage not init") {
		return ErrorCodeStorageNotInit
	}

	// 搜索相关
	if contains(errMsg, "search not available") {
		return ErrorCodeSearchNotAvailable
	}

	// 分享相关
	if contains(errMsg, "sharing not found") {
		return ErrorCodeShareNotFound
	}
	if contains(errMsg, "wrong share code") || contains(errMsg, "invalid share id") {
		return ErrorCodeShareCodeWrong
	}
	if contains(errMsg, "invalid sharing") {
		return ErrorCodeShareInvalid
	}
	if contains(errMsg, "share has expired") {
		return ErrorCodeShareExpired
	}
	if contains(errMsg, "sharing archives previewing is not allowed") {
		return ErrorCodeShareInvalid
	}
	if contains(errMsg, "must add at least 1 object") {
		return ErrorCodeBadRequest
	}
	if contains(errMsg, "no such a user") {
		return ErrorCodeNoSuchUser
	}
	if contains(errMsg, "permission denied to share path") {
		return ErrorCodePermissionDenied
	}

	// 用户相关
	if contains(errMsg, "user has been disabled") || contains(errMsg, "current user is disabled") {
		return ErrorCodeUserDisabled
	}
	if contains(errMsg, "login please") || contains(errMsg, "guest user is disabled") {
		return ErrorCodeLoginRequired
	}
	if contains(errMsg, "admin or guest user can not be created") {
		return ErrorCodeAdminGuestForbidden
	}
	if contains(errMsg, "role can not be changed") {
		return ErrorCodeRoleChangeForbidden
	}
	if contains(errMsg, "admin user can not be disabled") {
		return ErrorCodeAdminDisableForbidden
	}
	if contains(errMsg, "guest cannot update profile") {
		return ErrorCodeGuestProfileForbidden
	}
	if contains(errMsg, "guest cannot generate 2fa") {
		return ErrorCodeGuest2FAForbidden
	}
	if contains(errMsg, "invalid 2fa code") {
		return ErrorCodeInvalid2FACode
	}
	if contains(errMsg, "too many attempts") {
		return ErrorCodeTooManyAttempts
	}
	if contains(errMsg, "invalid username or password") {
		return ErrorCodeInvalidCredentials
	}
	if contains(errMsg, "password has been changed") {
		return ErrorCodePasswordChanged
	}
	if contains(errMsg, "you are a guest") {
		return ErrorCodeGuestForbidden
	}
	if contains(errMsg, "you are not an admin") {
		return ErrorCodeNotAdmin
	}

	// 文件相关
	if contains(errMsg, "file exists") {
		return ErrorCodeFileExists
	}
	if contains(errMsg, "ignored system file") {
		return ErrorCodeIgnoredSystemFile
	}
	if contains(errMsg, "empty file names") {
		return ErrorCodeEmptyFileNames
	}
	if contains(errMsg, "invalid file name") {
		return ErrorCodeInvalidFileName
	}
	if contains(errMsg, "current storage doesn't support upload") || contains(errMsg, "upload not supported") {
		return ErrorCodeUploadNotSupported
	}

	// 权限相关
	if contains(errMsg, "permission denied") {
		return ErrorCodePermissionDenied
	}
	if contains(errMsg, "user not found") {
		return ErrorCodeUserNotFound
	}

	// 上传相关
	if contains(errMsg, "multipart upload is disabled") {
		return ErrorCodeMultipartDisabled
	}
	if contains(errMsg, "multipart upload requires a valid X-File-Size header") {
		return ErrorCodeMultipartRequiresSize
	}
	if contains(errMsg, "multipart upload requires a positive X-File-Size") {
		return ErrorCodeMultipartRequiresPositiveSize
	}
	if contains(errMsg, "invalid X-Chunk-Index header") {
		return ErrorCodeInvalidChunkIndex
	}
	if contains(errMsg, "status lookup requires upload_id") {
		return ErrorCodeStatusLookupRequiresID
	}

	// 索引/扫描相关
	if contains(errMsg, "manual scan is not running") {
		return ErrorCodeManualScanNotRunning
	}
	if contains(errMsg, "index is running") {
		return ErrorCodeIndexIsRunning
	}
	if contains(errMsg, "update is not supported for current index") {
		return ErrorCodeUpdateNotSupported
	}
	if contains(errMsg, "index is not running") {
		return ErrorCodeIndexNotRunning
	}

	// 驱动相关
	if contains(errMsg, "driver not found") {
		return ErrorCodeDriverNotFound
	}

	// 任务相关
	if contains(errMsg, "task not found") {
		return ErrorCodeTaskNotFound
	}
	if contains(errMsg, "user invalid") {
		return ErrorCodeLoginRequired
	}
	if contains(errMsg, "invalid request format") {
		return ErrorCodeBadRequest
	}

	// 通用
	if IsNotSupportError(err) {
		return ErrorCodeNotSupport
	}
	if IsNotImplementError(err) {
		return ErrorCodeNotImplement
	}

	return ""
}

// contains 检查字符串是否包含子串
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsSubstr(s, substr))
}

func containsSubstr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
