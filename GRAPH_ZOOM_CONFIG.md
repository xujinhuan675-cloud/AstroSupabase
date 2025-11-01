# 知识图谱缩放和居中配置说明

## 📅 最后更新
2025-11-01

## 🎯 当前配置

### 全局知识图谱 (KnowledgeGraph.tsx)

**初始缩放**: `0.25x`（25%）  
**居中位置**: `(0, 0)` - 画布中心  
**效果**: 画布看起来很宽广，节点较小，视野开阔

**代码位置**: `src/components/KnowledgeGraph.tsx` 第 87-100 行

```typescript
const focusOnCurrentArticle = useCallback(() => {
  if (!graphRef.current || !graphData.nodes.length || hasFocused) return;
  
  setTimeout(() => {
    // 直接居中到画布中心(0, 0)
    graphRef.current?.centerAt(0, 0, 0);
    setTimeout(() => {
      // 设置初始缩放为0.25，让画布看起来更宽广
      graphRef.current?.zoom(0.25, 200);
    }, 100);
  }, 300);
  
  setHasFocused(true);
}, [graphData, hasFocused]);
```

---

### 局部知识图谱 (LocalGraph.tsx)

**初始缩放**: `0.3x`（30%）  
**居中位置**: `(0, 0)` - 画布中心  
**效果**: 画布宽广，节点适中

**代码位置**: `src/components/LocalGraph.tsx` 第 83-96 行

```typescript
const focusOnCurrentArticle = useCallback(() => {
  if (!graphRef.current || !graphData.nodes.length || hasFocused) return;
  
  setTimeout(() => {
    // 直接居中到画布中心(0, 0)
    graphRef.current?.centerAt(0, 0, 0);
    setTimeout(() => {
      // 局部图谱设置初始缩放为0.3
      graphRef.current?.zoom(0.3, 200);
    }, 100);
  }, 300);
  
  setHasFocused(true);
}, [graphData, hasFocused]);
```

---

## 🎨 调整建议

### 如果您觉得画布太大（节点太小）

**增大缩放值**:

| 缩放值 | 效果 | 适用场景 |
|--------|------|---------|
| `0.15` | 超宽广画布，节点很小 | 100+ 篇文章 |
| `0.25` | 宽广画布，节点较小 | **当前全局图谱** ✅ |
| `0.3` | 宽广画布，节点适中 | **当前局部图谱** ✅ |
| `0.5` | 标准画布，节点中等 | 20-50 篇文章 |
| `0.8` | 紧凑画布，节点较大 | 5-10 篇文章 |
| `1.0` | 很紧凑，节点大 | < 5 篇文章 |

---

### 如果您觉得画布太小（节点太大）

**减小缩放值**:

```typescript
// 全局图谱
graphRef.current?.zoom(0.15, 200);  // 超宽广

// 局部图谱  
graphRef.current?.zoom(0.2, 200);   // 宽广
```

---

## 📝 修改方法

### 方法 1: 直接修改缩放值

**KnowledgeGraph.tsx** (第 95 行):
```typescript
graphRef.current?.zoom(0.25, 200);
//                     ^^^^
//                     修改这个数字
```

**LocalGraph.tsx** (第 91 行):
```typescript
graphRef.current?.zoom(0.3, 200);
//                     ^^^
//                     修改这个数字
```

---

### 方法 2: 调整节点大小（配合缩放）

如果缩放值太小导致节点难以看清，可以增大节点本身的大小：

**KnowledgeGraph.tsx** (第 48 行):
```typescript
const nodeSize = 0.5;  // 改为 0.8 或 1.0
```

**LocalGraph.tsx** (第 46 行):
```typescript
const nodeSize = 1.3;  // 改为 1.5 或 2.0
```

---

## 🎯 推荐配置组合

### 场景 1: 单个或少量文章 (1-5 篇)
```typescript
// 全局图谱
const nodeSize = 0.8;
graphRef.current?.zoom(0.5, 200);  // 较大缩放

// 局部图谱
const nodeSize = 1.5;
graphRef.current?.zoom(0.5, 200);
```

### 场景 2: 中等数量文章 (5-20 篇) ✅ **推荐**
```typescript
// 全局图谱
const nodeSize = 0.5;
graphRef.current?.zoom(0.3, 200);  // 中等缩放

// 局部图谱
const nodeSize = 1.3;
graphRef.current?.zoom(0.4, 200);
```

### 场景 3: 大量文章 (20-50 篇) ✅ **当前配置**
```typescript
// 全局图谱
const nodeSize = 0.5;
graphRef.current?.zoom(0.25, 200);  // 较小缩放

// 局部图谱
const nodeSize = 1.3;
graphRef.current?.zoom(0.3, 200);
```

### 场景 4: 超大规模 (50+ 篇)
```typescript
// 全局图谱
const nodeSize = 0.3;
graphRef.current?.zoom(0.15, 200);  // 很小缩放

// 局部图谱
const nodeSize = 1.0;
graphRef.current?.zoom(0.2, 200);
```

---

## ✅ 修改完成

**已应用配置**:
- ✅ 节点居中显示在画布中心 `(0, 0)`
- ✅ 全局图谱初始缩放: `0.25x`（让画布显得更宽广）
- ✅ 局部图谱初始缩放: `0.3x`（适中）

---

## 🚀 验证效果

**刷新浏览器查看**:
```
http://localhost:4321/graph
```

**预期效果**:
- ✅ 节点在画布正中央显示
- ✅ 画布看起来很宽广（缩放为25%）
- ✅ 可以使用滚轮放大查看节点详情

---

## 💡 提示

1. **缩放太小看不清？** - 使用鼠标滚轮放大
2. **想看完整画布？** - 按住鼠标拖动查看其他区域
3. **节点位置不对？** - 拖动节点调整位置

**用户交互**:
- 🖱️ **滚轮**: 缩放视图
- 🖱️ **拖动背景**: 平移画布
- 🖱️ **拖动节点**: 调整节点位置
- 🖱️ **点击节点**: 跳转到文章

---

**配置文件**: `GRAPH_ZOOM_CONFIG.md`  
**状态**: ✅ 配置完成

