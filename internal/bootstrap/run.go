package bootstrap

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/OpenListTeam/OpenList/v4/cmd/flags"
	"github.com/OpenListTeam/OpenList/v4/internal/bootstrap/data"
	"github.com/OpenListTeam/OpenList/v4/internal/conf"
	"github.com/OpenListTeam/OpenList/v4/internal/db"
	"github.com/OpenListTeam/OpenList/v4/internal/fs"
	"github.com/OpenListTeam/OpenList/v4/pkg/utils"
	"github.com/OpenListTeam/OpenList/v4/server"
	"github.com/OpenListTeam/OpenList/v4/server/middlewares"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pkg/errors"
	"github.com/quic-go/quic-go/http3"
	log "github.com/sirupsen/logrus"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

func Init() {
	InitConfig()
	Log()
	InitDB()
	data.InitData()
	InitStreamLimit()
	InitIndex()
	InitUpgradePatch()
}

func Release() {
	db.Close()
}

// ServerEndpoint 封装单个服务器端点的生命周期
// 深模块：小接口 + 大实现
type ServerEndpoint struct {
	name     string
	srv      *http.Server
	quicSrv  *http3.Server
	running  bool
	mu       sync.RWMutex
	listener net.Listener
}

// NewServerEndpoint 创建新的服务器端点
func NewServerEndpoint(name string) *ServerEndpoint {
	return &ServerEndpoint{name: name}
}

// Start 启动服务器端点
func (e *ServerEndpoint) Start() error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.running {
		return fmt.Errorf("endpoint %s already running", e.name)
	}

	var err error
	if e.quicSrv != nil {
		err = e.quicSrv.ListenAndServeTLS(conf.Conf.Scheme.CertFile, conf.Conf.Scheme.KeyFile)
	} else if e.listener != nil {
		err = e.srv.Serve(e.listener)
	} else if e.name == "https" {
		// HTTPS 服务器需要使用 ListenAndServeTLS
		err = e.srv.ListenAndServeTLS(conf.Conf.Scheme.CertFile, conf.Conf.Scheme.KeyFile)
	} else {
		err = e.srv.ListenAndServe()
	}

	e.running = false
	if err != nil && !errors.Is(err, http.ErrServerClosed) {
		handleEndpointStartFailedHooks(e.name, err)
		utils.Log.Errorf("failed to start %s: %s", e.name, err.Error())
		return err
	}
	handleEndpointShutdownHooks(e.name)
	return nil
}

// Shutdown 优雅关闭服务器端点
func (e *ServerEndpoint) Shutdown(ctx context.Context) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if !e.running {
		return nil
	}

	var err error
	if e.quicSrv != nil {
		err = e.quicSrv.Shutdown(ctx)
	} else if e.srv != nil {
		err = e.srv.Shutdown(ctx)
	}

	e.running = false
	if err != nil {
		utils.Log.Error(e.name, " server shutdown err: ", err)
	}
	return err
}

// IsRunning 检查端点是否运行中
func (e *ServerEndpoint) IsRunning() bool {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.running
}

// SetRunning 设置运行状态
func (e *ServerEndpoint) SetRunning(running bool) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.running = running
}

var (
	running      bool
	httpEndpoint *ServerEndpoint
	httpsEndpoint *ServerEndpoint
	unixEndpoint *ServerEndpoint
	quicEndpoint *ServerEndpoint
)

// Called by OpenList-Mobile
func IsRunning(t string) bool {
	switch t {
	case "http":
		return httpEndpoint != nil && httpEndpoint.IsRunning()
	case "https":
		return httpsEndpoint != nil && httpsEndpoint.IsRunning()
	case "unix":
		return unixEndpoint != nil && unixEndpoint.IsRunning()
	case "quic":
		return quicEndpoint != nil && quicEndpoint.IsRunning()
	}
	return running
}

