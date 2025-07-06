# Qiros - SillyTavern Git 协作插件

[![许可证: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/MAX-TAB/st-extension-qiros/blob/main/LICENSE)
[![版本](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/MAX-TAB/st-extension-qiros)

[English Version](README_en.md)

这是一个为 [SillyTavern](https://github.com/SillyTavern/SillyTavern) 设计的前端扩展，它提供了一个直观的用户界面，让角色卡创作者能够使用 Git 和 GitHub 进行版本控制和团队协作。

本插件依赖于 [Qiros Server 后端](https://github.com/MAX-TAB/qiros-server)，请务必先完成后端插件的安装和配置。

## 主要功能

- **清晰的用户界面**: 在 SillyTavern 的扩展面板中提供一个完整的操作界面。
- **版本控制**: 对角色进行“推送”、“拉取”、“检查更新”、“查看历史”、“回滚版本”等核心 Git 操作。
- **分支管理**: 轻松创建和切换分支。
- **协作流程**: 一键“复刻 (Fork)”上游仓库，并在推送更新后引导用户创建“拉取请求 (Pull Request)”。
- **发布 (Release)**: 方便地将当前角色打包为 GitHub Release，便于分享和分发。

## 安装教程

安装过程比较复杂，大约需要十分钟。

**第一步：启用 SillyTavern 服务器插件**

1.  打开 SillyTavern 的配置文件 `config.yaml`。
2.  找到并修改以下两项为 `true`：
    ```yaml
    enableServerPlugins: true
    enableServerPluginsAutoUpdate: true
    ```

**第二步：安装 Qiros 服务器后端**

我们强烈推荐使用 `git clone` 的方式进行安装，这能让插件在未来自动更新。

- **方法一 (推荐，需要 Git):**

  1.  打开终端或命令行。
  2.  进入 SillyTavern 的 `plugins` 目录，例如: `cd path/to/SillyTavern/plugins`
  3.  运行克隆命令:
      ```bash
      git clone https://github.com/MAX-TAB/qiros-server.git
      ```

- **方法二 (手动安装):**
  1.  在 [qiros-server 的 GitHub 页面](https://github.com/MAX-TAB/qiros-server) 点击 `Code` -> `Download ZIP`。
  2.  将解压后的文件夹移动到 `SillyTavern\plugins` 目录下。

安装完成后，请继续执行后续的部署脚本步骤：

- **Windows 用户**: 运行 `SillyTavern\plugins\qiros-server\一键部署脚本.bat`。
- **手机或其他系统用户**: 运行 `SillyTavern\plugins\qiros-server\一键部署脚本.sh`。

**第三步：获取 GitHub OAuth 密钥**

1.  确保你有一个 GitHub 账户。
2.  访问 https://github.com/settings/developers 并点击 **New OAuth App**。
3.  填写以下信息：
    - **Application name**: 任意填写
    - **Homepage URL**: `http://localhost:8000`
    - **Application description**: 任意填写或留空
    - **Authorization callback URL**: `http://localhost:8000/api/plugins/qiros-server/github_callback`
    - **Enable Device Flow**: 随意勾选或不勾选
4.  点击 **Register application**。

**第四步：配置环境变量**

1.  在刚刚创建的 OAuth Application 页面中，点击 **Generate a new client secret**。
2.  复制并记下 **Client ID** 和新生成的 **Client secret**。
3.  在 `SillyTavern\plugins\qiros-server` 文件夹内，新建一个名为 `.env` 的文件。
4.  在 `.env` 文件中填入以下内容，并替换成你自己的 ID 和 Secret：

```env
GITHUB_CLIENT_ID=你刚记下的Client ID
GITHUB_CLIENT_SECRET=你刚记下的Client secret
```

至此，后端配置完成。

**第五步：安装前端插件**

1.  打开 SillyTavern。
2.  在插件安装界面中，输入以下 URL 进行安装：
    `https://github.com/MAX-TAB/st-extension-qiros`
3.  正常完成安装即可。
