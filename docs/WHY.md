# WHY — foldgen

## 一句话

foldgen 是 roboharness 范式的第二个 case study：给 AI agent 一个 FOLD-based 折纸仿真环境作为"物理 domain 自我验证"的试验场，但**输出目标是面向人类的可教学折纸 diagram**，不是 benchmark 分数。

## 为什么必须重新定位

2025 年初设想 foldgen 时，"LLM agent 在折纸仿真器里迭代设计"似乎是未被解决的新问题。**2025-11 到 2026-03 短短 4 个月出现 4 篇相关工作**：

| 论文 | 范式 |
|---|---|
| OrigamiSpace (arXiv 2511.18450) | 多任务评测，含 End-to-End CP Code Generation。结论："Gemini 2.5-pro 和 GPT-4o 最强但仍远低于人类" |
| GamiBench (arXiv 2512.22207) | 744 VQA 评测 MLLM 空间推理。"even leading models such as GPT-5 and Gemini-2.5-Pro struggle on single-step spatial understanding" |
| **Learn2Fold: Structured Origami Generation with World Model Planning** (arXiv 2603.29585, UCLA Chenfanfu Jiang lab) | 摘要原文："A large language model generates candidate folding programs from abstract text prompts, while a learned graph-structured world model serves as a differentiable surrogate simulator that predicts physical feasibility and failure modes before execution." |
| OrigamiBench (arXiv 2603.13856) | "closed-loop system. Each episode starts from a blank paper and a target origami" |

**结论**：原计划的 "agent reproduce known origami benchmark" 已经是红海。foldgen 必须重新定位，否则就是在已被多个团队占位的赛道上做第 5 个 benchmark。

## 重新定位

foldgen 不做 benchmark，做**生成式 demo + 可教学输出**：

> **输入**：自然语言（"像一只蹲着的猫"）或单张参考图
> **输出**：(1) 可打印的 crease pattern；(2) 人类可读的 step-by-step diagram（不是机器 token）；(3) 浏览器 3D 预览折叠动画

**与已有工作的差异**：

- Learn2Fold / OrigamiBench 评的是"能否准确复现 ground truth 几何"
- foldgen 评的是"普通人能否照着 foldgen 输出折出来"——**人因评测**
- 把折纸研究从"几何 / 推理"问题挪到"AI for Creative Tooling / HCI"问题
- 直接跟 origami 站（MiaoDX/microsites 的 sites/origami）形成端到端闭环：foldgen 生成 → 风格化 → 上线为"AI 设计"分类

## 目标受众

按优先级：

1. **CG / HCI 圈**（SIGGRAPH、CHI、UIST workshop）：关心"AI 生成可制造的物理对象"——折纸是低成本 testbed
2. **AI Creative Tools 社区**（NeurIPS Creative AI workshop、Hugging Face spaces）
3. **Origami 圈的"科学折纸"分支**（Demaine / Lang / Tachi 系——他们有 TreeMaker / Origamizer，foldgen 不竞争算法层，把它们当工具调用）
4. **roboharness 老读者**：把 foldgen 作为"agent + 物理 domain 验证"的第二个案例

## 与 roboharness 的关系

| 维度 | roboharness | foldgen |
|---|---|---|
| 命题 | 给 agent 一双眼睛验证机器人仿真 | 给 agent 一双眼睛验证折纸几何 |
| 物理 domain | 机器人 / 抓取 | 折纸 / 2D-to-3D 几何 |
| Loop 形式 | agent → policy → sim → vision feedback | agent → fold action → flat-foldability + 渲染 → critic |
| 输出受众 | 机器人 / RL 研究者 | CG / Creative AI 研究者 + 终端用户 |

两者构成个人研究主线"AI 在物理 domain 自我验证"的双案例，可以一起讲故事互相引流。

## 不做什么

- **不做新 benchmark 论文**（已有 4 个团队 race）
- **不做 SOTA 几何相似度刷榜**
- **不做从空白纸开始的复杂模型设计**（Lang TreeMaker 已经做了 30 年）
- **不试图取代 TreeMaker / Origamizer**——把它们当工具调用
- **不做 origami 物理仿真本身**（用 Ghassaei / Tachi / Rabbit Ear，做胶水层）
- **不做硬件**
- **不写学术论文作为主要产出**（arXiv preprint 是顺手 bonus，不是目标）

## Stage 1 已定 / 仍开放

1. **创意输入**：Stage 1 先 image-first。文本输入可以先映射到 curated target set，等图像 pipeline 跑通后再扩展。
2. **与 origami 站联动**：Stage 1 可以借鉴 / 迁移 origami 站资产，但运行时必须依赖本 repo 中可公开发布的 fixtures，不直接依赖 private repo。
3. **投 workshop 的优先级**：仍开放。当前倾向 arXiv + 强博客，若 demo 质量足够再投 SIGGRAPH Posters / NeurIPS Creative AI / CHI 或 UIST workshop。
4. **agent 用什么 LLM**：Stage 1 开发期先用 Codex 会话内 GPT 做必要强模型任务，并保持 provider adapter 边界。线上 demo 若需要 live model calls，再显式接入 provider；付费调用必须遵守 v1 实验预算。
