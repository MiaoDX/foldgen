# PLAN — foldgen

## 阶段划分

- **Stage 0**（origami 站在跑期间，被动）：观望 Learn2Fold / OrigamiBench 代码 release，跟 Demaine / Tachi 团队动态。
- **Stage 1**（origami 站 v0 上线后，~6 周）：MVP demo。
- **Stage 2**（如果 Stage 1 反响好）：博客 + 投 workshop poster。

> 注：以上"阶段"是依赖关系而非强制时序。实现由 AI agent 完成，origami 与 foldgen 可同步推进；真正的硬依赖是 `fold-core` 要先能用，以及 origami 的传统 FOLD 库作为 foldgen 的 testbed。

## v1 Scope（MVP）

- 一个 web demo（fold.miaodx.com 或 foldgen.app）：
  - 用户上传一张目标图片或输入文字
  - 输出：FOLD 文件 + crease pattern SVG + 3D 折叠动画 + 步骤分解
- **不追求"任何输入都能折"**——先打通 5 个 base form（bird / frog / waterbomb / kite / fish）的局部变形
- 公开 GitHub repo + README + 一篇博客文章

## 研究问题（按风险 / 价值排序）

### Q1（必做）：Base form + local deformation 这条简化路径是否真的 work？

不从空白纸开始（TreeMaker 的事）。**从 5 个经典 base form 出发，让 agent 提出"加一个 squash fold"、"加一个 petal fold"等局部操作**，让仿真器验证 flat-foldability，渲染出几何，让 vision critic 评估"像不像目标"。

**关键问题**：局部探索的搜索空间是否小到让 LLM agent 在 10-50 个 iteration 内找到合理解？

### Q2：Vision critic 用什么？

候选：

- 商业 MLLM（GPT-5 vision / Gemini-3-Pro / Claude）直接判断——简单但可能太宽泛
- CLIP similarity score 渲染图 vs 目标图——更鲁棒
- 组合：CLIP 粗筛，MLLM 细评

OrigamiSpace 的 finding（"最强模型与人类仍有显著差距"）说明**纯 MLLM 评 origami 不可靠**——所以组合更稳。

### Q3：人类可读 diagram 怎么从 FOLD + fold sequence 生成？

这是 foldgen 区别于 Learn2Fold 的核心：

1. 把 fold sequence 拆成离散步骤（每步一个 valley/mountain fold）
2. 每步从最佳视角渲染（pre-fold + 标注 fold line + arrow）
3. 用模板化的自然语言生成步骤描述（"Fold the top-right corner to the center along the dashed line"）
4. 可选：用 origami 站的风格化 pipeline 把步骤图变成风格化版本

## 技术栈

```
foldgen/
├── packages/
│   ├── fold-core/         # owned here (public infra); microsites/origami consumes it
│   └── foldgen-agent/
│       ├── agent.ts       # LLM loop (OpenAI/Anthropic/Google API)
│       ├── critic.ts      # CLIP + optional MLLM evaluator
│       ├── search.ts      # iterative deepening / beam search
│       └── diagram.ts     # FOLD sequence → printable PDF/SVG
├── benchmarks/
│   ├── base-forms/        # 5 个 base form 的 FOLD ground truth
│   └── targets/           # 测试目标图：猫/鸟/鱼/花...
├── demo/                  # Next.js / Astro web demo
└── docs/ (WHY.md, PLAN.md, AGENTS.md)
```

### Agent Loop 伪代码

```python
def foldgen(target_image_or_text):
    base_form = select_base_form(target_image_or_text)
    current_fold = load_fold(f"base-forms/{base_form}.fold")
    history = []

    for iteration in range(MAX_ITER=30):
        rendered = render(current_fold)
        score = critic.evaluate(rendered, target)
        history.append((current_fold, score))

        if score > THRESHOLD: break

        next_ops = agent.propose_next_folds(
            current=current_fold, rendered=rendered,
            target=target, history=history
        )
        candidates = [apply(current_fold, op) for op in next_ops]
        valid = [c for c in candidates if flat_foldable(c)]
        current_fold = pick_best(valid, critic)

    sequence = extract_sequence(history)
    diagram = generate_diagram(sequence)
    return {fold: current_fold, sequence, diagram}
```

## Testbed Dataset（工程 testbed，非论文 benchmark）

- **Base forms（5 个）**：bird base, frog base, waterbomb base, kite base, fish base
- **Test targets（10-15 个）**：从 origami 站的 20 个传统模型里选（有 ground truth FOLD 做 sanity check）
- **创意测试（5-10 个）**：纯自然语言（"a fox", "a small mountain"）—— 无 ground truth，靠人因评测

## 与 origami 站的协同

- **origami → foldgen**：origami 站手写的 20 个 FOLD 文件 = foldgen 的训练 / 评测数据
- **origami → foldgen**：origami 站的渲染管线 = foldgen 的可视化基础
- **foldgen → origami**：foldgen 生成的合格新设计 → origami 站增加"AI 设计"分类
- **共享 fold-core**：foldgen 拥有（public 基础设施），origami 站消费不修改

## 实验成本估算

- LLM API：每次 iteration ~2-5 个调用，30 iter × $0.02 = $0.6 / 次 foldgen 调用
- 15 个 test target × 5 次重复 = 75 次 × $0.6 = **~$45 实验**
- CLIP 自托管，零成本
- **总实验预算 < $100**

## Stage 1 里程碑

- M1: fold-core 集成；agent loop 跑通最简单 case（一个 base form 加一道折）
- M2: 在 5 个 test targets 上跑通端到端 pipeline
- M3: web demo（用户上传图 → 输出 fold sequence + 3D 预览）
- M4: 博客文章 + GitHub README + 发布（HN / 知乎 / Twitter）

## 成功标准

- **绝对**：展示 5 个 demo case，让普通人照着 foldgen 输出 diagram 折出来（"普通人 reproducibility test"）。
- **相对**：博客 1 周内 1000+ 阅读，GitHub 100+ star，至少 1 个折纸圈 / CG 圈名人转发或评论。
- **失败止损**：6 周后 demo case 折不出来 → 收尾整理 + 写"我们尝试了 foldgen 但…"复盘文，不继续投入。

## 不在 v1 范围

- 不训练 / fine-tune LLM（纯调 API + prompt engineering）
- 不做 RL（OrigamiSpace 已经做了）
- 不做硬件（laser cutter 等）
- 不写学术论文为主要产出

## Caveat（实施前需重新核查）

Learn2Fold（arXiv 2603.29585）和 OrigamiBench（arXiv 2603.13856）是 2026-03 工作，代码 / 复现状态可能还在变。真正启动 Stage 1 时需要重新调研一遍最新状态——如果它们已发布完整代码 + 强 demo，评估 foldgen 是否应重新定位为它们的下游应用（"基于 Learn2Fold + 教学输出层"）而非平行竞品。
