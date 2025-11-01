# 知识图谱大小配置指南

## 🎯 快速配置参数位置

### 1. 节点大小

#### 全局图谱 (KnowledgeGraph.tsx)
```typescript
// 文件: src/components/KnowledgeGraph.tsx
// 行号: 48

const nodeSize = 0.5;  // 节点半径倍数
```

**推荐值**:
- `0.3` - 小节点（密集图谱）
- `0.5` - 默认（当前值）
- `0.8` - 中等节点
- `1.0` - 大节点
- `1.5` - 超大节点

---

#### 局部图谱 (LocalGraph.tsx)
```typescript
// 文件: src/components/LocalGraph.tsx
// 行号: 46

const nodeSize = 1.3;  // 节点半径倍数
```

**推荐值**:
- `0.8` - 小节点
- `1.3` - 默认（当前值）
- `1.8` - 中等节点
- `2.0` - 大节点
- `2.5` - 超大节点

---

### 2. 画布高度

#### 全局图谱页面
```astro
<!-- 文件: src/pages/graph.astro -->
<!-- 行号: 38 -->

<KnowledgeGraph 
  client:only="react" 
  height={600}  <!-- 画布高度（像素） -->
  showLegend={true}
/>
```

**推荐值**:
- `400` - 紧凑型
- `600` - 默认（当前值）
- `800` - 标准高度
- `1000` - 大屏显示
- `1200` - 全屏效果

---

#### 局部图谱（侧边栏）
```astro
<!-- 文件: src/pages/articles/[id].astro -->
<!-- 查找: <LocalGraph> 标签 -->

<LocalGraph 
  client:only="react"
  articleId={article.id}
  height={250}  <!-- 画布高度（像素） -->
  depth={1}
/>
```

**推荐值**:
- `150` - 极小侧边栏
- `200` - 紧凑型
- `250` - 默认（当前值）
- `300` - 舒适高度
- `400` - 大侧边栏

---

### 3. 字体大小

#### 全局图谱
```typescript
// 文件: src/components/KnowledgeGraph.tsx
// 行号: 49

const fontSizeConfig = 0.6;  // 标签字体大小倍数
```

#### 局部图谱
```typescript
// 文件: src/components/LocalGraph.tsx
// 行号: 47

const fontSizeConfig = 0.8;  // 标签字体大小倍数
```

**推荐值**:
- `0.4` - 小字体
- `0.6` - 默认（全局）
- `0.8` - 默认（局部）
- `1.0` - 大字体
- `1.2` - 超大字体

---

### 4. 悬停放大效果

#### 两个组件通用
```typescript
// KnowledgeGraph.tsx 行号: 50
// LocalGraph.tsx 行号: 48

const hoverScale = 1.05;  // 悬停时的放大倍数
```

**推荐值**:
- `1.0` - 无放大
- `1.05` - 默认（微放大）
- `1.1` - 明显放大
- `1.2` - 显著放大
- `1.5` - 超级放大

---

## 🎨 常见配置方案

### 方案 1: 紧凑型（节点小、信息多）

**KnowledgeGraph.tsx**:
```typescript
const nodeSize = 0.3;
const fontSizeConfig = 0.5;
const hoverScale = 1.1;
```

**graph.astro**:
```astro
<KnowledgeGraph height={800} />
```

**效果**: 适合展示大量文章（100+ 篇）

---

### 方案 2: 标准型（平衡）

**KnowledgeGraph.tsx**:
```typescript
const nodeSize = 0.5;
const fontSizeConfig = 0.6;
const hoverScale = 1.05;
```

**graph.astro**:
```astro
<KnowledgeGraph height={600} />
```

**效果**: 默认配置，适合 20-50 篇文章

---

### 方案 3: 宽松型（节点大、易读）

**KnowledgeGraph.tsx**:
```typescript
const nodeSize = 0.8;
const fontSizeConfig = 0.8;
const hoverScale = 1.1;
```