func Start() {
	if conf.Conf.DelayedStart != 0 {
		utils.Log.Infof("delayed start for %d seconds", conf.Conf.DelayedStart)
		time.Sleep(time.Duration(conf.Conf.DelayedStart) * time.Second)
	}
	LoadStorages()
	InitTaskManager()
	if !flags.Debug && !flags.Dev {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()

	// gin log
	if conf.Conf.Log.Filter.Enable {
		r.Use(middlewares.FilteredLogger())
	} else {
		r.Use(gin.LoggerWithWriter(log.StandardLogger().Out))
	}
	r.Use(gin.RecoveryWithWriter(log.StandardLogger().Out))

	server.Init(r)
	var httpHandler http.Handler = r
	if conf.Conf.Scheme.EnableH2c {
		httpHandler = h2c.NewHandler(r, &http2.Server{})
	}

	// 启动 HTTP 服务器
	if conf.Conf.Scheme.HttpPort != -1 {
		httpBase := fmt.Sprintf("%s:%d", conf.Conf.Scheme.Address, conf.Conf.Scheme.HttpPort)
		fmt.Printf("start HTTP server @ %s\n", httpBase)
		utils.Log.Infof("start HTTP server @ %s", httpBase)
		httpEndpoint = NewServerEndpoint("http")
		httpEndpoint.srv = &http.Server{Addr: httpBase, Handler: httpHandler}
		go httpEndpoint.Start()
	}

	// 启动 HTTPS 服务器
	if conf.Conf.Scheme.HttpsPort != -1 {
		httpsBase := fmt.Sprintf("%s:%d", conf.Conf.Scheme.Address, conf.Conf.Scheme.HttpsPort)
		fmt.Printf("start HTTPS server @ %s\n", httpsBase)
		utils.Log.Infof("start HTTPS server @ %s", httpsBase)
		httpsEndpoint = NewServerEndpoint("https")
		httpsEndpoint.srv = &http.Server{Addr: httpsBase, Handler: r}
		go httpsEndpoint.Start()

		// 启动 HTTP3 (QUIC) 服务器
		if conf.Conf.Scheme.EnableH3 {
			fmt.Printf("start HTTP3 (quic) server @ %s\n", httpsBase)
			utils.Log.Infof("start HTTP3 (quic) server @ %s", httpsBase)
			r.Use(func(c *gin.Context) {
				if c.Request.TLS != nil {
					port := conf.Conf.Scheme.HttpsPort
					c.Header("Alt-Svc", fmt.Sprintf("h3=\":%d\"; ma=86400", port))
				}
				c.Next()
			})
			quicEndpoint = NewServerEndpoint("quic")
			quicEndpoint.quicSrv = &http3.Server{Addr: httpsBase, Handler: r}
			go quicEndpoint.Start()
		}
	}

	// 启动 Unix Socket 服务器
	if conf.Conf.Scheme.UnixFile != "" {
		fmt.Printf("start unix server @ %s\n", conf.Conf.Scheme.UnixFile)
		utils.Log.Infof("start unix server @ %s", conf.Conf.Scheme.UnixFile)
		unixEndpoint = NewServerEndpoint("unix")
		unixEndpoint.srv = &http.Server{Handler: httpHandler}

		listener, err := net.Listen("unix", conf.Conf.Scheme.UnixFile)
		if err != nil {
			utils.Log.Errorf("failed to listen unix: %+v", err)
		} else {
			unixEndpoint.listener = listener
			// 设置 socket 文件权限
			mode, err := strconv.ParseUint(conf.Conf.Scheme.UnixFilePerm, 8, 32)
			if err != nil {
				utils.Log.Errorf("failed to parse socket file permission: %+v", err)
			} else {
				err = os.Chmod(conf.Conf.Scheme.UnixFile, os.FileMode(mode))
				if err != nil {
					utils.Log.Errorf("failed to chmod socket file: %+v", err)
				}
			}
			go unixEndpoint.Start()
		}
	}

	running = true
}

func Shutdown(timeout time.Duration) {
	utils.Log.Println("Shutdown server...")
	fs.ArchiveContentUploadTaskManager.RemoveAll()
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	var wg sync.WaitGroup
	endpoints := []*ServerEndpoint{httpEndpoint, httpsEndpoint, quicEndpoint, unixEndpoint}

	for _, ep := range endpoints {
		if ep != nil && ep.IsRunning() {
			wg.Add(1)
			go func(e *ServerEndpoint) {
				defer wg.Done()
				e.Shutdown(ctx)
			}(ep)
		}
	}

	wg.Wait()
	utils.Log.Println("Server exit")
	running = false
}

type EndpointStartFailedHook func(string, string)

type EndpointShutdownHook func(string)

var (
	endpointStartFailedHooks map[string]EndpointStartFailedHook
	endpointShutdownHooks    map[string]EndpointShutdownHook
)

func RegisterEndpointStartFailedHook(hook EndpointStartFailedHook) string {
	id := uuid.NewString()
	endpointStartFailedHooks[id] = hook
	return id
}

func RemoveEndpointStartFailedHook(id string) {
	delete(endpointStartFailedHooks, id)
}

func RegisterEndpointShutdownHook(hook EndpointShutdownHook) string {
	id := uuid.NewString()
	endpointShutdownHooks[id] = hook
	return id
}

func RemoveEndpointShutdownHook(id string) {
	delete(endpointShutdownHooks, id)
}

func handleEndpointStartFailedHooks(t string, err error) {
	for _, hook := range endpointStartFailedHooks {
		hook(t, err.Error())
	}
}

func handleEndpointShutdownHooks(t string) {
	for _, hook := range endpointShutdownHooks {
		hook(t)
	}
}

func init() {
	endpointShutdownHooks = make(map[string]EndpointShutdownHook)
	endpointStartFailedHooks = make(map[string]EndpointStartFailedHook)
}
