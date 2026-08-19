package bootstrap

import (
	"fmt"
	"strings"
	"time"

	"github.com/OpenListTeam/OpenList/v4/cmd/flags"
	"github.com/OpenListTeam/OpenList/v4/internal/conf"
	"github.com/OpenListTeam/OpenList/v4/internal/db"
	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"
)

func InitDB() {
	logLevel := logger.Silent
	if flags.Debug || flags.Dev {
		logLevel = logger.Info
	}
	newLogger := logger.New(
		log.StandardLogger(),
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logLevel,
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
		},
	)
	gormConfig := &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			TablePrefix: conf.Conf.Database.TablePrefix,
		},
		Logger: newLogger,
	}
	var dB *gorm.DB
	var err error
	if flags.Dev {
		dB, err = gorm.Open(openSQLite("file::memory:?cache=shared"), gormConfig)
		conf.Conf.Database.Type = "sqlite3"
	} else {
		database := conf.Conf.Database
		if !(strings.HasSuffix(database.DBFile, ".db") && len(database.DBFile) > 3) {
			log.Fatalf("db name error.")
		}
		dB, err = gorm.Open(openSQLite(fmt.Sprintf("%s?_journal=WAL&_vacuum=incremental",
			database.DBFile)), gormConfig)
	}
	if err != nil {
		log.Fatalf("failed to connect database:%s", err.Error())
	}
	db.Init(dB)
}
