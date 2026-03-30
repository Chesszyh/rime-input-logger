# Web Dashboard Design

## Goal

为 Personal Input Analytics System 增加一个本地可运行的 Web Dashboard，把现有 CLI demo 的结构化数据升级为图形化、可切换、可演示的浏览器界面。

第一版重点是：

- 直接复用现有 `packages/services`、`packages/dashboard`、`packages/contracts`
- 使用内置样例场景驱动页面展示
- 支持场景切换、时间范围切换和报告显示选项
- 覆盖主线只读页面：总览、统计、词汇、时间、词库、报告

## Scope

### In Scope

- 新增独立 Web 应用 `apps/web-dashboard`
- 使用 React + Vite + TypeScript
- 页面导航、全局筛选和响应式布局
- 基于现有本地服务层的只读数据渲染
- 状态处理：`READY`、`NO_DATA`、`EMPTY_RESULT`、`ERROR`
- 基础前端测试与启动脚本

### Out of Scope

- 真实输入法采集接入
- HTTP API / 后端服务层拆分
- 用户账号、认证、远端部署
- 删除、保留、导出执行等高风险写操作
- 真正的桌面 GUI 包装

## Product Positioning

这是一个“本地演示优先”的 Web Dashboard，而不是完整上线产品。它的职责是把当前已经存在的分析链路以更直观的方式展示出来，让使用者和维护者可以：

- 更快理解分析结果
- 更自然地切换样例场景
- 更容易进行演示、验收和视觉层测试

首版不追求复杂交互，而追求“主线完整、信息清晰、状态可信”。

## Information Architecture

### Global Layout

采用“三段式”布局：

1. 左侧主导航
2. 顶部全局控制条
3. 主内容区

桌面端：

- 左侧导航固定显示
- 顶部控制条固定在内容区上方
- 主内容使用卡片栅格布局

移动端：

- 左侧导航折叠为抽屉
- 顶部控制条改为可换行堆叠
- 图表和表格优先纵向堆叠

### Navigation

页面导航项：

- `Overview`
- `Stats`
- `Vocabulary`
- `Time`
- `Lexicon`
- `Report`

每个导航项显示：

- 页面名
- 简短说明
- 当前 `ViewState.code`

这样用户无需点入即可知道该页面是否有数据。

### Top Control Bar

顶部控制条包含：

- 场景切换器：`normal-day`、`empty-history`、`power-user-day`、`filtered-day`
- 时间范围切换器：`today`、`last-7-days`、`last-30-days`、`this-month`、`all-time`
- 报告配置开关：
  - `hide terms`
  - `masked content`
- 当前范围摘要
- 页面级状态提示

## Page Design

### Overview

目标：最快速展示“这段时间的输入总体情况”。

组成：

- 顶部 KPI 卡片：
  - 输入字数
  - 输入条数
  - 活跃天数
  - 连续活跃
  - 最近输入
- 中部双栏：
  - 输入趋势图
  - 活跃时段概览
- 底部摘要区：
  - highlights
  - 报告摘要卡
  - 词库总览卡

### Stats

目标：突出数量趋势和会话体量。

组成：

- 趋势折线图 / 面积图
- 会话统计卡片：
  - 会话次数
  - 平均会话时长
  - 最长会话
  - 专注会话数量
- 体量对比图

原则：

- 空状态时仍保留图表卡片框架
- 用户应能区分“无数据”和“组件未加载”

### Vocabulary

目标：展示“用户最近在输入什么，以及哪些词在升温或降温”。

组成：

- 高频词排行
- 新词列表
- rising / falling 双列变化卡
- phrase terms 区域
- 词云或权重标签区

原则：

- 同时强调“频率”和“变化”
- 避免做成纯词表页面

### Time

目标：展示输入节律和活跃时间模式。

组成：

- 24 小时活跃分布图
- 日期 × 时段热力图
- 会话强度摘要卡
- 跨日会话提示

原则：

- 时间密度信息优先
- 跨日场景要有明确提示，避免误判

### Lexicon

目标：可视化展示词库资产，而不是实现完整词库后台。

组成：

- 词库总览卡片
- 分类筛选区
- 词条表格
- 高频新增 / 低频陈旧双列表
- Rime 导出预览片段

原则：

- 首版仅只读
- 表格在移动端允许横向滚动，但不破坏整体布局

### Report

目标：把已有报告对象变成可阅读的报告工作台。

组成：

- 模板切换：日报 / 周报 / 月报
- 报告摘要
- 章节列表
- 文本预览区
- 脱敏状态与术语显示状态说明

原则：

- 首版做“预览”和“解释”，不做真正导出执行

## Visual Direction

