# 🔍 Quartz 迁移差距分析报告

基于 [Quartz 官网](https://quartz.jzhao.xyz/) 和源代码的完整对比分析

---

## 📊 迁移状态总览

| 类别 | Quartz 总数 | 已迁移 | 未迁移 | 完成度 |
|------|------------|--------|--------|--------|
| **核心组件** | 25+ | 2 | 23+ | ~8% |
| **交互脚本** | 11 | 1 | 10 | ~9% |
| **样式文件** | 15+ | 4 | 11+ | ~27% |
| **布局系统** | 1 | 0 | 1 | 0% |
| **总体** | **52+** | **7** | **45+** | **~13%** |

---

## ✅ 已迁移的功能

### 1. 核心组件（2/25+）

| 组件 | 状态 | 位置 | 备注 |
|------|------|------|------|
| **Backlinks** | ✅ 已迁移 | `src/components/Backlinks.tsx` | 使用 Quartz 样式 |
| **Graph** | ⚠️ 部分迁移 | `src/components/KnowledgeGraph.tsx` | 使用 react-force-graph-2d，非原生 D3 |

### 2. 转换器（2/2）

| 转换器 | 状态 | 位置 |
|--------|------|------|
| **ObsidianFlavoredMarkdown** | ✅ 完整 | `src/lib/quartz/transformers/ofm.ts` |
| **Links** | ✅ 完整 | `src/lib/quartz/transformers/links.ts` |

### 3. 工具函数（3/3）

| 工具 | 状态 | 位置 |
|------|------|------|
| **path** | ✅ 完整 | `src/lib/quartz/util/path.ts` |
| **lang** | ✅ 完整 | `src/lib/quartz/util/lang.ts` |
| **clone** | ✅ 完整 | `src/lib/quartz/util/clone.ts` |

### 4. 样式文件（4/15+）

| 样式 | 状态 | 位置 |
|------|------|------|
| **variables** | ✅ 已迁移 | `src/styles/quartz/variables.css` |
| **callouts** | ✅ 完整 | `src/styles/quartz/callouts.css` |
| **backlinks** | ✅ 完整 | `src/styles/quartz/backlinks.css` |
| **graph** | ✅ 完整 | `src/styles/quartz/graph.css` |

### 5. 客户端脚本（1/11）

| 脚本 | 状态 | 位置 |
|------|------|------|
| **callout** | ✅ 已迁移 | `src/scripts/callout.ts` |

---

## ❌ 未迁移的功能

### 📱 核心 UI 组件（23+）

#### 1. 导航和布局组件

| 组件 | 优先级 | Quartz 位置 | 功能说明 |
|------|--------|-------------|----------|
| **PageTitle** | 🔴 高 | `components/PageTitle.tsx` | 网站标题，显示在左侧栏顶部 |
| **Header** | 🔴 高 | `components/Header.tsx` | 页面顶部导航栏 |
| **Footer** | 🟡 中 | `components/Footer.tsx` | 页脚链接（GitHub、Discord 等） |
| **Breadcrumbs** | 🟡 中 | `components/Breadcrumbs.tsx` | 面包屑导航 |
| **Explorer** | 🔴 高 | `components/Explorer.tsx` | 📁 **文件浏览器**（左侧栏） |
| **MobileOnly** | 🟡 中 | `components/MobileOnly.tsx` | 移动端专用组件 |
| **DesktopOnly** | 🟡 中 | `components/DesktopOnly.tsx` | 桌面端专用组件 |
| **Flex** | 🟡 中 | `components/Flex.tsx` | 弹性布局容器 |
| **Spacer** | 🟢 低 | `components/Spacer.tsx` | 间距组件 |

#### 2. 内容显示组件

| 组件 | 优先级 | Quartz 位置 | 功能说明 |
|------|--------|-------------|----------|
| **ArticleTitle** | 🔴 高 | `components/ArticleTitle.tsx` | 文章标题显示 |
| **ContentMeta** | 🔴 高 | `components/ContentMeta.tsx` | ⏱️ 元数据（日期、阅读时间、字数） |
| **TagList** | 🔴 高 | `components/TagList.tsx` | 🏷️ 标签列表 |
| **Date** | 🟡 中 | `components/Date.tsx` | 日期显示组件 |
| **PageList** | 🟡 中 | `components/PageList.tsx` | 页面列表（用于标签页、文件夹页） |
| **RecentNotes** | 🟡 中 | `components/RecentNotes.tsx` | 📝 最近笔记列表 |
| **Body** | 🔴 高 | `components/Body.tsx` | 文章内容主体 |

#### 3. 交互功能组件

| 组件 | 优先级 | Quartz 位置 | 功能说明 |
|------|--------|-------------|----------|
| **Search** | 🔴 高 | `components/Search.tsx` | 🔍 **全文搜索**（左侧栏） |
| **TableOfContents** | 🔴 高 | `components/TableOfContents.tsx` | 📑 **目录**（右侧栏） |
| **Darkmode** | 🔴 高 | `components/Darkmode.tsx` | 🌓 **暗色模式切换** |
| **ReaderMode** | 🟡 中 | `components/ReaderMode.tsx` | 📖 **阅读模式** |
| **Comments** | 🟢 低 | `components/Comments.tsx` | 💬 评论系统（Giscus） |

#### 4. 高级功能（未迁移）

| 功能 | 优先级 | Quartz 位置 | 功能说明 |
|------|--------|-------------|----------|
| **Popover** | 🟡 中 | `scripts/popover.inline.ts` | 🎈 悬浮预览（鼠标悬停显示链接内容） |
| **SPA Navigation** | 🟡 中 | `scripts/spa.inline.ts` | ⚡ 单页应用导航（无刷新跳转） |
| **Clipboard** | 🟢 低 | `scripts/clipboard.inline.ts` | 📋 代码复制按钮 |

#### 5. 页面类型组件

| 组件 | 优先级 | Quartz 位置 | 功能说明 |
|------|--------|-------------|----------|
| **FolderContent** | 🟡 中 | `pages/FolderContent.tsx` | 文件夹内容页 |
| **TagContent** | 🟡 中 | `pages/TagContent.tsx` | 标签内容页 |
| **404** | 🟢 低 | `pages/404.tsx` | 404 错误页 |

---

### 🎨 未迁移的样式文件（11+）

| 样式文件 | 优先级 | Quartz 位置 | 功能 |
|---------|--------|-------------|------|
| **search.scss** | 🔴 高 | `styles/search.scss` | 搜索框样式 |
| **toc.scss** | 🔴 高 | `styles/toc.scss` | 目录样式 |
| **explorer.scss** | 🔴 高 | `styles/explorer.scss` | 文件浏览器样式 |
| **darkmode.scss** | 🔴 高 | `styles/darkmode.scss` | 暗色模式切换按钮 |
| **breadcrumbs.scss** | 🟡 中 | `styles/breadcrumbs.scss` | 面包屑导航样式 |
| **contentMeta.scss** | 🟡 中 | `styles/contentMeta.scss` | 元数据样式 |
| **footer.scss** | 🟡 中 | `styles/footer.scss` | 页脚样式 |
| **popover.scss** | 🟡 中 | `styles/popover.scss` | 悬浮预览样式 |
| **readermode.scss** | 🟡 中 | `styles/readermode.scss` | 阅读模式样式 |
| **recentNotes.scss** | 🟡 中 | `styles/recentNotes.scss` | 最近笔记样式 |
| **listPage.scss** | 🟡 中 | `styles/listPage.scss` | 列表页样式 |
| **clipboard.scss** | 🟢 低 | `styles/clipboard.scss` | 复制按钮样式 |

---

### ⚙️ 未迁移的客户端脚本（10/11）

| 脚本 | 优先级 | Quartz 位置 | 功能 |
|------|--------|-------------|------|
| **graph.inline.ts** | 🔴 高 | `scripts/graph.inline.ts` | 🎯 **完整 D3 + PixiJS 图谱**（650+ 行） |
| **search.inline.ts** | 🔴 高 | `scripts/search.inline.ts` | 🔍 搜索功能逻辑 |
| **toc.inline.ts** | 🔴 高 | `scripts/toc.inline.ts` | 目录交互（滚动高亮） |
| **darkmode.inline.ts** | 🔴 高 | `scripts/darkmode.inline.ts` | 暗色模式切换逻辑 |
| **explorer.inline.ts** | 🔴 高 | `scripts/explorer.inline.ts` | 文件浏览器交互 |
| **popover.inline.ts** | 🟡 中 | `scripts/popover.inline.ts` | 悬浮预览逻辑 |
| **spa.inline.ts** | 🟡 中 | `scripts/spa.inline.ts` | SPA 导航逻辑 |
| **readermode.inline.ts** | 🟡 中 | `scripts/readermode.inline.ts` | 阅读模式切换 |
| **clipboard.inline.ts** | 🟢 低 | `scripts/clipboard.inline.ts` | 复制功能 |
| **mermaid.inline.ts** | 🟢 低 | `scripts/mermaid.inline.ts` | Mermaid 图表渲染 |
| **checkbox.inline.ts** | 🟢 低 | `scripts/checkbox.inline.ts` | 任务复选框 |

---

## 🏗️ 布局系统（未迁移）

### Quartz 布局结构

```
┌──────────────────────────────────────────────────┐
│                    Header                         │
├──────────────┬────────────────────┬──────────────┤
│              │                    │              │
│  Left Sidebar│   Main Content     │ Right Sidebar│
│              │                    │              │
│ - PageTitle  │ - Breadcrumbs      │ - Graph      │
│ - Search     │ - ArticleTitle     │ - TOC        │
│ - Darkmode   │ - ContentMeta      │ - Backlinks  │
│ - ReaderMode │ - TagList          │              │
│ - Explorer   │ - Body             │              │
│              │                    │              │
└──────────────┴────────────────────┴──────────────┘
│                    Footer                         │
└──────────────────────────────────────────────────┘
```

**当前项目**：
- ❌ 没有三栏布局系统
- ❌ 没有响应式侧边栏
- ❌ 没有统一的布局配置

---

## 🎯 Quartz 官网功能清单

基于 [https://quartz.jzhao.xyz/](https://quartz.jzhao.xyz/)：

### 左侧栏（Left Sidebar）
- [ ] **Quartz 4** - 页面标题/Logo
- [ ] **🔍 搜索框** - 全文搜索
- [ ] **🌓 暗色模式** - 主题切换
- [ ] **📖 阅读模式** - 专注阅读
- [ ] **📁 Explorer** - 文件树浏览器
  - [ ] 文件夹折叠/展开
  - [ ] 文件计数显示
  - [ ] 搜索过滤

### 主内容区（Main Content）
- [x] 面包屑导航 - ⚠️ 部分（需要组件）
- [x] 文章标题 - ⚠️ 部分（需要组件）
- [x] 元数据（日期、阅读时间）- ⚠️ 部分（需要组件）
- [x] 标签列表 - ⚠️ 部分（需要组件）
- [x] 文章内容（支持 Obsidian 语法）- ✅ 已支持
- [x] Callouts - ✅ 已支持
- [x] 代码高亮 - ✅ 已支持
- [x] Mermaid 图表 - ✅ 已支持

### 右侧栏（Right Sidebar）
- [ ] **📊 Graph View** - 完整 D3 实现
  - [x] 基础图谱 - ✅ 使用 react-force-graph-2d
  - [ ] 深度过滤 - ❌
  - [ ] 全局/局部切换 - ❌
  - [ ] 标签节点 - ❌
- [ ] **📑 Table of Contents** - 目录
  - [ ] 滚动同步高亮
  - [ ] 点击跳转
- [x] **🔗 Backlinks** - 反向链接 - ✅ 已迁移

### 交互功能
- [ ] **🎈 Popover Preview** - 悬浮预览
- [ ] **⚡ SPA Navigation** - 无刷新跳转
- [ ] **📋 Copy Code** - 代码复制按钮

### 页脚（Footer）
- [ ] GitHub 链接
- [ ] Discord 社区链接
- [ ] 版权信息

---

## 📈 优先级迁移建议

### 🔴 P0 - 核心布局（必须）

1. **三栏布局系统** ⭐⭐⭐
   - 创建 Astro 布局组件
   - 左侧栏、主内容、右侧栏
   - 响应式设计

2. **PageTitle** 
   - 网站标题
   - Logo 显示

3. **Search 组件** ⭐⭐⭐
   - 全文搜索
   - 搜索索引
   - 搜索 UI

4. **Explorer 组件** ⭐⭐⭐
   - 文件树显示
   - 文件夹展开/折叠
   - 文件导航

5. **TableOfContents** ⭐⭐⭐
   - 目录提取
   - 滚动同步
   - 点击跳转

6. **Darkmode** ⭐⭐
   - 主题切换
   - 持久化存储

### 🟡 P1 - 增强功能（重要）

7. **ContentMeta**
   - 日期显示
   - 阅读时间
   - 字数统计

8. **TagList**
   - 标签显示
   - 标签链接

9. **Breadcrumbs**
   - 面包屑导航
   - 路径显示

10. **完整 Graph 实现** ⭐⭐
    - 迁移 D3 + PixiJS
    - 深度过滤
    - 全局/局部切换

11. **ReaderMode**
    - 阅读模式
    - 隐藏侧边栏

12. **Popover Preview**
    - 悬浮预览
    - 链接内容预览

### 🟢 P2 - 优化功能（次要）

13. **Footer**
14. **RecentNotes**
15. **Comments**
16. **Clipboard**
17. **SPA Navigation**

---

## 📊 技术债务分析

### 当前实现的问题

1. **Graph 组件**
   - ⚠️ 使用 `react-force-graph-2d` 而非 Quartz 原生实现
   - ❌ 缺少深度过滤
   - ❌ 缺少全局/局部切换
   - ❌ 缺少标签节点
   - ⚠️ 性能不如 PixiJS 渲染

2. **布局系统**
   - ❌ 没有三栏布局
   - ❌ 没有响应式侧边栏
   - ❌ 没有统一的布局配置

3. **搜索功能**
   - ❌ 完全缺失

4. **导航系统**
   - ❌ 没有 Explorer（文件树）
   - ❌ 没有面包屑
   - ❌ 没有目录（TOC）

5. **交互功能**
   - ❌ 没有悬浮预览
   - ❌ 没有 SPA 导航
   - ❌ 没有主题切换

---

## 🎯 推荐迁移路径

### 阶段 1：核心布局（1-2 周）

```
1. 创建三栏布局 Astro 组件
2. 迁移 PageTitle
3. 迁移 Explorer
4. 迁移基础样式
```

### 阶段 2：搜索和导航（1 周）

```
5. 迁移 Search 组件
6. 迁移 TableOfContents
7. 迁移 Breadcrumbs
8. 迁移 Darkmode
```

### 阶段 3：内容增强（1 周）

```
9. 迁移 ContentMeta
10. 迁移 TagList
11. 迁移 ArticleTitle
12. 完善样式
```

### 阶段 4：高级功能（1-2 周）

```
13. 迁移完整 Graph（D3 + PixiJS）
14. 迁移 Popover Preview
15. 迁移 ReaderMode
16. 性能优化
```

---

## 🔗 参考资源

- [Quartz 官网](https://quartz.jzhao.xyz/)
- [Quartz GitHub](https://github.com/jackyzha0/quartz)
- [Quartz 文档](https://quartz.jzhao.xyz/configuration)
- [Quartz 组件列表](https://quartz.jzhao.xyz/features/table-of-contents)

---

## ✅ 下一步行动

**请选择您希望优先迁移的功能：**

### 选项 A：快速上线（推荐初期）
- 保持当前实现
- 添加必要的 UI 组件（TagList、ContentMeta）
- 优化现有功能

### 选项 B：完整迁移（推荐长期）
1. ⭐ 先实现三栏布局
2. ⭐ 迁移 Search + Explorer + TOC
3. ⭐ 迁移完整 Graph 实现
4. ⭐ 添加其他高级功能

### 选项 C：渐进式迁移（推荐平衡）
1. 第一周：布局 + PageTitle + Explorer
2. 第二周：Search + TOC + Darkmode
3. 第三周：ContentMeta + TagList + Breadcrumbs
4. 第四周：完整 Graph + 高级功能

---

**请告诉我您选择哪个方案，我将开始相应的迁移工作！** 🚀

