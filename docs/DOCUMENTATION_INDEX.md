# 📚 文档索引

**最后更新:** v2.5.0 (2026-05-03)

本文档提供了项目所有文档的快速导航，帮助您快速找到所需信息。

---

## 🚀 新手入门

### 必读文档
1. **[README.md](../README.md)** - 项目概览、功能介绍、快速开始
2. **[docs/QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)** - 3分钟快速上手教程
3. **[CHANGELOG.md](../CHANGELOG.md)** - 版本更新历史

### 快速参考
- **[docs/SOLAR_SYSTEM_QUICK_REF.md](SOLAR_SYSTEM_QUICK_REF.md)** - 太阳系快速参考卡
- **[docs/REALISTIC_SOLAR_SYSTEM_QUICK_REF.md](REALISTIC_SOLAR_SYSTEM_QUICK_REF.md)** - 真实太阳系比例速查

---

## 🌌 核心功能文档

### 太阳系模型
- **[docs/SOLAR_SYSTEM_GUIDE.md](SOLAR_SYSTEM_GUIDE.md)** - 完整太阳系模型使用指南
- **[docs/REALISTIC_SOLAR_SYSTEM.md](REALISTIC_SOLAR_SYSTEM.md)** - 真实比例太阳系详解
- **[docs/PLANETARY_ORBITS_GUIDE.md](PLANETARY_ORBITS_GUIDE.md)** - 行星轨道系统指南
- **[docs/ORBIT_LINES_GUIDE.md](ORBIT_LINES_GUIDE.md)** - 轨道路径可视化说明

### 黄道十二宫与星宿（v2.5.0 新增）
- **[docs/ZODIAC_AND_LUNAR_MANSIONS_GUIDE.md](ZODIAC_AND_LUNAR_MANSIONS_GUIDE.md)** - 黄道十二宫与二十八宿完全指南
  - 动态星座高亮原理
  - 西方十二星座详解
  - 中国二十八宿文化
  - InstancedMesh 性能优化

### 航天器系统
- **[docs/SPACECRAFT_LAUNCHER_GUIDE.md](SPACECRAFT_LAUNCHER_GUIDE.md)** - 航天器发射模拟器指南
- **[docs/SPACECRAFT_LAUNCHER_FINAL_TEST.md](SPACECRAFT_LAUNCHER_FINAL_TEST.md)** - 发射模拟器测试报告
- **[docs/SPACECRAFT_LAUNCHER_TROUBLESHOOTING.md](SPACECRAFT_LAUNCHER_TROUBLESHOOTING.md)** - 发射模拟器故障排除

### KSP 游戏模式
- **配置面板** - 按 `C` 键打开航天器配置面板
- **6个预设模板**: 神舟、龙飞船、联盟号、ISS、哈勃、旅行者号
- **飞行控制**: WASD 控制节流阀和姿态

---

## ⚡ 性能优化

### 优化指南
- **[docs/PERFORMANCE_OPTIMIZATION_GUIDE.md](PERFORMANCE_OPTIMIZATION_GUIDE.md)** - 性能优化完全指南
  - InstancedMesh 批量渲染技术
  - 对象池化技术
  - 状态缓存机制
  - 几何体简化策略
  - 材质优化技巧
  - Chrome DevTools 性能分析

### 性能数据
| 指标 | v2.4.0 | v2.5.0 | 提升 |
|------|--------|--------|------|
| Draw Calls | 130+ | 2-3 | **95%+** |
| FPS | 35-45 | 58-60 | **40%+** |
| 内存 | 85 MB | 62 MB | **27%** |
| GC 频率 | 12次/秒 | 0次/秒 | **100%** |

---

## 🛠️ 技术文档

### 架构设计
- **[docs/MODES_README.md](MODES_README.md)** - 系统模式说明
- **[docs/TEACHING_REFACTORING_SUMMARY.md](TEACHING_REFACTORING_SUMMARY.md)** - 教学重构总结