参考 `ui-ux-pro-max`，首版采用 `Data-Dense Dashboard` 方向，但避免传统企业 BI 的沉闷风格。

### Visual Personality

- 技术感明确
- 信息密度高
- 浅色优先
- 冷静、精确、偏语言分析工作台气质

### Color System

- Primary: `#1E40AF`
- Secondary: `#3B82F6`
- Accent: `#F59E0B`
- Background: `#F8FAFC`
- Deep Text: `#1E3A8A`

补充策略：

- 页面底色使用冷灰蓝
- 关键高亮使用琥珀色
- 错误与警告采用克制的状态色，不抢主视觉

### Typography

- Heading: `Fira Code`
- Body: `Fira Sans`

原因：

- 与“输入法 / 语言 / 数据分析”主题一致
- 保持技术精确感
- 区分普通 SaaS 仪表盘的模板化气质

### Component Styling

- 中等圆角
- 清晰边框
- hover 仅做颜色、阴影或边框变化
- 不使用会引发布局漂移的 scale hover
- 图标统一使用 Lucide 或同类 SVG 图标集，不使用 emoji

### Motion

- 页面切换和交互动画控制在 `150-250ms`
- 一页内仅有少量关键动画
- 尊重 `prefers-reduced-motion`
- 不使用滚动视差

## Technical Architecture

## App Structure

建议结构：

- `apps/web-dashboard/src/main.tsx`
- `apps/web-dashboard/src/App.tsx`
- `apps/web-dashboard/src/styles/*`
- `apps/web-dashboard/src/routes/*`
- `apps/web-dashboard/src/components/*`
- `apps/web-dashboard/src/features/dashboard/*`
- `apps/web-dashboard/src/features/lexicon/*`
- `apps/web-dashboard/src/lib/view-models/*`
- `apps/web-dashboard/src/lib/services/*`

### Data Access Strategy

浏览器端直接复用本地模块：

1. `createServiceRegistry()`
2. `services.dashboard.getDashboardBootstrap()`
3. `services.lexicon.*`
4. `buildDashboardExperience()`

前端不会直接把底层契约散落到组件中，而是增加一层 `view-model`：

- 组件依赖前端友好的 UI 模型
- 服务返回值先在 `view-model` 层做归一
- 后续如果接 HTTP API，可以保留组件层不动

### State Model

首版只保留最小全局状态：

- `scenarioId`
- `preset`
- `hideTermsInReport`
- `forceMaskedContent`
- `activePage`
- `loading`
- `error`

首版不引入重量级状态管理库，优先使用 React state / context。

## Interaction Model

### Primary Interactions

- 切换场景
- 切换时间范围
- 切换页面
- 切换报告视图参数
- 在词库页筛选词条类别

### Error Handling

- 非法场景或参数：
  - 顶部错误横幅
  - 显示可恢复说明
- 数据为空：
  - 页面显示空状态卡
  - 保留框架与上下文说明
- 服务异常：
  - 统一错误面板
  - 提供重试按钮

## Chart Strategy

推荐：

- 趋势：折线图 / 轻面积图
- 排行：水平条形图
- 时段：柱状图
- 热力图：自定义矩阵格子
- 词云：首版使用“权重标签云”替代自由布局词云

不推荐首版引入：

- 雷达图
- 复杂 3D 图表
- 高交互拖拽可视化

## Accessibility And Responsiveness

必须满足：

- 键盘可导航
- 焦点态可见
- 色彩不是唯一信息渠道
- `prefers-reduced-motion` 生效
- 无横向滚动主布局
- 在 `375 / 768 / 1024 / 1440` 宽度下可用

特殊处理：

- 表格区使用 `overflow-x-auto`
- 图表需提供标题、单位和说明
- 错误提示使用 `role="alert"` 或等效可达方案

## Acceptance Criteria

第一版完成标准：

1. 新增 `apps/web-dashboard`
2. 可通过统一命令启动本地 Web 页面
3. 六个页面均可访问
4. 四个样例场景均可切换
5. 时间范围切换生效
6. `READY / NO_DATA / EMPTY_RESULT / ERROR` 均有清晰 UI
7. 桌面与移动端都能正常显示
8. 至少具备：
   - 页面渲染 smoke test
   - 场景切换 test
   - 空状态 test

## Risks

- 现有 `services` 更偏本地脚本消费，浏览器直接引用时可能遇到构建边界问题
- 图表库引入过重会拖慢首版速度
- 如果组件直接耦合底层 contracts，后续切 API 会增加迁移成本
- 词云和热力图如果一开始做太复杂，会拉长实现周期

## Recommendation

按“独立 Vite + React 应用、本地服务直连、只读主线页面”的方式推进第一版。这是当前代码基础下实现成本最低、演示价值最高、风险最可控的路径。
