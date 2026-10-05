# cloud-file-manager
一站式管理我在各个平台的云文件

这是一个部署在 Cloudflare Pages 上的轻量级文件索引页，用于统一管理分散在各网盘、图床等平台的文件。

数据存储使用 **Cloudflare D1**，前端为 **单文件 HTML**，后端为 **Cloudflare Pages Functions**，无需服务器、无需构建步骤。

---

## 功能

- 列表展示文件信息：封面图、文件名、文件大小、类型、更新时间、标签、备注
- 同一文件可关联多个平台，按钮并列展示
- 点击平台按钮，一键复制该平台的文件链接
- 按文件名、标签、备注、平台名实时搜索
- 响应式布局，移动端可用

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | 原生 HTML / CSS / JavaScript（单文件） |
| 后端 | Cloudflare Pages Functions |
| 数据库 | Cloudflare D1（SQLite） |
| 部署 | Cloudflare Pages 控制台 |

---

## 项目结构

```text

.
├── index.html              # 前端页面（含样式与逻辑）
├── functions/
│   └── api/
│       └── files.js        # GET /api/files，返回文件列表 JSON
└── README.md

```

---

## 数据模型

### `files` 表

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER | 主键，自增 |
| `name` | TEXT | 文件名 |
| `cover` | TEXT | 封面图 URL |
| `size_bytes` | INTEGER | 文件大小（字节） |
| `file_type` | TEXT | 文件类型，如 `pdf`、`jpg`、`zip` |
| `tags` | TEXT | 标签，英文逗号分隔 |
| `remark` | TEXT | 备注 |
| `updated_at` | TEXT | 更新时间 |
| `created_at` | TEXT | 创建时间 |

### `platforms` 表

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | INTEGER | 主键，自增 |
| `file_id` | INTEGER | 外键，关联 `files.id` |
| `name` | TEXT | 平台名称，如 `百度网盘` |
| `color` | TEXT | 按钮颜色（HEX），建议与平台图标一致 |
| `url` | TEXT | 文件在该平台的链接 |

一个文件可对应多个平台记录。

---

## 快速开始

你需要准备

- 一个Cloudflare账号

### 1. 创建 D1 数据库

进入 Cloudflare 控制台 → **Storage & Databases** → **D1 SQL Database** → **Create**，命名例如 `file_hub`。

进入该数据库的 **Console** 标签页，逐条执行建表与插入语句（见下方 [初始化 SQL](#初始化-sql)）。

### 2. 创建 Pages 项目

控制台 → **Workers & Pages** → **Create** → **Pages** → **Upload assets**。

将整个项目文件夹（含 `index.html` 与 `functions/`）上传，点击 **Deploy**。

> 也可选择连接 Git 仓库，构建输出目录留空或填 `/`。

### 3. 绑定 D1

进入 Pages 项目 → **Settings** → **Functions** → **D1 database bindings** → **Add binding**：

- **Variable name**：`DB`（必须与 `functions/api/files.js` 中的 `env.DB` 一致）
- **D1 database**：选择上一步创建的数据库

建议 Production 与 Preview 环境都绑定。

### 4. 重新部署

绑定后需重新部署才会生效：

项目页 → **Deployments** → 最新一条 → **⋯** → **Retry deployment**。

### 5. 验证

访问：

- `https://<项目>.pages.dev/` — 前端页面
- `https://<项目>.pages.dev/api/files` — 应返回 JSON 数组

> 注意：Functions 的路由会去掉 `.js` 后缀，正确路径是 `/api/files`，不是 `/api/files.js`。

---

## 初始化 SQL

```sql
DROP TABLE IF EXISTS files;
DROP TABLE IF EXISTS platforms;

CREATE TABLE files (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  cover         TEXT,
  size_bytes    INTEGER NOT NULL DEFAULT 0,
  file_type     TEXT    NOT NULL DEFAULT 'file',
  tags          TEXT    NOT NULL DEFAULT '',
  remark        TEXT    NOT NULL DEFAULT '',
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE platforms (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id   INTEGER NOT NULL,
  name      TEXT    NOT NULL,
  color     TEXT    NOT NULL DEFAULT '#2563eb',
  url       TEXT    NOT NULL,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

CREATE INDEX idx_platforms_file_id ON platforms(file_id);
CREATE INDEX idx_files_updated_at ON files(updated_at DESC);
```

### 示例数据

```sql
INSERT INTO files (name, cover, size_bytes, file_type, tags, remark)
VALUES
('2026 前端工程化实战.pdf',
 'https://picsum.photos/seed/frontend/160/220',
 18432000, 'pdf', '前端,工程化', '内部培训资料');

INSERT INTO platforms (file_id, name, color, url) VALUES
(1, '百度网盘', '#2563eb', 'https://pan.baidu.com/s/xxxx'),
(1, '阿里云盘', '#2563eb', 'https://www.alipan.com/s/xxxx');
```

---

## 接口说明

GET /api/files

返回全部文件及其关联平台。

响应示例：

```json
[
  {
    "id": 1,
    "name": "2026 前端工程化实战.pdf",
    "cover": "https://picsum.photos/seed/frontend/160/220",
    "size": "17.58 MB",
    "type": "pdf",
    "tags": ["前端", "工程化"],
    "remark": "内部培训资料",
    "updated_at": "2026-09-30 23:53:08",
    "platforms": [
      {
        "name": "百度网盘",
        "color": "#2563eb",
        "url": "https://pan.baidu.com/s/xxxx"
      },
      {
        "name": "阿里云盘",
        "color": "#2563eb",
        "url": "https://www.alipan.com/s/xxxx"
      }
    ]
  }
]
```

- size_bytes 在后端已格式化为可读字符串（size 字段）
- tags 在后端已按逗号拆分为数组

---

## 可自定义的内容

|需求| 修改位置|
|-|-|
|平台按钮颜色| platforms.color，填平台图标主色调 HEX|
|文件类型缩写| index.html 中的 typeLabel() 映射表|
|文件大小颜色| CSS 变量 --size（默认 #f97316 橙色）|
|页面标题与描述 |index.html 中 <header> 部分，搜索范围 index.html 中的 filter() 函数|

---

## 常见问题

Q：访问 /api/files 返回 500？
A：检查 D1 绑定变量名是否为 DB，以及建表语句是否成功执行。

Q：访问 /api/files.js 返回的是主页？
A：正常。Pages Functions 路由会去掉 .js 后缀，.js 路径无匹配时回退到静态资源。

Q：页面空白，控制台报错？
A：检查 index.html 中脚本顺序：DATA 与 DOM 引用在前，函数居中，init() 在末尾执行。避免使用顶层 await。

Q：绑定 D1 后仍无数据？
A：绑定后必须重新部署才生效。

---

## License

MIT
