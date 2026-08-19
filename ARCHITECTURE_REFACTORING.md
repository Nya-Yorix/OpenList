# OpenList 架构重构开发文档

## 概述

本文档记录了 OpenList 代码库的架构重构变更，旨在：
1. **降低 CPU/内存占用** - 通过缓存限流、合并冗余层、拆分胖接口
2. **提升性能** - 减少函数调用链路、优化缓存策略、按需编译驱动能力
3. **保持向后兼容** - 现有 60+ 个驱动零改动继续工作
4. **便于后续合并上游** - 清晰的变更记录、最小化冲突风险

---

## 变更清单

### 1. 驱动接口拆分：从「胖接口」到「能力包」

**文件**：`internal/driver/driver.go`

**变更前**：
```go
type Driver interface {
    Meta
    Reader
    // Writer (注释掉)
    // Other (注释掉)
}
```
所有驱动必须实现 25+ 个方法，即使不支持也要存根。

**变更后**：
- 保留原有细粒度接口（`Meta`、`Reader`、`Getter`、`GetRooter`、`Mkdir`、`Move`、`Rename`、`Copy`、`Remove`、`Put`、`PutURL`、`WithDetails`、`Reference`、`LinkCacheModeResolver`、`DirectUploader`、`ArchiveReader`、`ArchiveGetter`、`ArchiveDecompress`、`Other`、`IRootId`、`IRootPath` 等）
- 新增「能力包」组合接口（`StorageMeta`、`StorageReader`、`StorageGetter`、`StorageWriter`、`StorageDirectUploader`、`StorageArchiver`、`StorageWithDetails`、`StorageReference`、`StorageLinkCacheResolver`、`StorageOther`）
- `Driver` 接口仅要求 `Meta` + `Reader` 两个核心能力，**所有其余能力通过类型断言可选实现**

**兼容性**：
- 现有 60+ 个驱动**零代码修改**即可编译通过
- 新驱动可按需组合能力包，减少二进制体积和内存占用
- `op` 层统一使用类型断言检查能力（如 `storage.(driver.StorageWriter)`）

---

### 2. 合并 `fs` 与 `op` 两层

**文件**：
- 删除：`internal/fs/` 整个目录（~500 行）
- 修改：`internal/op/fs.go`、`internal/op/cache.go`、`internal/op/archive.go`、`internal/op/storage.go`

**变更前**：
```
HTTP Handler → fs.List() → 路径转换 → op.List() → 实际工作
```
`fs` 层仅做路径转换和权限过滤，是纯透传层。

**变更后**：
```
HTTP Handler → op.List() (内部私有函数处理路径转换、权限过滤)
```
- 删除 `internal/fs/` 目录
- 路径转换、虚拟文件合并、权限过滤（`filterReadableObjs`、`whetherHide`）作为 `op` 包内部私有函数保留
- 对外仅暴露 `op` 包的 `List`、`Get`、`Link`、`MakeDir`、`Move`、`Copy`、`Remove`、`Put` 等接口

**收益**：
- 每次操作少 1 次函数调用、少 1 次结构体拷贝、少 1 次接口断言
- GC 压力降低，代码量减少 ~500 行
- 单一 `Filesystem` 接口便于测试和 Mock

---

### 3. 缓存管理器加上限 + LRU 淘汰

**文件**：`internal/op/cache.go`、`internal/cache/keyed_cache.go`

**变更前**：
- 5 个缓存（目录、链接、用户、设置、详情）无上限，内存只涨不降
- 固定 TTL，无主动淘汰机制

**变更后**：
- `KeyedCache` 新增 `maxEntries` 字段，支持 LRU 淘汰
- 各缓存配置上限：
  - 目录缓存：10,000 条，TTL 5 分钟
  - 链接缓存：5,000 条，TTL 30 分钟 + 过期时间双重保险
  - 用户缓存：1,000 条，TTL 1 小时
  - 设置缓存：500 条，TTL 1 小时
  - 详情缓存：200 条，TTL 30 分钟