### 着色器开发
- `src/shaders/earth/` - 地球着色器（顶点/片元）
- `src/shaders/solarSystem/` - 太阳系着色器
  - 太阳、类地行星、气态巨行星、光环

### 物理模拟
- **CR3BP 模型**: 圆形限制性三体问题（拉格朗日点计算）
- **RK4 积分**: 四阶龙格-库塔法（航天器轨道预测）
- **开普勒定律**: 行星轨道运动模拟

---

## 📖 教育资料

### 航空航天知识
- **[docs/AEROSPACE_HISTORY_EVENTS.md](AEROSPACE_HISTORY_EVENTS.md)** - 航空航天历史事件时间轴
- **[docs/AEROSPACE_THEORY_KNOWLEDGE_BASE.md](AEROSPACE_THEORY_KNOWLEDGE_BASE.md)** - 航空航天理论知识库
- **[docs/KNOWLEDGE_BASE_INTEGRATION.md](KNOWLEDGE_BASE_INTEGRATION.md)** - 知识库集成说明

### 学习资源
- **[docs/CHAPTER_EXERCISES.md](CHAPTER_EXERCISES.md)** - 章节练习题系统
- **[docs/EXAM_REVIEW_GUIDE.md](EXAM_REVIEW_GUIDE.md)** - 考试复习指南
- **[docs/EXERCISE_GENERATION_SUMMARY.md](EXERCISE_GENERATION_SUMMARY.md)** - 练习题生成总结

### 特殊轨道
- **[docs/HALO_AND_FROZEN_ORBITS_GUIDE.md](HALO_AND_FROZEN_ORBITS_GUIDE.md)** - Halo 轨道与冻结轨道指南
- **[docs/HALO_FROZEN_ORBITS_QUICK_REF.md](HALO_FROZEN_ORBITS_QUICK_REF.md)** - 特殊轨道快速参考

---

## 🔧 开发与维护

### 版本发布说明
- **[RELEASE_NOTES_V2.5.0.md](../RELEASE_NOTES_V2.5.0.md)** - v2.5.0 发布说明（最新）
- **[RELEASE_NOTES_V2.4.0.md](../RELEASE_NOTES_V2.4.0.md)** - v2.4.0 发布说明
- **[RELEASE_NOTES_V2.3.0.md](../RELEASE_NOTES_V2.3.0.md)** - v2.3.0 发布说明

### 更新总结
- **[UPDATE_SUMMARY_V2.5.0.md](../UPDATE_SUMMARY_V2.5.0.md)** - v2.5.0 更新总结
- **[docs/UPDATE_SUMMARY.md](UPDATE_SUMMARY.md)** - 通用更新总结
- **[docs/REALISTIC_UPGRADE_SUMMARY.md](REALISTIC_UPGRADE_SUMMARY.md)** - 真实比例升级总结
- **[docs/SOLAR_SYSTEM_UPGRADE_SUMMARY.md](SOLAR_SYSTEM_UPGRADE_SUMMARY.md)** - 太阳系升级总结
- **[docs/SOLAR_SYSTEM_PRO_UPGRADE.md](SOLAR_SYSTEM_PRO_UPGRADE.md)** - 太阳系专业版升级

### Bug 修复报告
- **[docs/BUG_FIX_REPORT.md](BUG_FIX_REPORT.md)** - Bug 修复报告
- **[docs/FINAL_FIX_REPORT.md](FINAL_FIX_REPORT.md)** - 最终修复报告
- **[docs/SOLAR_SYSTEM_FIX.md](SOLAR_SYSTEM_FIX.md)** - 太阳系修复说明
- **[docs/SOLAR_SYSTEM_FIX_V1.7.1.md](SOLAR_SYSTEM_FIX_V1.7.1.md)** - v1.7.1 修复
- **[docs/PLANET_DISTANCE_FIX_V1.7.2.md](PLANET_DISTANCE_FIX_V1.7.2.md)** - 行星距离修复
- **[docs/ELLIPSE_ORBIT_FIX_V1.7.3.md](ELLIPSE_ORBIT_FIX_V1.7.3.md)** - 椭圆轨道修复
- **[docs/ORBIT_ENHANCEMENT_V2.md](ORBIT_ENHANCEMENT_V2.md)** - 轨道增强 v2

