# @wagq/dsh-git

> DeepSeek Harness Web GUI 插件：会话标题栏多一枚 **Git 图标按钮**，点开就是与 VS Code
> 「源代码管理 / 图表」同构的 Git 面板 —— 提交信息框、暂存的更改 / 更改 / 未跟踪三段列表、
> 点开文件看内联 diff、底部是分泳道的提交图。

```
conversation.session.header.utilities
  └─ [Git ✱]  ← 点击
       ┌────────────────────────────────────────┐
       │ 源代码管理   dsh-wa-git  (⑂ main ↑2 ↓0) │
       ├────────────────────────────────────────┤
       │ 信息（Ctrl+Enter 在 main 上提交）      │
       │ [✓ 提交 (2)]  [ ] amend                │
       ├────────────────────────────────────────┤
       │ ⌄ 暂存的更改                    1      │
       │   M  src/index.ts                      │
       │ ⌄ 更改                          2      │
       │   M  cordis.patch.yml                  │
       │   U  scripts/build.mjs                 │
       ├────────────────────────────────────────┤
       │ 图表                            12     │
       │  ●─●─● feat: 初始化项目    a1b2c3d     │
       └────────────────────────────────────────┘
```

## 它怎么工作

两个半侧，同一个包：

| 半侧 | 产物 | 职责 |
| --- | --- | --- |
| host（node） | `dist/index.js` | 在 `/wagq-git` 下注册 HTTP 路由，`execFile` 调 git（argv 数组，不过 shell） |
| client（浏览器） | `dist/client.js` | 往 `conversation.session.header.utilities` 注册图标组件 + 弹窗 |

浏览器侧不直接调 git：它 `fetch('/wagq-git/api/...')`，host 侧负责目录校验与命令执行。
这样路径校验、错误归一化、二进制/超大 diff 的截断都只有一处实现。

### 路由

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/wagq-git/api/sessions` | 会话 → 工作目录，按钮据此找到当前仓库 |
| GET | `/wagq-git/api/state?cwd=&limit=` | 仓库信息 + `status --porcelain=v1 -z` + `log --all --date-order` |
| GET | `/wagq-git/api/diff?cwd=&path=&staged=&from=` | unified patch（未跟踪文件走 `--no-index`） |
| GET | `/wagq-git/api/message?cwd=` | 生成一条建议提交信息 |
| POST | `/wagq-git/api/stage` | `git add -A -- <paths>` |
| POST | `/wagq-git/api/unstage` | `git restore --staged`（旧版 git 回落 `reset HEAD`） |
| POST | `/wagq-git/api/discard` | 已跟踪 → `restore --worktree`；未跟踪 → `clean -fd` |
| POST | `/wagq-git/api/commit` | `git commit -m`，支持 `amend` / `signoff` |

所有路由都过两道栅栏：`Host` 必须是 loopback（防 DNS rebinding），`Origin` 必须同源、
`Sec-Fetch-Site: cross-site` 直接 403。目录先 `realpath` 校验存在再交给 git。

## 构建

```sh
pnpm install
pnpm run build      # tsc → dist/index.js；esbuild → dist/client.js（带 __ModuleLoader__ 外壳）
pnpm run typecheck  # node 半侧 + 浏览器半侧分别过一遍类型
pnpm run smoke      # 起临时仓库跑全部路由 + 用 react-dom/server 渲染按钮
pnpm run preview    # 无头 Chromium 渲染弹窗截图到 preview/scm-popup.png
```

`dist/client.js` 必须以 `window.__ModuleLoader__.load({ id, factory })` 开头，浏览器端才会执行它。
裸包名（`require('react')`）留给宿主冻结的模块表解析；只有相对模块被打进 bundle。

## 安装到 profile

```sh
# 在插件目录的父级执行，`add` 的相对路径锚定调用目录
dsh plugin --profile desktop add "./dsh-wa-git"
```

装完重启 DSH。若不想走插件管理器，手工两步：

1. 把本包加进 `$DSH_HOME/profiles/<profile>/package.json` 的 `dependencies`
   与 `dsh.profile.bundles`；
2. 在 profile 目录 `pnpm install`。

`cordis.patch.yml` 里 `name` 写的是**包名**，不是路径。

## 主题与皮肤兼容

颜色只用 `--dsw-alias-*` 令牌（`label-*` / `bg-layer-*` / `border-l*` / `state-*` /
`file-diff-*` / `scrollbar-*`），因此跟随宿主主题与皮肤自动变。提交图的泳道色是
`hsl()` 常量——它表达的是「哪条分支」，不表达语义，深浅两个主题下都验过对比度。

元素带 `data-dsh-plugin="wagq-dsh-git"` / `data-dsh-part="scm-button|scm-popup"` /
`data-dsh-surface="overlay"`，符合 dsh-web 的皮肤契约。
