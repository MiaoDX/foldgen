# PLAN — foldgen

## 阶段划分

- **Stage 0**（origami 站在跑期间，被动）：观望 Learn2Fold / OrigamiBench 代码 release，跟 Demaine / Tachi 团队动态。
- **Stage 1**（origami 站 v0 上线后，~6 周）：MVP demo。
- **Stage 2**（如果 Stage 1 反响好）：博客 + 投 workshop poster。

> 注：以上"阶段"是依赖关系而非强制时序。实现由 AI agent 完成，origami 与 foldgen 可同步推进；真正的硬依赖是 `fold-core` 要先能用，以及 origami 的传统 FOLD 库作为 foldgen 的 testbed。

### 命名澄清

- **Project stages**：Stage 0 / 1 / 2 是项目层面的战略阶段。Stage 0 是观察期，Stage 1 是当前要实现的 MVP，Stage 2 是 Stage 1 成功后的传播 / workshop 阶段。
- **Implementation milestones**：Stage 1 内部按 M0-M4 五个实现切片推进。当前讨论和文档收敛都聚焦 Stage 1；不要提前为 Stage 2 做重实现设计。
- **后续 stage**：Stage 1 的当前硬门槛是 repo-local technical gate。真实物理复现只作为最终发布 claim gate，不阻塞当前技术迭代；但 Stage 1 输出本身必须明确目标 executor profile，不能只给抽象 FOLD/SVG。

## Stage 1 Contract（MVP 执行边界）

Stage 1 先证明一件事：foldgen 能从一个小而公开的 FOLD testbed 出发，生成可验证、可展示、可被 executor 理解的折纸步骤。不要把 Stage 1 变成通用 origami 生成器、benchmark 复现工程，或需要外部人参与才能继续的流程。

- **公开 testbed 优先**：先在本 repo 放入可公开、可授权使用的 base form / target fixtures。`MiaoDX/microsites` 的 origami 资产可以作为灵感和手工迁移来源，但 Stage 1 的运行时不能依赖 private repo。
- **输入顺序**：Stage 1 以 reference image 为主输入。文本输入可以先映射到小型 curated target set，等图像 pipeline 跑通后再扩展。
- **目标图像来源**：Stage 1 的 reference / target raster images 可以优先用 Codex 内置 `$imagegen` skill 生成。对本项目而言，它可视为免费且质量足够高的图像生成能力；生成的项目资产必须保存到 repo，并记录 prompt / 用途元数据。
- **外部研究依赖**：Learn2Fold / OrigamiBench / OrigamiSpace / GamiBench 是 related work 和可选未来 backend，不是 Stage 1 blocker。若它们发布可复用代码，后续通过 adapter 接入，而不是让当前 MVP 等待外部 release。
- **强模型来源**：Stage 1 可以优先使用 Codex 当前会话里的 GPT 模型完成必要的强模型任务，例如目标拆解、候选 fold operation 提议、diagram 文案草稿、critic reasoning、prompt 设计和实验复盘。对本项目而言，这类 Codex-assisted work 可视为免费强模型能力。
- **模型调用顺序**：M0 / M1 不依赖外部付费 LLM API。先用 deterministic、mock proposal 或 Codex-assisted 离线提议跑通 FOLD fixtures、validation、crease SVG 与 diagram 输出合同；live provider adapter 在这些 deterministic gates 通过后再接入。
- **M1 最小有效输出**：parseable FOLD + deterministic crease pattern SVG + 能执行的 fold validation。3D preview 在 M1 可以是近似可视化，不能单独作为 flat-foldability 证明。
- **Executor-readable 输出合同**：Stage 1 的 diagram 不是一句自然语言说明，而是一个可执行步骤 schema：executor profile、pre-state、anchor/grip、fold direction、alignment target、crease/press、release、checks、failure modes、annotations。详见 `docs/contracts/stage-1-output-contract.md`。
- **Final embodiment validation gate**：任何公开声称"某个 physical executor 可以照着执行"的 demo case，必须有最终阶段记录。executor 可以是人手、机器人夹爪、工具夹具、动物爪/肢体或其他明确形态。Simulator 成功不等于 embodiment validated；这个 gate 不阻塞 Stage 1 技术迭代。

## v1 Scope（MVP）

- 一个 web demo（fold.miaodx.com 或 foldgen.app）：
  - 用户上传一张目标图片；文字输入先作为 curated target 的入口
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

### Q3：executor-readable diagram 怎么从 FOLD + fold sequence 生成？

