package driver

import (
	"context"

	"github.com/OpenListTeam/OpenList/v4/internal/model"
)

type Driver interface {
	Meta
	Reader
}

type Meta interface {
	Config() Config
	GetStorage() *model.Storage
	SetStorage(model.Storage)
	GetAddition() Additional
	Init(ctx context.Context) error
	Drop(ctx context.Context) error
}

type Other interface {
	Other(ctx context.Context, args model.OtherArgs) (any, error)
}

type Reader interface {
	List(ctx context.Context, dir model.Obj, args model.ListArgs) ([]model.Obj, error)
	Link(ctx context.Context, file model.Obj, args model.LinkArgs) (*model.Link, error)
}

type GetRooter interface {
	GetRoot(ctx context.Context) (model.Obj, error)
}

type Getter interface {
	Get(ctx context.Context, path string) (model.Obj, error)
}

type Mkdir interface {
	MakeDir(ctx context.Context, parentDir model.Obj, dirName string) error
}

type Move interface {
	Move(ctx context.Context, srcObj, dstDir model.Obj) error
}

type Rename interface {
	Rename(ctx context.Context, srcObj model.Obj, newName string) error
}

type Copy interface {
	Copy(ctx context.Context, srcObj, dstDir model.Obj) error
}

type Remove interface {
	Remove(ctx context.Context, obj model.Obj) error
}

type Put interface {
	Put(ctx context.Context, dstDir model.Obj, file model.FileStreamer, up UpdateProgress) error
}

type PutURL interface {
	PutURL(ctx context.Context, dstDir model.Obj, name, url string) error
}

type MkdirResult interface {
	MakeDir(ctx context.Context, parentDir model.Obj, dirName string) (model.Obj, error)
}

type MoveResult interface {
	Move(ctx context.Context, srcObj, dstDir model.Obj) (model.Obj, error)
}

type RenameResult interface {
	Rename(ctx context.Context, srcObj model.Obj, newName string) (model.Obj, error)
}

type CopyResult interface {
	Copy(ctx context.Context, srcObj, dstDir model.Obj) (model.Obj, error)
}

type PutResult interface {
	Put(ctx context.Context, dstDir model.Obj, file model.FileStreamer, up UpdateProgress) (model.Obj, error)
}

type PutURLResult interface {
	PutURL(ctx context.Context, dstDir model.Obj, name, url string) (model.Obj, error)
}

type ArchiveReader interface {
	GetArchiveMeta(ctx context.Context, obj model.Obj, args model.ArchiveArgs) (model.ArchiveMeta, error)
	ListArchive(ctx context.Context, obj model.Obj, args model.ArchiveInnerArgs) ([]model.Obj, error)
	Extract(ctx context.Context, obj model.Obj, args model.ArchiveInnerArgs) (*model.Link, error)
}

type ArchiveGetter interface {
	ArchiveGet(ctx context.Context, obj model.Obj, args model.ArchiveInnerArgs) (model.Obj, error)
}

type ArchiveDecompress interface {
	ArchiveDecompress(ctx context.Context, srcObj, dstDir model.Obj, args model.ArchiveDecompressArgs) error
}

type ArchiveDecompressResult interface {
	ArchiveDecompress(ctx context.Context, srcObj, dstDir model.Obj, args model.ArchiveDecompressArgs) ([]model.Obj, error)
}

type WithDetails interface {
	GetDetails(ctx context.Context) (*model.StorageDetails, error)
}

type Reference interface {
	InitReference(storage Driver) error
}

type LinkCacheModeResolver interface {
	ResolveLinkCacheMode(path string) LinkCacheMode
}

type DirectUploader interface {
	GetDirectUploadTools() []string
	GetDirectUploadInfo(ctx context.Context, tool string, dstDir model.Obj, fileName string, fileSize int64) (any, error)
}

// New capability packages (composed from granular interfaces)
type StorageMeta interface {
	Meta
}

type StorageReader interface {
	Reader
}

type StorageGetter interface {
	Getter
	GetRooter
}

type StorageWriter interface {
	Mkdir
	Move
	Rename
	Copy
	Remove
	Put
}

type StorageDirectUploader interface {
	PutURL
	DirectUploader
}

type StorageArchiver interface {
	ArchiveReader
	ArchiveGetter
	ArchiveDecompress
}

type StorageWithDetails interface {
	WithDetails
}

type StorageReference interface {
	Reference
}

type StorageLinkCacheResolver interface {
	LinkCacheModeResolver
}

type StorageOther interface {
	Other
}