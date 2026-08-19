package sharing

import (
	"context"

	"github.com/OpenListTeam/OpenList/v4/internal/errs"
	"github.com/OpenListTeam/OpenList/v4/internal/model"
	"github.com/OpenListTeam/OpenList/v4/internal/op"
	"github.com/OpenListTeam/OpenList/v4/pkg/utils"
	"github.com/pkg/errors"
	log "github.com/sirupsen/logrus"
)

func List(ctx context.Context, sid, path string, args model.SharingListArgs) (*model.Sharing, []model.Obj, error) {
	sharing, res, err := list(ctx, sid, path, args)
	if err != nil {
		log.Errorf("failed list sharing %s/%s: %+v", sid, path, err)
		return nil, nil, err
	}
	return sharing, res, nil
}

func Get(ctx context.Context, sid, path string, args model.SharingListArgs) (*model.Sharing, model.Obj, error) {
	sharing, res, err := get(ctx, sid, path, args)
	if err != nil {
		log.Warnf("failed get sharing %s/%s: %s", sid, path, err)
		return nil, nil, err
	}
	return sharing, res, nil
}

func ArchiveMeta(ctx context.Context, sid, path string, args model.SharingArchiveMetaArgs) (*model.Sharing, *model.ArchiveMetaProvider, error) {
	sharing, res, err := archiveMeta(ctx, sid, path, args)
	if err != nil {
		log.Warnf("failed get sharing archive meta %s/%s: %s", sid, path, err)
		return nil, nil, err
	}
	return sharing, res, nil
}

func ArchiveList(ctx context.Context, sid, path string, args model.SharingArchiveListArgs) (*model.Sharing, []model.Obj, error) {
	sharing, res, err := archiveList(ctx, sid, path, args)
	if err != nil {
		log.Warnf("failed list sharing archive %s/%s: %s", sid, path, err)
		return nil, nil, err
	}
	return sharing, res, nil
}

type LinkArgs struct {
	model.SharingListArgs
	model.LinkArgs
}

func Link(ctx context.Context, sid, path string, args *LinkArgs) (*model.Sharing, *model.Link, model.Obj, error) {
	sharing, res, file, err := link(ctx, sid, path, args)
	if err != nil {
		log.Errorf("failed get sharing link %s/%s: %+v", sid, path, err)
		return nil, nil, nil, err
	}
	return sharing, res, file, nil
}

// GetSharing returns the sharing after validating the share and password.
// It returns an error if the share is invalid, password wrong, or the path is the root of a single-file share.
func GetSharing(ctx context.Context, sid, path string, pwd string) (*model.Sharing, error) {
	sharing, err := op.GetSharingById(sid, false)
	if err != nil {
		return nil, errors.WithStack(errs.SharingNotFound)
	}
	if !sharing.Valid() {
		return sharing, errors.WithStack(errs.InvalidSharing)
	}
	if !sharing.Verify(pwd) {
		return sharing, errors.WithStack(errs.WrongShareCode)
	}
	path = utils.FixAndCleanPath(path)
	if len(sharing.Files) == 1 && path == "/" {
		return nil, errors.New("cannot get sharing root")
	}
	return sharing, nil
}
