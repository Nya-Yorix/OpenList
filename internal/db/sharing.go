package db

import (
	"fmt"

	"github.com/OpenListTeam/OpenList/v4/internal/model"
	"github.com/OpenListTeam/OpenList/v4/pkg/utils/random"
	"github.com/pkg/errors"
	"gorm.io/gorm"
)

func GetSharingById(id string) (*model.SharingDB, error) {
	s := model.SharingDB{ID: id}
	if err := db.Where(s).First(&s).Error; err != nil {
		return nil, errors.Wrapf(err, "failed get sharing")
	}
	return &s, nil
}

func GetSharings(pageIndex, pageSize int) (sharings []model.SharingDB, count int64, err error) {
	sharingDB := db.Model(&model.SharingDB{})
	if err := sharingDB.Count(&count).Error; err != nil {
		return nil, 0, errors.Wrapf(err, "failed get sharings count")
	}
	if err := sharingDB.Order(addOrderSuffix()).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Find(&sharings).Error; err != nil {
		return nil, 0, errors.Wrapf(err, "failed get find sharings")
	}
	return sharings, count, nil
}

func GetSharingsByCreatorId(creator uint, pageIndex, pageSize int) (sharings []model.SharingDB, count int64, err error) {
	sharingDB := db.Model(&model.SharingDB{})
	cond := model.SharingDB{CreatorId: creator}
	if err := sharingDB.Where(cond).Count(&count).Error; err != nil {
		return nil, 0, errors.Wrapf(err, "failed get sharings count")
	}
	if err := sharingDB.Where(cond).Order(addOrderSuffix()).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Find(&sharings).Error; err != nil {
		return nil, 0, errors.Wrapf(err, "failed get find sharings")
	}
	return sharings, count, nil
}

func CreateSharing(s *model.SharingDB) (string, error) {
	if s.ID == "" {
		id := random.String(8)
		for len(id) < 12 {
			old := model.SharingDB{
				ID: id,
			}
			if err := db.Where(old).First(&old).Error; err != nil {
				s.ID = id
				return id, errors.WithStack(db.Create(s).Error)
			}
			id += random.String(1)
		}
		return "", errors.New("failed find valid id")
	} else {
		query := model.SharingDB{ID: s.ID}
		if err := db.Where(query).First(&query).Error; err == nil {
			return "", errors.New("sharing already exist")
		}
		return s.ID, errors.WithStack(db.Create(s).Error)
	}
}

func UpdateSharing(s *model.SharingDB) error {
	return errors.WithStack(db.Save(s).Error)
}

func UpdateSharingId(oldId, newId string) error {
	// Check if new ID already exists
	if err := db.Where("id = ?", newId).First(&model.SharingDB{}).Error; err == nil {
		return errors.New("sharing id already exists")
	}
	return errors.WithStack(db.Model(&model.SharingDB{}).Where("id = ?", oldId).Update("id", newId).Error)
}

func DeleteSharingById(id string) error {
	s := model.SharingDB{ID: id}
	return errors.WithStack(db.Where(s).Delete(&s).Error)
}

func DeleteSharingsByCreatorId(creatorId uint) error {
	return errors.WithStack(db.Where("creator_id = ?", creatorId).Delete(&model.SharingDB{}).Error)
}

func addOrderSuffix() string {
	return fmt.Sprintf("%s, %s", columnName("order"), columnName("id"))
}

// UpdateSharingOrders persists sharing display order. When restrictCreatorId is
// set (non-admin), updates only apply to sharings created by that user.
func UpdateSharingOrders(orders []model.SharingOrderItem, restrictCreatorId *uint) error {
	return db.Transaction(func(tx *gorm.DB) error {
		for _, o := range orders {
			q := tx.Model(&model.SharingDB{}).Where("id = ?", o.ID)
			if restrictCreatorId != nil {
				q = q.Where("creator_id = ?", *restrictCreatorId)
			}
			res := q.Update("order", o.Order)
			if res.Error != nil {
				return errors.Wrapf(res.Error, "failed update sharing %s order", o.ID)
			}
			if res.RowsAffected == 0 {
				return errors.Errorf("sharing [%s] not found or no permission", o.ID)
			}
		}
		return nil
	})
}