这是 foldgen 区别于 Learn2Fold 的核心：

1. 把 fold sequence 拆成离散步骤（每步一个 valley/mountain fold）
2. 每步声明 executor profile（例如 `human-hand`、`two-finger-gripper`、`cat-paw-profile`），并记录该 executor 能用的 contact primitives
3. 每步从最佳视角渲染（pre-fold + 标注 fold line + arrow）
4. 生成结构化动作序列：setup、anchor/grip、fold direction、alignment target、crease/press、release、checks、failure modes
5. 用模板化自然语言渲染结构化步骤，但不能只保存一句话
6. 可选：用 origami 站的风格化 pipeline 把步骤图变成风格化版本

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
- **Test targets（10-15 个）**：优先使用本 repo 可公开发布的 target images。可从 origami 站模型中迁移 / 重建，也可用 `$imagegen` 生成目标图像；有 ground truth FOLD 时用于 sanity check。
- **创意测试（5-10 个）**：纯自然语言（"a fox", "a small mountain"）或 `$imagegen` 生成的 reference images —— 无 ground truth，Stage 1 靠技术 gate 和 inspection metadata；最终发布再做 embodiment validation。

## 与 origami 站的协同

- **origami → foldgen**：origami 站手写的 20 个 FOLD 文件 = foldgen 的训练 / 评测数据
- **origami → foldgen**：origami 站的渲染管线 = foldgen 的可视化基础
- **foldgen → origami**：foldgen 生成的合格新设计 → origami 站增加"AI 设计"分类
- **共享 fold-core**：foldgen 拥有（public 基础设施），origami 站消费不修改

## 实验成本估算

- LLM API：每次 iteration ~2-5 个调用，30 iter × $0.02 = $0.6 / 次 foldgen 调用
- 15 个 test target × 5 次重复 = 75 次 × $0.6 = **~$45 实验**
- CLIP 自托管，零成本
- Codex 会话内 GPT 用于开发期强模型任务时按项目内零边际成本处理，不计入 v1 付费 API 预算。
- Codex `$imagegen` 用于 target/demo raster assets 时按项目内零边际成本处理，不计入 v1 付费 API 预算。
- **总实验预算 < $100**

## Stage 1 里程碑

- M0: 建立公开 testbed：5 个 base form fixtures + 最少 3 个 target fixtures，且不依赖 private repo runtime。
- M1: fold-core 集成；用 deterministic / mock proposal 跑通最简单 case（一个 base form 加一道折），输出 parseable FOLD、crease SVG、validation、preview，以及符合 executor-readable schema 的一步 diagram。
- M2: 在 5 个 test targets 上跑通端到端 pipeline；每个 case 必须包含候选记录、critic/proposal history、artifact paths、claim_status 和 executor-readable diagram sequence。
- M3: web demo（用户上传图 / curated text → 输出 fold sequence + 3D 预览）；UI 必须展示 executor profile 和可跟做动作流，而不是只显示一步标题。
- M4: Stage 1 technical closeout：README、demo 和 pipeline 均标注为 simulator-valid / executor-readable / embodiment-untested；博客和发布材料只准备草稿，不要求真实外部 executor 参与。

## 成功标准

- **绝对**：展示 5 个 simulator-valid 且 executor-readable 的 demo case，输出 FOLD、crease pattern、preview、executor profile 和可跟做 diagram flow，且默认不需要真实外部 executor 参与。
- **相对**：博客 1 周内 1000+ 阅读，GitHub 100+ star，至少 1 个折纸圈 / CG 圈名人转发或评论。
- **失败止损**：6 周后仍无法稳定生成 simulator-valid demo case → 收尾整理 + 写"我们尝试了 foldgen 但…"复盘文，不继续投入。

## 不在 v1 范围

- 不训练 / fine-tune LLM（纯调 API + prompt engineering）
- 不做 RL（OrigamiSpace 已经做了）
- 不做硬件（laser cutter 等）
- 不写学术论文为主要产出

## Caveat（实施前需重新核查）

Learn2Fold（arXiv 2603.29585）和 OrigamiBench（arXiv 2603.13856）是 2026-03 工作，代码 / 复现状态可能还在变。真正启动 Stage 1 时需要重新调研一遍最新状态——如果它们已发布完整代码 + 强 demo，评估 foldgen 是否应重新定位为它们的下游应用（"基于 Learn2Fold + 教学输出层"）而非平行竞品。
