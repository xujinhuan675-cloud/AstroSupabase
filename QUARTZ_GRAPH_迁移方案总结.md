# Quartz 知识图谱迁移方案总结

## 📋 方案概述

本方案详细说明了如何将 **Quartz-4** 的知识图谱实现迁移到 **AstroSupabase** 项目中。

### 核心优势

| 特性 | 当前实现 | Quartz 实现 | 提升 |
|------|---------|------------|------|
| 渲染引擎 | Canvas 2D | WebGL (PixiJS) | **5-10倍性能** |
| 节点数量 | ~100 | 1000+ | **10倍容量** |
| 动画效果 | 基础 | 平滑动画 | **显著提升** |
| 视觉体验 | 中等 | 精美 | **显著提升** |
| 功能丰富度 | 基础 | 完整 | **完整功能** |

---

## 📁 已创建文件

### 1. 迁移方案文档
- ✅ `QUARTZ_GRAPH_MIGRATION_PLAN.md` - 完整技术方案（详细）
- ✅ `QUARTZ_GRAPH_QUICKSTART.md` - 快速开始指南
- ✅ `QUARTZ_GRAPH_迁移方案总结.md` - 本文档

### 2. 数据适配层
- ✅ `src/lib/graph-data-adapter.ts` - 数据格式转换器
  - `convertToQuartzFormat()` - 基础版本
  - `convertToQuartzFormatOptimized()` - 优化版本（并发查询）

### 3. API 端点
- ✅ `src/pages/api/content-index.json.ts` - Quartz 格式数据 API

### 4. 类型定义
- ✅ `src/types/graph-quartz.d.ts` - TypeScript 类型定义

---

## 🎯 技术架构

### 数据流

```
Supabase 数据库
    ↓
getGraphData() [links-service.ts]
    ↓
convertToQuartzFormat() [graph-data-adapter.ts]
    ↓
/api/content-index.json [API 端点]
    ↓
Quartz Graph 组件
    ↓
PixiJS 渲染 (WebGL)
```

### 技术栈

- **后端**: Astro API Routes + Drizzle ORM + Supabase
- **数据转换**: TypeScript 适配器
- **前端渲染**: PixiJS (WebGL) + D3.js (力导向布局)
- **动画**: @tweenjs/tween.js
- **样式**: CSS (从 SCSS 转换)

---

## 📦 依赖需求

### 需要安装

```bash
npm install pixi.js @tweenjs/tween.js
npm install -D @types/pixi.js
```

### 已存在依赖

- ✅ `d3`: ^7.9.0
- ✅ `@types/d3`: ^7.4.3

---

## 🚀 实施步骤

### 阶段 1: 数据层（已完成 ✅）

1. ✅ 创建数据适配器 (`graph-data-adapter.ts`)
2. ✅ 创建 API 端点 (`content-index.json.ts`)
3. ✅ 创建类型定义 (`graph-quartz.d.ts`)

### 阶段 2: 组件迁移（待实施）

1. ⏳ 安装依赖 (`pixi.js`, `@tweenjs/tween.js`)
2. ⏳ 复制并适配 `Graph.tsx` 组件
3. ⏳ 复制并适配 `graph.inline.ts` 脚本
4. ⏳ 处理路径和导航差异
5. ⏳ 处理事件系统差异

### 阶段 3: 样式迁移（待实施）

1. ⏳ 将 `graph.scss` 转换为 `graph-quartz.css`
2. ⏳ 适配 CSS 变量系统
3. ⏳ 测试主题切换

### 阶段 4: 集成测试（待实施）

1. ⏳ 替换现有 `KnowledgeGraph` 组件
2. ⏳ 测试所有交互功能
3. ⏳ 性能测试（大量节点）
4. ⏳ 跨浏览器测试

---

## 🔧 关键技术点

### 1. 数据格式转换

**AstroSupabase 格式**:
```typescript
{
  nodes: [{ id: 1, title: "...", slug: "..." }],
  links: [{ source: 1, target: 2 }]
}
```

**Quartz 格式**:
```typescript
{
  "article-slug": {
    slug: "article-slug",
    title: "...",
    links: ["other-slug"],
    tags: ["tag1"]
  }
}
```

### 2. 组件适配要点

- **Preact → React**: 语法转换
- **路径系统**: 简化路径处理（不使用 FullSlug/SimpleSlug）
- **导航**: `window.spaNavigate` → `window.location.href`
- **事件**: 自定义事件 → React 生命周期

