# 插件市场收录信息

> 下面是提交到插件市场时填写的各项内容，可直接复制。

## 仓库地址

<https://github.com/sdmu-gaoqi/dsh-wa-git>

## 一句话价值

装好后，DSH 会话标题栏会多一枚 Git 按钮，点开就能像 VS Code 一样管理仓库：看改动和提交图、暂存与提交、拉取推送、切换分支、解决冲突、用当前会话模型生成提交消息，还能在插件内浏览仓库文件、查看图片和文本、跑 Git 终端。

## 能力分类

工具与能力

## 安装命令

当前仓库尚未发布到 npm，使用源码安装：

```sh
dsh plugin --profile web add github:sdmu-gaoqi/dsh-wa-git
```

> 发布到 npm 后改用：`dsh plugin --profile web add @wagq/dsh-git`

## 兼容与运行要求

- **DSH 版本**：`>=0.2.0 <0.3.0`
- **Node**：`^22.19.0 || >=24.0.0`（DSH 自带运行时）
- **平台**：Windows / macOS / Linux（依赖系统 `git`，需在 PATH 中）
- **前端**：Web GUI（`dsh.client.platform: web`）

## 许可证

MIT

## 截图 / 演示

- 源代码管理主面板：<https://github.com/sdmu-gaoqi/dsh-wa-git/blob/main/preview/scm-popup.png>
- 与远程对比：<https://github.com/sdmu-gaoqi/dsh-wa-git/blob/main/preview/scm-popup-compare.png>
- 并排 diff：<https://github.com/sdmu-gaoqi/dsh-wa-git/blob/main/preview/scm-popup-diff.png>
- 内嵌终端：<https://github.com/sdmu-gaoqi/dsh-wa-git/blob/main/preview/scm-popup-terminal.png>
- 文件浏览与内容预览：<https://github.com/sdmu-gaoqi/dsh-wa-git/blob/main/preview/scm-popup-file-text.png>

## 补充说明

**权限说明**

- 在本地调用 `git` 读写当前工作区的仓库（暂存、提交、分支、远程、重置/rebase 等）；写操作与重置类操作在界面上明确标注，重置/rebase 会二次确认。
- 「生成提交消息」会把**当前暂存区的 diff**（上限 12000 字符）发送给当前会话使用的模型服务；不使用其它仓库内容。
- 「用系统默认应用打开 / 在文件管理器中显示」通过 DSH 的 `dsh-native-command` 调用本机程序。
- 所有 HTTP 路由只监听 loopback，并做同源与 Host 校验。

**外部服务**

- 依赖系统安装的 `git`。
- 「生成提交消息」依赖当前会话已配置的模型；未配置或限流时会给出明确提示，不影响其它功能。

**已知限制**

- 文件浏览与终端只在 Web GUI 中可用。
- 重置/rebase 会改写历史，已推送的提交需要强推。
- 图片预览支持 png/jpg/gif/webp/bmp/svg/ico；超大文件（文本 2MB / 图片 20MB）不在插件内预览，会提示用系统应用打开。
- 终端不保留 PTY，逐条命令执行，支持上下键历史与 `Ctrl+L` 清屏。

**安装前自查**

- [x] 仓库已公开
- [ ] 已添加 GitHub topic：`dsh-plugin`（需在 GitHub 仓库设置里勾选）
- [x] README 包含安装命令
- [x] 插件导出 `apply(ctx)` 模块
- [x] 仓库根目录包含 `package.json`
- [x] `dist/` 已纳入版本控制（源码安装需要构建产物）
- [x] 包含 `LICENSE`