**graph.astro**:
```astro
<KnowledgeGraph height={800} />
```

**效果**: 适合少量文章（< 20 篇），强调可读性

---

### 方案 4: 演示型（超大节点）

**KnowledgeGraph.tsx**:
```typescript
const nodeSize = 1.2;
const fontSizeConfig = 1.0;
const hoverScale = 1.2;
```

**graph.astro**:
```astro
<KnowledgeGraph height={1000} />
```

**效果**: 适合演示、截图、大屏展示

---

## 📐 画布宽度调整

画布宽度默认自动适应容器，如需调整：

### 修改容器宽度

**文件**: `src/pages/graph.astro`

在 `<Layout>` 内调整容器类：

```astro
<!-- 默认: max-w-7xl (1280px) -->
<div class="max-w-7xl mx-auto px-4 py-8">

<!-- 可选方案: -->
<div class="max-w-6xl mx-auto px-4 py-8">  <!-- 1152px -->
<div class="max-w-5xl mx-auto px-4 py-8">  <!-- 1024px -->
<div class="max-w-4xl mx-auto px-4 py-8">  <!-- 896px -->
<div class="max-w-full mx-auto px-4 py-8"> <!-- 全宽 -->
```

---

## 🔧 高级调整

### 调整初始缩放倍数

**您已经调整过的参数**:

#### KnowledgeGraph.tsx (第 115 行)
```typescript
graphRef.current?.zoom(currentZoom * 0.5, 200);
```

#### LocalGraph.tsx (第 93 行)
```typescript
graphRef.current?.zoom(currentZoom * 0.5, 200);
```

**参数说明**:
- `0.3` - 缩小到 30%（画布显得很大）
- `0.5` - 缩小到 50%（当前值）
- `0.8` - 缩小到 80%
- `1.0` - 不缩放
- `1.5` - 放大到 150%（画布显得很小）
- `2.0` - 放大到 200%

---

### 调整自动适配边距

#### KnowledgeGraph.tsx (第 110、122 行)
```typescript
graphRef.current?.zoomToFit(400, 20);  // 最后一个参数是边距（像素）
```

#### LocalGraph.tsx (第 88 行)
```typescript
graphRef.current?.zoomToFit(400, 10);  // 最后一个参数是边距（像素）
```

**参数说明**:
- `10` - 很小的边距（图谱占满画布）
- `20` - 小边距（当前全局图谱）
- `30` - 中等边距
- `50` - 大边距（留白多）

---

## 📱 响应式建议

### 移动端优化

如需针对移动端调整，可以在组件中添加媒体查询：

```typescript
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };
  
  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, []);

// 使用
const nodeSize = isMobile ? 0.8 : 0.5;  // 移动端节点更大
const height = isMobile ? 400 : 600;     // 移动端画布更矮
```

---

## ✅ 修改后的验证步骤

1. **修改配置文件**
2. **保存文件**（组件会自动热重载）
3. **刷新浏览器**查看效果
4. **微调参数**直到满意

---

## 🎯 推荐配置组合

根据您的使用场景：

### 场景 1: 文章数量少 (< 20 篇)
```typescript
// 大节点、大字体
nodeSize = 0.8
fontSizeConfig = 0.8
height = 600
初始缩放 = 1.0
```

### 场景 2: 文章数量中等 (20-50 篇)
```typescript
// 标准配置
nodeSize = 0.5
fontSizeConfig = 0.6
height = 600
初始缩放 = 0.8
```

### 场景 3: 文章数量多 (50-100 篇)
```typescript
// 紧凑型
nodeSize = 0.3
fontSizeConfig = 0.5
height = 800
初始缩放 = 0.5
```

### 场景 4: 文章数量很多 (> 100 篇)
```typescript
// 超紧凑
nodeSize = 0.2
fontSizeConfig = 0.4
height = 1000
初始缩放 = 0.3
```

---

**配置完成后，刷新浏览器即可看到效果！** 🚀

