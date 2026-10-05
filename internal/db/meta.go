package db

import (
	"fmt"

	"github.com/OpenListTeam/OpenList/v4/internal/model"
	"github.com/pkg/errors"
	"gorm.io/gorm"
)

func GetMetaByPath(path string) (*model.Meta, error) {
	meta := model.Meta{Path: path}
	if err := db.Where(meta).First(&meta).Error; err != nil {
		return nil, errors.Wrapf(err, "failed select meta")
	}
	return &meta, nil
}

func GetAllMetas() ([]model.Meta, error) {
	var metas []model.Meta
	if err := addMetaOrder(db).Find(&metas).Error; err != nil {
		return nil, errors.Wrapf(err, "failed get all metas")
	}
	return metas, nil
}

func GetMetaById(id uint) (*model.Meta, error) {
	var u model.Meta
	if err := db.First(&u, id).Error; err != nil {
		return nil, errors.Wrapf(err, "failed get old meta")
	}
	return &u, nil
}

func CreateMeta(u *model.Meta) error {
	return errors.WithStack(db.Create(u).Error)
}

func UpdateMeta(u *model.Meta) error {
	return errors.WithStack(db.Save(u).Error)
}

func GetMetas(pageIndex, pageSize int) (metas []model.Meta, count int64, err error) {
	metaDB := db.Model(&model.Meta{})
	if err = metaDB.Count(&count).Error; err != nil {
		return nil, 0, errors.Wrapf(err, "failed get metas count")
	}
	if err = metaDB.Order(columnName("order") + ", " + columnName("id")).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Find(&metas).Error; err != nil {
		return nil, 0, errors.Wrapf(err, "failed get find metas")
	}
	return metas, count, nil
}

func DeleteMetaById(id uint) error {
	return errors.WithStack(db.Delete(&model.Meta{}, id).Error)
}

func addMetaOrder(db *gorm.DB) *gorm.DB {
	return db.Order(fmt.Sprintf("%s, %s", columnName("order"), columnName("id")))
}

func UpdateMetaOrders(orders []model.OrderItem) error {
	return db.Transaction(func(tx *gorm.DB) error {
		for _, o := range orders {
			if err := tx.Model(&model.Meta{}).Where("id = ?", o.ID).Update("order", o.Order).Error; err != nil {
				return errors.Wrapf(err, "failed update meta %d order", o.ID)
			}
		}
		return nil
	})
}
