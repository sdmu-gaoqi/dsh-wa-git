# @wagq/dsh-git

> DeepSeek Harness Web GUI 插件：会话标题栏多一枚 **Git 图标按钮**，点开是与 VS Code
> 「源代码管理」同构的 Git 面板 —— 提交框、三段更改列表、内联 diff、分支切换、提交图、
> **内嵌 Git 终端**，以及带历史改写能力的提交右键菜单。

```
conversation.session.header.utilities
  └─ [Git ✱]  ← 点击
       ┌──────────────────────────────────────────────┐
       │ 源代码管理  (⑂ main)  ↑2 ↓0    ⟳  ⋯  ✕      │
       ├──────────────────────────────────────────────┤
       │ 更改 12   图表 30   终端                      │  ← 三个页签
       ├──────────────────────────────────────────────┤
       │ 消息（Ctrl+Enter 在 main 上提交）             │
       │ [✓ 提交]                        [▾]           │
       ├──────────────────────────────────────────────┤
       │ ⌄ 暂存的更改                1  [−]            │
       │   src/index.ts                          +278 M│
       │ ⌄ 更改                      2  [↶] [+]        │
       │   cordis.patch.yml                       +1 −1 M│
       ├──────────────────────────────────────────────┤
       │ @@ -1 +1 @@   README.md      +86 −47         │  ← 内联 diff
       └──────────────────────────────────────────────┘
```

## 五个入口

| 位置 | 能做什么 |
| --- | --- |
| **分支胶囊**（头部） | 点击弹出分支选择器：本地分支带 ahead/behind，远程分支点一下自动创建同名跟踪分支；底部可直接输入新分支名创建 |
| **↑↓ 徽标**（头部） | 点击打开「与远程对比」侧栏：`落后（远端有、本地没有）` / `领先（本地有、远端没有）` 两组提交，点任一提交跳到该提交详情 |
| **⋯ 按钮**（头部） | 拉取 / 推送 / 抓取、切换分支、暂存全部、远程管理、打开终端、刷新（同步项会显示 `落后 N` / `领先 N`） |
| **更改页签** | 暂存 / 取消暂存 / 放弃；点文件看 diff（**在右侧并排展开**，不挤占列表）；标题栏「并排 / 行内」可切换 |
| **图表页签** | 点提交行 → 右侧展开该提交的作者、时间、改动文件与完整 patch；**右键**提交 → 见下表 |
| **终端页签** | 内嵌 git 终端，仓库根目录为起点，自由输入任意命令 |

打开 diff / 提交详情 / 对比面板时，弹窗从 480px 自动加宽到 860px，正文变成左右两栏。

### 提交右键菜单

| 菜单项 | 底层命令 | 说明 |
| --- | --- | --- |
| 复制提交哈希 | — | 完整 40 位 SHA 进剪贴板 |
| 复制提交消息 | — | 提交标题 |
| 恢复至当前提交 | `git revert --no-edit` | 生成一个反向提交，历史不改写 |
| 软重置到此提交 | `git reset --soft` | HEAD 移动，改动全部留在暂存区 |
| 混合重置到此提交 | `git reset --mixed` | HEAD 移动，改动留在工作区 |
| 硬重置到此提交 | `git reset --hard` | **丢弃**工作区改动，二次确认 |
| rebase 到此提交 | `git rebase` | 当前分支重放到该提交之上，二次确认 |

## 它怎么工作

两个半侧，同一个包：

| 半侧 | 产物 | 职责 |
| --- | --- | --- |
| host（node） | `dist/index.js` | 在 `/wagq-git` 下注册 HTTP 路由；git 走 `execFile` + argv 数组 |
| client（浏览器） | `dist/client.js` | 注册标题栏图标 + 弹窗；只 `fetch` 路由，不碰进程 |

浏览器侧不直接调 git，所以路径校验、错误归一化、diff 截断、退出码解析都只有一处实现。