### 3. 渲染流程

```
1. 获取数据 (fetch /api/content-index.json)
2. 构建节点和链接数据
3. 初始化 PixiJS Application
4. 设置 D3 力导向布局
5. 创建 PixiJS 图形对象（节点、链接、标签）
6. 绑定交互事件（拖拽、点击、悬停）
7. 启动动画循环
```

---

## 📊 功能对比

| 功能 | 当前 | Quartz | 状态 |
|------|------|--------|------|
| 基础图谱 | ✅ | ✅ | 完全兼容 |
| 局部图谱 | ✅ | ✅ | 完全兼容 |
| 全局图谱 | ✅ (独立页) | ✅ (弹窗) | 需要适配 |
| 节点点击跳转 | ✅ | ✅ | 需要适配路径 |
| 节点拖拽 | ✅ | ✅ | 完全兼容 |
| 缩放/平移 | ✅ | ✅ | 完全兼容 |
| 悬停高亮 | ✅ | ✅ | 完全兼容 |
| 标签节点 | ❌ | ✅ | **新增功能** |
| 径向布局 | ❌ | ✅ | **新增功能** |
| 平滑动画 | ❌ | ✅ | **新增功能** |
| 访问历史 | ✅ | ✅ | 完全兼容 |
| 主题适配 | ✅ | ✅ | 需要测试 |

---

## ⚠️ 注意事项

### 1. 性能考虑

- **WebGPU 回退**: PixiJS 会自动回退到 WebGL
- **节点数量**: 建议测试 100-1000 节点性能
- **动画帧率**: 目标 60fps

### 2. 浏览器兼容性

- **WebGL**: 所有现代浏览器支持
- **WebGPU**: Chrome 113+, Edge 113+（可选）

### 3. 数据同步

- **缓存策略**: API 缓存 5 分钟
- **实时更新**: 可选 WebSocket（未来优化）

### 4. 路由系统

- **SPA vs MPA**: 需要适配标准页面跳转
- **View Transitions**: 可选使用 Astro View Transitions API

---

## 📚 文档结构

```
AstroSupabase/
├── QUARTZ_GRAPH_MIGRATION_PLAN.md      # 完整技术方案（详细）
├── QUARTZ_GRAPH_QUICKSTART.md          # 快速开始指南
├── QUARTZ_GRAPH_迁移方案总结.md         # 本文档（总结）
├── src/
│   ├── lib/
│   │   └── graph-data-adapter.ts       # 数据适配器 ✅
│   ├── pages/
│   │   └── api/
│   │       └── content-index.json.ts   # API 端点 ✅
│   └── types/
│       └── graph-quartz.d.ts           # 类型定义 ✅
```

---

## 🎯 下一步行动

### 立即执行

1. **安装依赖**
   ```bash
   npm install pixi.js @tweenjs/tween.js
   npm install -D @types/pixi.js
   ```

2. **测试数据适配器**
   ```bash
   npm run dev
   # 访问 http://localhost:4321/api/content-index.json
   ```

3. **参考快速开始指南**
   - 查看 `QUARTZ_GRAPH_QUICKSTART.md`
   - 按照步骤复制和适配组件

### 后续优化

- 批量查询标签（减少数据库查询）
- 静态生成 content-index.json（构建时）
- WebSocket 实时更新（可选）
- 搜索和高亮功能（可选）

---

## 📖 参考资料

- **Quartz 源码**: `../quartz-4/quartz/components/Graph.tsx`
- **PixiJS 文档**: https://pixijs.com/
- **D3.js 力导向**: https://github.com/d3/d3-force
- **当前实现**: `src/components/KnowledgeGraph.tsx`

---

## ✅ 验收标准

迁移完成后，应满足：

- [ ] 局部图谱正常显示（文章页侧边栏）
- [ ] 全局图谱正常显示（独立页面或弹窗）
- [ ] 节点点击跳转正确
- [ ] 所有交互功能正常（拖拽、缩放、悬停）
- [ ] 100+ 节点流畅运行
- [ ] 主题切换正常
- [ ] 跨浏览器兼容

---

**创建时间**: 2025-01-27  
**预计完成时间**: 8-13 小时  
**当前进度**: 数据层完成 (30%)  
**下一步**: 组件迁移
