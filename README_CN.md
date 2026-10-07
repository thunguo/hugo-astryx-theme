# Hugo Astryx Theme

[English](README.md) · **简体中文**

[简介](#简介) · [截图展示](#截图展示) · [快速开始](#安装指南) · [配置指南](#配置指南) · [开发](#开发)

## 简介

一个简约、克制的 Hugo 博客主题，使用真正的 [Astryx](https://astryx.atmeta.com/) 组件，延续 Astryx 官网的视觉风格。Figtree 字体、舒展的留白和中性色界面，让阅读成为重点，同时支持浅色与深色模式。

- 中英文文章在同一个时间线中混合发布，可为译文添加关联链接。
- 响应式导航、即时全文搜索、文章目录和摄影页面。
- 带有清晰返回链接的脚注，以及保留阅读位置的图片预览。
- Hugo Chroma 代码高亮，支持语言标签、文件名、行号和复制代码。
- 构建时渲染数学公式，使用自托管的样式和字体。
- 可选的 [giscus](https://giscus.app/) 评论，界面与主题保持一致。
- 内置已构建的资源和自托管字体，日常使用只需 Hugo。

这是独立制作的适配主题，并非 Meta 官方主题。上游来源与许可见 [NOTICE](NOTICE)。本仓库也可以直接作为博客使用，内置一篇 Hello World 文章和 GitHub Pages 部署工作流。

## 截图展示

以下为仓库内置博客的实际截图，站点中仅包含一篇 Hello World 文章。

![浅色模式首页](docs/images/home-light.png)

<details>
<summary>深色模式、文章页面、手机端与搜索</summary>

| 深色模式 | 文章页面 |
| --- | --- |
| ![深色模式首页](docs/images/home-dark.png) | ![Hello World 文章](docs/images/article.png) |

| 手机端 | 搜索 |
| --- | --- |
| <img src="docs/images/mobile.png" alt="手机端首页" width="260"> | <img src="docs/images/search.png" alt="手机端搜索弹窗" width="260"> |

</details>

## 安装指南

### Fork 并发布到 GitHub Pages

整个设置过程都可以在 GitHub 上完成，不需要本地工具或自定义 Secret。

1. [Fork 本仓库](https://github.com/thunguo/hugo-astryx-theme/fork)，将公开仓库命名为 `<小写用户名>.github.io`，作为个人主页。使用其他仓库名也可以，站点地址将为 `https://<用户名>.github.io/<仓库名>/`。
2. 打开 Fork 后仓库的 **Actions** 页面，如果出现提示，启用工作流。
3. 在 **Settings > Pages > Build and deployment** 中，将 **Source** 设为 **GitHub Actions**。这些仓库设置不会随 Fork 自动复制。
4. 修改 [blog.toml](blog.toml) 顶部附近的 `title`。替换 [assets/images/logo.jpg](assets/images/logo.jpg)，或将 `params.astryx.logo` 改为自己的图片路径，然后提交到默认分支。
5. 等待 **GitHub Pages** 工作流完成，部署摘要中会提供博客链接。如果在提交后才修改 Pages 设置，可以通过 **Actions > GitHub Pages > Run workflow** 手动运行。

工作流使用 Hugo **0.167.0** 和仓库中已提交的 Astryx 资源构建站点。公开地址会从 GitHub Pages 自动读取，无需为这种部署方式修改 `baseURL`。之后每次提交到默认分支都会自动发布；Pull Request 只进行构建验证，不会部署。

初始博客只有一篇文章：[content/posts/hello-world.md](content/posts/hello-world.md)。开始写作后，可以修改或删除它。搜索和归档索引是功能页面，不是额外的文章。配置自己的 giscus 仓库之前，评论保持关闭。

### 本地预览与写作

安装 [Hugo](https://gohugo.io/installation/) **0.146.0 或更新版本**。日常写作不需要 Node.js、pnpm、Go 或 Hugo Extended。

```sh
git clone https://github.com/thunguo/hugo-astryx-theme.git
cd hugo-astryx-theme
hugo server --config hugo.toml,blog.toml -D
```

写自己的博客时，请将上游地址替换为你的 Fork 仓库地址。打开 Hugo 输出的地址，通常为 `http://localhost:1313/`。`-D` 会在预览中包含草稿。

```sh
hugo new content posts/my-first-post.md --config hugo.toml,blog.toml
hugo --config hugo.toml,blog.toml --minify
```

文章模板初始设置为 `draft: true`，发布前请改为 `false`。生产构建不会包含草稿和发布日期在未来的文章。输出目录为 `public/`，不会纳入 Git。使用其他托管服务时，在 `blog.toml` 中将 `baseURL` 设为公开站点地址，或在构建时传入 `--baseURL`。

两个配置文件各有用途：`hugo.toml` 提供主题默认配置，`blog.toml` 保存你的站点名称、导航和评论设置。内置博客直接使用本仓库中的模板，无需添加 `theme` 或指向父目录的 `themesDir`，也不要求仓库副本使用特定文件夹名称。

### 在已有 Hugo 站点中使用主题

从下载的仓库副本中，仅复制可复用的主题文件到站点的 `themes/hugo-astryx-theme/`：

```sh
mkdir -p themes/hugo-astryx-theme
cp -R /path/to/hugo-astryx-theme/assets /path/to/hugo-astryx-theme/layouts \
  /path/to/hugo-astryx-theme/static /path/to/hugo-astryx-theme/i18n \
  /path/to/hugo-astryx-theme/archetypes themes/hugo-astryx-theme/
cp /path/to/hugo-astryx-theme/hugo.toml /path/to/hugo-astryx-theme/theme.toml \
  /path/to/hugo-astryx-theme/LICENSE /path/to/hugo-astryx-theme/NOTICE \
  /path/to/hugo-astryx-theme/THIRD_PARTY_LICENSES.txt themes/hugo-astryx-theme/
```

将 `/path/to/hugo-astryx-theme` 替换为本地仓库路径，也可以手动复制相同文件。不要将内置博客的 `content/`、`blog.toml`、开发依赖或构建输出复制到主题目录。随后在你的站点配置中设置 `theme = 'hugo-astryx-theme'`，并参考 [blog.toml](blog.toml) 配置个人站点。保留已有内容，并按需创建[搜索和归档页](#内容与导航)。

## 配置指南

### 站点设置

使用内置博客时编辑 [blog.toml](blog.toml)；单独安装主题时编辑自己的 Hugo 站点配置。`title` 控制导航中的站点名称、浏览器标题和首页大标题。可选的 `params.astryx.intro` 仅覆盖首页大标题。主题配置放在 `[params.astryx]` 中：

| 配置项 | 类型 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `uiLocale` | 字符串 | Hugo 站点语言 | Astryx 控件的语言，使用 `en-US` 或 `zh-CN`，并与站点语言保持一致。 |
| `intro` | 字符串 | 站点标题 | 可选的首页大标题覆盖值。 |
| `description` | 字符串 | 未设置 | 首页介绍；页面元信息可回退到 Hugo 的 `params.description`。 |
| `logo` | 字符串 | 默认 Astryx 标志 | 导航 logo 的图片路径或 URL；设置后也会用作浏览器图标。 |
| `mainSections` | 字符串数组 | `['posts']` | 首页、归档和首页 RSS 包含的内容栏目。 |
| `showToc` | 布尔值 | `true` | 是否提供可折叠的文章目录，初始状态为收起。 |
| `defaultMode` | 字符串 | `system` | 初始显示模式：`system`、`light` 或 `dark`。读者已保存的偏好优先。 |
| `coverFallback` | 字符串 | 未设置 | 设为 `art` 时，为没有封面图片的文章生成 Astryx 图案封面。 |
| `postTypes` | 字符串映射 | 空 | 自定义文章类型的显示名称。 |

在 `[params.astryx.author]` 中通过 `name = 'Your Name'` 设置默认作者。留空时，GitHub Pages 构建会使用仓库所有者，本地构建使用站点标题。默认作者用于文章署名、页脚、作者元信息和 RSS 作者字段。文章的 `author` 可以覆盖该篇文章的署名、结构化元信息和 RSS 作者。

使用个人 logo 时，将图片放在 `assets/images/logo.jpg`，设置 `logo = 'images/logo.jpg'`。支持的位图资源会转换为宽度不超过 128px 的 PNG，并保留原始比例。静态文件、SVG 和远程图片会按原样使用。导航中显示为 32px 的圆角图片。

内置 `postType` 类型包含 `article`、`technical`、`technology`、`essay`、`research`、`photography` 和 `note`。可以添加类型或修改显示名称：

```toml
[params.astryx.postTypes]
technical = '工程'
reading = '阅读笔记'
```

设置了 `postType: reading` 的文章会在首页筛选中使用自定义名称。首页会列出全部符合条件的文章，不进行分页。Hugo 的 `pagination.pagerSize` 作用于栏目、摄影和分类列表。`mainSections` 设为空数组时，会回退到 `['posts']`，不会关闭文章列表。

### 内容与导航

| 路径 | 用途 |
| --- | --- |
| `content/posts/` | 博客文章，默认包含在首页。 |
| `content/notes/` | 研究笔记，使用笔记栏目布局。 |
| `content/photos/` | 摄影内容，通过 `cover` 图片展示在摄影索引中。 |
| `content/about/index.md` | 普通内容页，可用于个人介绍。 |
| `content/search/_index.md` | 独立搜索页，设置 `layout: search`。 |
| `content/archives/_index.md` | 归档页，设置 `layout: archives`。 |

其他栏目使用通用文章列表布局。例如，想在首页包含笔记，可以设置 `mainSections = ['posts', 'notes']`。

可 Fork 的初始博客已包含搜索和归档索引。单独安装主题时，需要自行创建这些辅助页面。`content/search/_index.md` 的内容为：

```yaml
---
title: 搜索
layout: search
---
```

`content/archives/_index.md` 的内容为：

```yaml
---
title: 归档
layout: archives
---
```

未创建这些页面时，主题中已有的相应链接会回退到首页文章列表。搜索会排除标识为 `about`、`search` 或 `archives` 的页面；其他栏目中已发布的文章都会进入搜索索引，不受 `mainSections` 限制。

独立搜索页随输入即时筛选，将关键词保留在 URL 中，并在返回页面时恢复。搜索弹窗中的“全部结果”链接会携带当前关键词进入该页面。搜索加载失败时，仍可浏览完整的文章列表。

通过 Hugo 的 `menus.main` 配置导航。使用 `pageRef` 时，导航会跟随目标页面的永久链接，也能正确包含部署子路径：

```toml
[[menus.main]]
name = '文章'
pageRef = '/posts'
weight = 10

[[menus.main]]
name = '关于'
pageRef = '/about'
weight = 20
```

先创建目标内容，再添加对应菜单。可以创建 `content/notes/_index.md` 和 `content/photos/_index.md`，自定义这些栏目的标题和介绍。标签使用 Hugo 的 `[taxonomies] tag = 'tags'`；站点存在标签时，页脚会显示标签索引链接。

### 文章 Front Matter

```yaml
---
title: 一个小而耐用的系统
date: 2026-01-01
language: zh-CN
postType: technical
description: 关于如何让实用工具保持清晰易懂的笔记。
tags: [engineering, notes]
draft: false
---
```

| 字段 | 类型 | 作用 |
| --- | --- | --- |
| `title`、`date`、`lastmod`、`draft`、`description`、`tags`、`slug` | Hugo 标准字段 | 标题、发布与更新日期、发布状态、摘要、标签和 URL。 |
| `language` | 字符串 | 文章语言，如 `en` 或 `zh-CN`；默认使用界面或站点语言。 |
| `postType` | 字符串 | 筛选类型，默认为 `article`，支持自定义类型。 |
| `author` | 字符串 | 覆盖这篇文章的署名、结构化元信息和 RSS 作者。 |
| `showToc` | 布尔值 | 覆盖全局目录设置，显式的 `false` 也会生效。 |
| `cover` | 字符串 | 页面 bundle 中的图片、资源路径、静态路径或远程图片 URL。 |
| `coverAlt` | 字符串 | 图片替代文本，默认为文章标题。 |
| `coverCaption` | 字符串 | 文章封面下的图片说明。 |
| `coverArt` | 布尔值 | 覆盖图案封面的回退设置；真实的 `cover` 始终优先。 |
| `translationKey` | 字符串 | 关联互为译文的文章。 |
| `comments` | 布尔值 | 全局评论开关启用后，单独启用或关闭本页评论。 |
| `giscusTerm` | 字符串 | 在 `mapping = 'specific'` 时指定共享的讨论标识。 |
| `giscusNumber` | 数字或字符串 | 在 `mapping = 'number'` 时指定已有讨论的编号。 |

建议用叶子 bundle 将文章及其图片放在一起：

```text
content/posts/my-article/
├── index.md
└── cover.jpg
```

在文章中设置 `cover: cover.jpg`。站点通用图片可以放在 `assets/images/`，通过 `cover: images/example.jpg` 引用。`static/images/` 中的文件也支持路径引用，但除非将其挂载为资源，否则不会进行缩放；需要这种处理时，请显式添加 `assets` 和 `static` 的资源挂载。没有封面时，默认以纯文字条目展示。

独立成段的 Markdown 图片标题会成为图片说明；启用 JavaScript 时，点击图片会打开 Astryx Lightbox：

```markdown
![林间小径](images/forest.jpg "雨后的光")
```

预览会对同一图片的重复链接去重。图片加载失败时，可以重试、打开原图或切换到其他图片。关闭预览会恢复阅读位置。未启用 JavaScript 时，图片链接仍可打开原始文件。

### 中英文内容

主题提供英文和简体中文界面翻译。请保持 Hugo 站点语言、`params.astryx.uiLocale`、菜单名称和站点介绍的语言一致。

初始博客使用简体中文。切换为英文界面时，替换语言块，并修改已有的 `uiLocale` 值：

```toml
defaultContentLanguage = 'en'

[languages.en]
locale = 'en-US'

[params.astryx]
uiLocale = 'en-US'
```

将这些值合并到已有配置中，不要重复声明 `[params.astryx]` 表。根据需要翻译菜单名称和内容页标题。文章的 `language` 与界面语言独立，中英文文章会混合显示在同一个时间线和搜索索引中。

关联两篇译文时，为它们设置相同的 `translationKey`，并使用不同的 slug 或 bundle 路径。文件名可以使用 `article-en.md` 和 `article-zh.md`。这种混合发布方式应避免使用 `.en.md` / `.zh-cn.md` 后缀，因为 Hugo 会将它们识别为多语言站点文件。

### 代码块

Hugo Chroma 会在构建时生成代码高亮。代码围栏支持文件名、行号和高亮行：

````markdown
```python {filename="notes_to_json.py" linenos=true hl_lines="2-3"}
import json
data = {"title": "Reading notes"}
print(json.dumps(data))
```
````

通过 `linenostart` 可以修改起始行号。全局默认值放在 Hugo 的 `[markup.highlight]` 中。主题使用 CSS 类和内联行号，让代码与行号一起滚动；不支持的语言会显示为纯文本。复制按钮会复制不含行号的原始代码，需要 JavaScript；代码本身在未启用 JavaScript 时仍可正常阅读。

代码块或表格超出可见宽度时，会显示轻微的边缘提示，并支持通过键盘滚动。

脚注提供可见的返回链接。目录和脚注导航会将目标定位在页头下方，同时移动键盘焦点；滚动效果会遵循减少动态效果的系统偏好。

### 数学公式

在 Markdown 中直接编写 LaTeX。行内公式使用 `$...$` 或 `\(...\)`，独立公式块使用 `$$...$$` 或 `\[...\]`：

```markdown
恒等式 $e^{i\pi}+1=0$ 成立，另有 \(a^2+b^2=c^2\)。

$$
\int_0^1 x^2\,dx=\frac{1}{3}
$$

\[
\sum_{n=1}^{\infty}\frac{1}{n^2}=\frac{\pi^2}{6}
\]
```

Hugo 构建站点时会自动使用内置的 [`transform.ToMath`](https://gohugo.io/functions/transform/tomath/) 渲染公式，输出为 `htmlAndMathml`。包含公式的页面从本站加载内置 KaTeX CSS 和字体，其他页面不加载这些资源。公式渲染不需要客户端 JavaScript。MathML 为辅助技术提供支持；较长的公式块可以横向滚动，并支持键盘操作。日常写作仍只需 Hugo **0.146.0+**。

普通金额中的 `$` 配对时，可能被识别为行内公式。请将美元文本放在行内代码中（例如 `` `$5` ``），或在公式之外的 Markdown 中写成 `&#36;5`。

要在整个站点关闭公式渲染，将以下设置合并到 `blog.toml` 或自己的站点配置中：

```toml
[markup.goldmark.extensions.passthrough]
enable = false
```

LaTeX 语法错误或不支持的命令会让构建失败，并提供源文件位置，方便修正公式。

### 使用 giscus 评论

评论默认关闭。按照 [giscus 配置页面](https://giscus.app/)的步骤，选择一个已启用 Discussions 并安装 giscus App 的公开仓库，将生成的仓库和分类标识填入配置：

```toml
[params.astryx.comments]
enabled = true
sections = ['posts', 'notes']
repo = 'owner/repository'
repoID = 'COPY_FROM_GISCUS'
category = 'Announcements'
categoryID = 'COPY_FROM_GISCUS'
mapping = 'pathname'
strict = true
reactionsEnabled = true
emitMetadata = false
inputPosition = 'top'
loading = 'lazy'
lang = 'auto'
customTheme = true
```

仓库及分类的四个配置值必须来自你自己的 giscus 设置。如果缺少任意一项，Hugo 会给出警告并省略评论区域。站点配置不需要 GitHub token。

| 配置项 | 类型 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `enabled` | 布尔值 | `false` | 全局开关；设为 `false` 时，即使页面设置 `comments: true` 也不会启用。 |
| `sections` | 字符串数组 | `['posts', 'notes']` | 默认显示评论的栏目。空数组会回退到这些默认栏目。 |
| `repo`、`repoID`、`category`、`categoryID` | 字符串 | 未设置 | 四项均为必填，请从 giscus 复制名称和 ID。 |
| `mapping` | 字符串 | `pathname` | giscus 映射方式：`pathname`、`url`、`title`、`og:title`、`specific` 或 `number`。 |
| `term` | 数字或字符串 | 未设置 | 站点级讨论编号回退值，仅用于 `mapping = 'number'`。 |
| `strict` | 布尔值 | `true` | 严格匹配讨论，支持显式设置为 `false`。 |
| `reactionsEnabled` | 布尔值 | `true` | 显示反应表情，支持显式设置为 `false`。 |
| `emitMetadata` | 布尔值 | `false` | 允许 giscus 向父页面发送讨论元信息。 |
| `inputPosition` | 字符串 | `top` | 评论输入框位置：`top` 或 `bottom`。 |
| `loading` | 字符串 | `lazy` | `lazy`：接近评论区域时加载；`eager`：立即加载；`manual`：点击按钮后加载。 |
| `lang` | 字符串 | `auto` | 跟随界面语言，或指定 giscus 语言代码。 |
| `customTheme` | 布尔值 | `true` | 使用内置的浅色与深色 giscus 样式。 |
| `themeLight`、`themeDark` | 字符串 | 内置 CSS URL；关闭自定义样式时为 `light` / `dark` | 通过公开的 CSS URL 或 giscus 内置主题名称覆盖样式，优先于 `customTheme`。 |

全局开关启用后，`comments: false` 可以关闭单页评论；`comments: true` 可以为默认栏目之外的页面启用评论。加载失败时，会提供重试按钮和 GitHub Discussions 链接。

要让译文共享同一个讨论，设置 `mapping = 'specific'`，并为两篇文章设置相同的 `giscusTerm`。没有明确指定标识时，主题依次使用文章的 `translationKey` 和相对永久链接。关联已有讨论时，使用 `mapping = 'number'`，并在文章中设置 `giscusNumber`。

**部署自定义评论样式：** [giscus 在 iframe 内加载自定义 CSS](https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md#data-theme)。公开站点的 `/giscus/*` 样式和 `/fonts/*` 字体文件必须返回 `Access-Control-Allow-Origin: *` 响应头。部署在子目录时，路径需要包含相应前缀。生产环境请使用真实的公开 `baseURL`。本地预览时，建议设置 `customTheme = false` 使用内置样式，避免依赖公开的 CSS URL。如果托管服务无法提供这些响应头，可以设置 `customTheme = false`，使用 giscus 内置的 `light` 和 `dark` 主题，或指定合适的 `themeLight` / `themeDark` 值。

## 开发

开发主题源码需要 **Node.js 22+**、**pnpm 11** 和 **Hugo 0.146.0+**。Astryx Core 与 CLI 固定为 **0.6.5**。请在主题仓库中运行下面的命令，而不是在使用主题的站点目录中运行：

```sh
pnpm install
pnpm prepare:theme
pnpm dev
```

内置博客运行在 `http://localhost:1313/`。`pnpm build` 仅运行 Hugo，将站点输出到 `public/`；`pnpm prepare:theme` 显式重新生成 Astryx 资源和组件模板。修改 React 或主题源码后，先运行 `pnpm prepare:theme` 再预览。模板、内容和 CSS 修改由 Hugo 自动重载。

Hugo 按以下顺序查找：`HUGO_BINARY`、本地 `.tools/hugo`，然后是 `PATH` 中的 `hugo`。例如，可以运行 `HUGO_BINARY=/path/to/hugo pnpm dev`。本地 `.tools/` 文件不属于主题发布内容。

| 源文件 | 职责 |
| --- | --- |
| `src/site-theme.mjs` | 对 Astryx 官方主题的适配。 |
| `scripts/render-ui.jsx` | 使用真正的 Astryx Core 组件生成 Hugo 模板片段。 |
| `src/site-ui.jsx`、`src/app.jsx` | 导航、显示模式和筛选等交互。 |
| `src/search*.jsx`、`src/search.mjs` | 搜索弹窗与本地搜索数据源。 |
| `assets/css/theme.css` | 页面布局与 Markdown 排版。 |

修改源码后，主题发布内容中应保留生成的 `assets/css/generated/`、`assets/js/generated/`、`assets/fonts/` 和 `layouts/_partials/ui/`。搜索会在首次使用时下载静态 JSON 索引，文章数量较多的站点应评估索引大小。

```sh
pnpm build
pnpm check
pnpm exec playwright install chromium
pnpm test
```

检查会验证只有一篇文章的初始博客、重命名后的仓库目录、部署子路径和独立主题安装。浏览器测试会在 Git 忽略的 `work/` 下创建临时测试内容，使用 4174 端口运行，覆盖中英文、搜索与浏览历史、手机端布局、显示模式、评论、代码、图库、脚注和未启用 JavaScript 时的阅读体验，不会向博客添加文章。检查部署子路径时运行：

```sh
pnpm build --baseURL https://example.org/blog/
```

设计规则和上游参考文件见 [docs/design.md](docs/design.md)。

## 许可

主题代码使用 [MIT 许可](LICENSE)。Astryx 及内置依赖保留各自许可，详见 [NOTICE](NOTICE)。Figtree 的 SIL Open Font License 位于 [assets/fonts/OFL.txt](assets/fonts/OFL.txt)。内置运行时依赖的许可见 [THIRD_PARTY_LICENSES.txt](THIRD_PARTY_LICENSES.txt)。
