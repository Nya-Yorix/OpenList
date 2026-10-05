package db

import (
	"github.com/OpenListTeam/OpenList/v4/internal/model"
	"github.com/pkg/errors"
	"gorm.io/gorm"
)

func GetUserByRole(role int) (*model.User, error) {
	user := model.User{Role: role}
	if err := db.Where(user).Take(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func GetUserByName(username string) (*model.User, error) {
	user := model.User{Username: username}
	if err := db.Where(user).First(&user).Error; err != nil {
		return nil, errors.Wrapf(err, "failed find user")
	}
	return &user, nil
}

func GetUserById(id uint) (*model.User, error) {
	var u model.User
	if err := db.First(&u, id).Error; err != nil {
		return nil, errors.Wrapf(err, "failed get old user")
	}
	return &u, nil
}

func CreateUser(u *model.User) error {
	return errors.WithStack(db.Create(u).Error)
}

func UpdateUser(u *model.User) error {
	return errors.WithStack(db.Save(u).Error)
}

func GetUsers(pageIndex, pageSize int) (users []model.User, count int64, err error) {
	userDB := db.Model(&model.User{})
	if err := userDB.Count(&count).Error; err != nil {
		return nil, 0, errors.Wrapf(err, "failed get users count")
	}
	if err := userDB.Order(columnName("order") + ", " + columnName("id")).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Find(&users).Error; err != nil {
		return nil, 0, errors.Wrapf(err, "failed get find users")
	}
	return users, count, nil
}

func DeleteUserById(id uint) error {
	return errors.WithStack(db.Delete(&model.User{}, id).Error)
}

func UpdateUserOrders(orders []model.OrderItem) error {
	return db.Transaction(func(tx *gorm.DB) error {
		for _, o := range orders {
			if err := tx.Model(&model.User{}).Where("id = ?", o.ID).Update("order", o.Order).Error; err != nil {
				return errors.Wrapf(err, "failed update user %d order", o.ID)
			}
		}
		return nil
	})
}