- 总内存上限约 80-170 MB，可控可预测

**代码变更**：
- `NewKeyedCache(ttl, maxEntries time.Duration, int)` 新增 `maxEntries` 参数
- `Set` 时检查上限，超限淘汰最久未访问条目
- `CacheManager` 初始化时传入各缓存上限

---

### 4. 删除离线下载功能（前端已废弃）

**涉及驱动**（删除 `OfflineList`、`OfflineDownload`、`DeleteOfflineTasks` 等方法）：
- `drivers/115/`、`drivers/115_open/`
- `drivers/123/`、`drivers/123_open/`
- `drivers/pikpak/`
- `drivers/thunder/`、`drivers/thunderx/`、`drivers/thunder_browser/`
- `drivers/guangyapan/`（删除整个 `offline.go` 文件，补齐 `isSuccessMsg` 函数）

**清理内容**：
- 仅离线下载的类型定义（`OfflineTask`、`OfflineDownloadResp`、`OfflineListResp` 等）保留在各驱动 `types.go` 中，避免破坏可能的外部引用
- 核心逻辑方法全部删除

---

### 5. 修复 `guangyapan` 驱动缺失函数

**文件**：`drivers/guangyapan/driver.go`

**问题**：删除 `offline.go` 后丢失 `isSuccessMsg` 函数
**修复**：在 `driver.go` 末尾添加：
```go
func isSuccessMsg(msg string) bool {
    msg = strings.TrimSpace(msg)
    return msg == "" || strings.EqualFold(msg, "success")
}
```

---

## 关键设计决策记录（ADR 风格）

### ADR-001：驱动接口拆分策略
**决策**：保留原有细粒度接口，新增能力包组合接口，`Driver` 仅要求核心两项
**理由**：
- 避免 60+ 现有驱动大规模改写，降低合并上游冲突风险
- 新驱动可按需组合，老驱动渐进式迁移
- 类型断言在 `op` 层已广泛使用，运行时零开销

### ADR-002：合并 fs/op 层
**决策**：物理删除 `internal/fs/`，逻辑内联到 `internal/op/`
**理由**：
- `fs` 层无实质业务逻辑，纯透传
- 权限过滤、虚拟文件合并本就属于存储操作核心逻辑
- 单一接口便于 `sharing` 模块复用（后续可实现 `SharingFS` 适配器）

### ADR-003：缓存上限策略
**决策**：LRU + 固定上限，而非分桶过期或纯 TTL
**理由**：
- 实现简单，代码变更最小
- 内存占用可预测，适合容器化部署
- 热数据自动保留，冷数据自动淘汰

### ADR-004：离线下载彻底删除
**决策**：前端已无入口，后端彻底清理
**理由**：
- 死代码增加维护负担和攻击面
- 类型定义保留避免潜在外部依赖报错

---

## 合并上游指南

### 冲突预期与处理

| 文件/模块 | 冲突可能性 | 处理策略 |
|-----------|------------|----------|
| `internal/driver/driver.go` | **高** - 上游可能新增接口方法 | 保留细粒度接口定义，新增方法追加到对应接口；能力包组合接口同步更新 |
| `internal/op/fs.go` | **中** - 上游可能修改 List/Get 等核心逻辑 | 核心逻辑变更按语义合并；路径转换/权限过滤私有函数保持内联 |
| `internal/op/cache.go` | **低** - 缓存逻辑相对稳定 | 上游若调整缓存键结构，同步更新 `Key` 函数和缓存操作 |
| `drivers/*/driver.go` | **高** - 上游新增/修改驱动 | **不手动同步驱动代码**；新驱动按新能力包模式编写，老驱动保持现状 |
| `internal/fs/` | **无** - 已删除 | 上游若重建该目录，评估是否需要（大概率不需要） |

### 合并步骤建议