### 路由

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/sessions` | 会话 → 工作目录 |
| GET | `/api/state?cwd=&limit=` | 仓库信息 + `status --porcelain=v1 -z` + `log --all --date-order` |
| GET | `/api/diff?cwd=&path=&staged=&from=` | 工作区 unified patch |
| GET | `/api/message?cwd=` | 建议提交信息 |
| GET | `/api/compare?cwd=&limit=` | `HEAD...@{upstream}` 的双向提交列表（落后 / 领先） |
| GET | `/api/branches?cwd=` | 本地/远程分支 + `%(upstream:track)` 解析出的 ahead/behind |
| GET | `/api/remotes?cwd=` | 远端列表（fetch/push URL） |
| GET | `/api/commit?cwd=&sha=` | 单个提交的元信息、改动文件、patch |
| POST | `/api/stage` `/api/unstage` `/api/discard` | 暂存区操作 |
| POST | `/api/commit` | `git commit -m`，支持 amend / signoff |
| POST | `/api/sync` | `fetch` / `pull` / `push`，`push` 带 `--set-upstream` |
| POST | `/api/checkout` | 切换分支，`create: true` 时新建 |
| POST | `/api/branch-delete` | 删除分支 |
| POST | `/api/remote-add` `/api/remote-remove` `/api/remote-url` | 远程管理 |
| POST | `/api/commit-action` | `revert` / `reset-soft` / `reset-mixed` / `reset-hard` / `rebase` |
| POST | `/api/terminal` | **内嵌终端**：命令 + 返回输出、退出码、耗时、执行后的 cwd |

`/api/commit` 两个方法共用一条路径：GET 读提交详情，POST 创建提交。

### 终端为什么能 `cd`

没有 PTY。每条命令拼一段脚本，末尾打印 `sentinel\t$PWD\t$exit`，host 解析出新的工作目录并随响应返回，下一行命令以它为 `cwd` 启动。Windows 走 `powershell.exe`，其它平台走 `/bin/sh -lc`。

分隔符是 **TAB 而不是冒号** —— `C:\...` 里的冒号会把盘符切下来。

所有 git 路由都过两道栅栏：`Host` 必须 loopback（防 DNS rebinding），`Origin` 必须同源、
`Sec-Fetch-Site: cross-site` 直接 403。目录先 `realpath` 校验存在再交给 git。

## 构建

```sh
pnpm install
pnpm run build      # tsc → dist/index.js；esbuild → dist/client.js（带 __ModuleLoader__ 外壳）
pnpm run typecheck  # node 半侧 + 浏览器半侧分别过一遍类型
pnpm run smoke      # 临时仓库跑全部路由 + react-dom/server 渲染按钮（42 项）
pnpm run preview    # 无头 Chromium 截图，可加 --scene=changes|diff|graph|menu|context|branches|terminal|compare
                    #   加 --alpha 模拟半透明皮肤，加 --measure 打印各栏实际尺寸
node scripts/probe.mjs <url>   # 对运行中的实例读取真实令牌与弹窗计算样式
```

`dist/client.js` 必须以 `window.__ModuleLoader__.load({ id, factory })` 开头。裸包名
（`require('react')`）留给宿主冻结的模块表解析；只有相对模块会被打进 bundle。

## 安装到 profile

```sh
# 在插件目录的父级执行，`add` 的相对路径锚定调用目录
dsh plugin --profile desktop add "link:D:/code/dsh plugin/dsh-wa-git"
```

`cordis.patch.yml` 里 `name` 写的是**包名**，不是路径。

## 主题与皮肤兼容

颜色只用 `--dsw-alias-*` 令牌（`label-*` / `bg-layer-*` / `border-l*` / `state-*` /
`file-diff-*` / `scrollbar-*`），跟随宿主主题与皮肤。提交图泳道色是 `hsl()` 常量——它
表达「哪条分支」而非语义，深浅主题下都验过对比度。

**弹窗底色永远不透明。** 皮肤（如 `abyss`）会把 `--dsw-alias-bg-layer-*` **甚至 `--dsw-alias-bg-base`**
声明成带 alpha 的颜色，好让背景艺术画透出来；浮层如果直接继承，页面上的文字就会从弹窗里读出来。
而且 `color-mix(x 100%, transparent)` **并不会**把 alpha 提到 1——100% 权重的结果就是 `x` 原样。

所以每个浮层自己合成底色，用两条声明：

```css
background-color: var(--dsw-alias-bg-base);        /* 不透明地板 */
background-image: linear-gradient(L, L), linear-gradient(L, L), linear-gradient(L, L);  /* 主题色叠三层 */
```

layer 叠在不透明地板之上，剩余 alpha 再靠重复叠层几何收敛。菜单 / 确认框 / 分支选择器各自带这份
配方——它们是 `.dshg-root` 的**兄弟节点**（必须逃出 dialog 的 `overflow:hidden`），不能指望继承
dialog 上的变量。

`pnpm run preview --scene=context --alpha` 用 50% alpha 的令牌复现皮肤场景，配合 `--measure`
打印菜单实际计算出的 `background` 确认是 `rgb(...)` 而不是 `rgba(...,0.5)`。

元素带 `data-dsh-plugin="wagq-dsh-git"` / `data-dsh-part="scm-button|scm-popup"` /
`data-dsh-surface="overlay"`，符合 dsh-web 的皮肤契约。