---

## 📊 项目统计

### 代码规模
- **总代码行数**: ~3,500 行
- **核心模块**:
  - `kspGame.js`: 1,740 行
  - `solarSystem.js`: 520 行
  - `zodiacManager.js`: 380 行
  - `script.js`: 450 行
  - `spacecraftLauncher.js`: 410 行

### 文档规模
- **总文档行数**: ~4,500 行
- **文档数量**: 35+ 个 Markdown 文件
- **覆盖范围**: 功能说明、技术指南、教育资料、开发文档

### 天体数量
- **太阳**: 1 个（含光晕、日冕、粒子系统）
- **行星**: 8 个（水星到海王星）
- **卫星**: 1 个（月球）
- **小行星**: 2,000 颗（火星-木星之间）
- **拉格朗日点**: 5 个（L1-L5）
- **星座**: 12 个（黄道十二宫）+ 28 个（二十八宿）

---

## 🎯 快速查找

### 我想了解...

#### 🌍 如何查看地球？
→ 阅读 [README.md](../README.md) 的"地球可视化"章节

#### 🪐 如何查看太阳系？
→ 阅读 [docs/SOLAR_SYSTEM_GUIDE.md](SOLAR_SYSTEM_GUIDE.md)

#### ⭐ 如何查看星座？
→ 阅读 [docs/ZODIAC_AND_LUNAR_MANSIONS_GUIDE.md](ZODIAC_AND_LUNAR_MANSIONS_GUIDE.md)

#### 🚀 如何发射航天器？
→ 阅读 [docs/SPACECRAFT_LAUNCHER_GUIDE.md](SPACECRAFT_LAUNCHER_GUIDE.md)

#### 🎮 如何玩 KSP 模式？
→ 阅读 [docs/QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)

#### ⚡ 如何优化性能？
→ 阅读 [docs/PERFORMANCE_OPTIMIZATION_GUIDE.md](PERFORMANCE_OPTIMIZATION_GUIDE.md)

#### 📚 如何学习航空航天知识？
→ 阅读 [docs/AEROSPACE_THEORY_KNOWLEDGE_BASE.md](AEROSPACE_THEORY_KNOWLEDGE_BASE.md)

#### 🔧 如何开发贡献？
→ 阅读 [README.md](../README.md) 的"贡献指南"章节

---

## 📝 文档维护

### 更新频率
- **主要文档**: 每个版本更新
- **技术指南**: 功能变更时更新
- **教育资料**: 定期补充新内容

### 贡献文档
欢迎提交 Pull Request 改进文档：
- 修正拼写错误
- 补充缺失说明
- 添加示例代码
- 翻译其他语言

### 文档规范
- 使用 Markdown 格式
- 包含目录导航
- 提供代码示例
- 添加截图说明（如需要）
- 保持中英文术语一致

---

## 🔗 外部资源

### 官方文档
- [Three.js 官方文档](https://threejs.org/docs/)
- [WebGL Fundamentals](https://webglfundamentals.org/)
- [MDN Web Docs](https://developer.mozilla.org/)

### 天文数据
- [NASA JPL Horizons](https://ssd.jpl.nasa.gov/horizons/)
- [SIMBAD 天文数据库](http://simbad.u-strasbg.fr/simbad/)
- [Stellarium 开源天文馆](https://stellarium.org/)

### 学习资源
- [Kerbal Space Program Wiki](https://wiki.kerbalspaceprogram.com/)
- [Spaceflight Simulator Community](https://www.reddit.com/r/SpaceflightSimulator/)

---

## 🙏 致谢

感谢所有为本文档系统做出贡献的开发者和作者！

---

**祝您探索愉快！🌌✨**