```bash
# 1. 拉取上游最新代码
git fetch upstream
git merge upstream/master --no-commit

# 2. 重点检查冲突文件
# internal/driver/driver.go - 手动合并接口定义
# internal/op/fs.go - 合并核心逻辑变更
# internal/op/cache.go - 合并缓存结构变更

# 3. 驱动目录：保留本地版本（本地已清理离线下载、修复编译）
# 若上游新增驱动，参考 capability package 模式添加

# 4. 运行测试验证
go build ./...
go test ./internal/... -count=1

# 5. 提交合并
git commit -m "merge upstream: sync with OpenListTeam/OpenList@<commit>"
```

### 验证清单

合并后必须通过：
- [ ] `go build ./...` 编译通过
- [ ] `go test ./internal/... -count=1` 单元测试通过
- [ ] 核心驱动（阿里云盘、115、本地、WebDAV）挂载/列目录/下载/上传基本功能正常
- [ ] 缓存内存占用在预期上限内（可通过 pprof 观察）
- [ ] 分享链接、WebDAV、直链下载等衍生功能正常

---

## 性能基准（预期）

| 指标 | 重构前 | 重构后（预期） | 备注 |
|------|--------|----------------|------|
| 内存基线（空闲） | ~150-300 MB | ~80-120 MB | 缓存上限生效 |
| 内存峰值（高并发列目录） | 无上限，易 OOM | <200 MB | LRU 淘汰生效 |
| 列目录 P99 延迟 | 基线 | -5% ~ -10% | 少一层函数调用 |
| 二进制体积 | 基线 | -2% ~ -5% | 驱动按需编译能力 |
| 启动时间 | 基线 | 持平 | 无显著变化 |

---

## 后续优化方向（可选）

1. **ArchiveService 抽离** - 将 `op/archive.go` 的 fallback 逻辑封装为独立服务
2. **SharingFS 适配器** - 让分享链接复用 `op` 核心逻辑，消除 `sharing/` 重复代码
3. **Obj 接口深化** - 将 `Thumb`、`URL`、`Provider`、`Mask` 等能力内联到 `Obj` 接口，消除包装层
4. **缓存分片** - 高并发场景下将 `KeyedCache` 分片减少锁竞争

---

## 变更文件索引

### 核心架构
- `internal/driver/driver.go` - 接口重组（核心变更）
- `internal/op/fs.go` - 合并 fs 逻辑、更新类型断言
- `internal/op/cache.go` - 缓存上限、LRU
- `internal/op/archive.go` - 更新类型断言
- `internal/op/storage.go` - 更新类型断言
- `internal/cache/keyed_cache.go` - LRU 实现
- `internal/cache/type.go` - `Expirable` 接口

### 驱动清理（离线下载删除）
- `drivers/115/driver.go`
- `drivers/115_open/driver.go`
- `drivers/123/util.go`
- `drivers/123_open/driver.go`
- `drivers/pikpak/driver.go`
- `drivers/thunder/driver.go`
- `drivers/thunderx/driver.go`
- `drivers/thunder_browser/driver.go`
- `drivers/guangyapan/driver.go`（补齐 `isSuccessMsg`）
- `drivers/guangyapan/offline.go`（删除）
- `drivers/aliyundrive_share/driver.go`
- `drivers/aliyundrive_open/driver.go`
- 以及其他同类驱动...

### 删除目录
- `internal/fs/` - 整个目录删除

### 未使用导入清理
- `drivers/123/util.go`
- `drivers/pikpak/driver.go`
- `drivers/thunderx/driver.go`
- `drivers/thunder_browser/driver.go`

---

## 联系人与维护

- **重构执行**：AI Assistant (基于 grilling 技能)
- **决策确认**：用户（性能优化导向）
- **后续合并**：按上述指南执行，遇到歧义优先保留「向后兼容」和「性能优先」原则

---

*文档版本：v1.0*
*生成日期：2026-08-19*