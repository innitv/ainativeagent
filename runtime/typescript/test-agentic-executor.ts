import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordApproval } from "./approval-gate";
import { executeWorkflowStage } from "./workflow-stage-executors";
import { workflowStages } from "./workflow-stages";

interface TestCase {
  name: string;
  run: () => Promise<void>;
}

let tempDir = "";
const originalOpenAiKey = process.env.OPENAI_API_KEY;
const originalNodeEnv = process.env.NODE_ENV;
const originalMockOutputPath = process.env.AGENTIC_TEST_SPECIALIST_OUTPUT_PATH;

const testCases: TestCase[] = [
  {
    name: "enabled agentic stage blocks without OPENAI_API_KEY and updates artifacts",
    run: async () => {
      delete process.env.OPENAI_API_KEY;
      const stage = getStage("02-prd");
      const result = await executeWorkflowStage({
        outputDir: tempDir,
        goal: "Тестовый продукт",
        stage,
        profile: "standard",
        executionMode: "agentic",
      });

      assert(result.status === "blocked", "02-prd should be blocked without OPENAI_API_KEY");
      assert(existsSync(join(tempDir, "prd.md")), "prd.md should be created");

      const prd = await readFile(join(tempDir, "prd.md"), "utf8");
      assert(prd.includes("## Problem"), "blocked prd.md should include required section ## Problem");
      assert(prd.includes("OPENAI_API_KEY"), "blocked prd.md should mention missing OPENAI_API_KEY");

      const handoff = await readFile(join(tempDir, "handoff-bundle.md"), "utf8");
      assert(handoff.includes("Execution mode: `agentic`"), "handoff should record agentic mode");
      assert(handoff.includes("Stage status: `blocked`"), "handoff should record blocked status");

      const ledger = await readFile(join(tempDir, "stage-gate-ledger.md"), "utf8");
      assert(ledger.includes("agentic executor 02-prd"), "ledger should record agentic executor result");
      assert(ledger.includes("blocked"), "ledger should record blocked result");
    },
  },
  {
    name: "approved enabled agentic stage writes structured specialist output",
    run: async () => {
      process.env.NODE_ENV = "test";
      process.env.OPENAI_API_KEY = "test-key";
      const mockOutputPath = join(tempDir, "mock-prd-agent-output.md");
      process.env.AGENTIC_TEST_SPECIALIST_OUTPUT_PATH = mockOutputPath;
      await writeFile(mockOutputPath, renderMockPrdAgentOutput(), "utf8");
      await recordApproval(tempDir, {
        action: "model_provider_call",
        approved: true,
        approved_by: "test",
        target: "openai_agents_sdk:prd:02-prd",
        notes: "Тестовое подтверждение для mock specialist output.",
      });

      const stage = getStage("02-prd");
      const result = await executeWorkflowStage({
        outputDir: tempDir,
        goal: "Тестовый продукт",
        stage,
        profile: "standard",
        executionMode: "agentic",
      });

      assert(result.status === "completed", "02-prd should complete with approved structured mock output");
      assert(result.warnings.length === 0, "structured happy path should not create warnings");

      const prd = await readFile(join(tempDir, "prd.md"), "utf8");
      assert(prd.includes("## Problem"), "prd.md should include specialist problem section");
      assert(prd.includes("## MoSCoW"), "prd.md should include MoSCoW section");
      assert(prd.includes("## Inputs Used"), "prd.md should keep explicit Inputs Used section");
      assert(!prd.includes("Agentic specialist output не включил"), "runtime should not add fallback section notes");

      const ledger = await readFile(join(tempDir, "stage-gate-ledger.md"), "utf8");
      assert(ledger.includes("agentic executor 02-prd"), "ledger should record completed agentic executor result");
      assert(ledger.includes("completed"), "ledger should record completed result");
    },
  },
  {
    name: "approved IA agentic stage writes structured specialist output",
    run: async () => {
      process.env.NODE_ENV = "test";
      process.env.OPENAI_API_KEY = "test-key";
      const mockOutputPath = join(tempDir, "mock-ia-agent-output.md");
      process.env.AGENTIC_TEST_SPECIALIST_OUTPUT_PATH = mockOutputPath;
      await writeFile(mockOutputPath, renderMockIaAgentOutput(), "utf8");
      await writeFile(join(tempDir, "prd.md"), renderMinimalPrdArtifact(), "utf8");
      await writeFile(join(tempDir, "research-summary.md"), renderMinimalResearchArtifact(), "utf8");
      await recordApproval(tempDir, {
        action: "model_provider_call",
        approved: true,
        approved_by: "test",
        target: "openai_agents_sdk:ia:03-ia",
        notes: "Тестовое подтверждение для mock IA specialist output.",
      });

      const stage = getStage("03-ia");
      const result = await executeWorkflowStage({
        outputDir: tempDir,
        goal: "Тестовый продукт",
        stage,
        profile: "standard",
        executionMode: "agentic",
      });

      assert(result.status === "completed", "03-ia should complete with approved structured mock output");
      assert(result.warnings.length === 0, "IA structured happy path should not create warnings");

      const iaBrief = await readFile(join(tempDir, "ia-brief.md"), "utf8");
      assert(iaBrief.includes("## Primary Screen"), "ia-brief.md should include Primary Screen section");
      assert(iaBrief.includes("## Primary User Flow"), "ia-brief.md should include Primary User Flow section");
      assert(iaBrief.includes("## Inputs Used"), "ia-brief.md should keep explicit Inputs Used section");
      assert(!iaBrief.includes("Agentic specialist output не включил"), "runtime should not add fallback section notes");
    },
  },
  {
    name: "approved agentic stage becomes partial when required artifact output is missing",
    run: async () => {
      process.env.NODE_ENV = "test";
      process.env.OPENAI_API_KEY = "test-key";
      const mockOutputPath = join(tempDir, "mock-missing-artifact-agent-output.md");
      process.env.AGENTIC_TEST_SPECIALIST_OUTPUT_PATH = mockOutputPath;
      await writeFile(mockOutputPath, renderMockMissingArtifactAgentOutput(), "utf8");
      await recordApproval(tempDir, {
        action: "model_provider_call",
        approved: true,
        approved_by: "test",
        target: "openai_agents_sdk:prd:02-prd",
        notes: "Тестовое подтверждение для mock specialist output.",
      });

      const stage = getStage("02-prd");
      const result = await executeWorkflowStage({
        outputDir: tempDir,
        goal: "Тестовый продукт",
        stage,
        profile: "standard",
        executionMode: "agentic",
      });

      assert(result.status === "partial", "02-prd should be partial when outputs.prd is missing");
      assert(result.warnings.some((warning) => warning.includes("did not include outputs.prd")), "warnings should mention missing required artifact output");
    },
  },
  {
    name: "approved agentic stage validates structured output against schema",
    run: async () => {
      process.env.NODE_ENV = "test";
      process.env.OPENAI_API_KEY = "test-key";
      const mockOutputPath = join(tempDir, "mock-invalid-schema-agent-output.md");
      process.env.AGENTIC_TEST_SPECIALIST_OUTPUT_PATH = mockOutputPath;
      await writeFile(mockOutputPath, renderMockInvalidSchemaAgentOutput(), "utf8");
      await recordApproval(tempDir, {
        action: "model_provider_call",
        approved: true,
        approved_by: "test",
        target: "openai_agents_sdk:prd:02-prd",
        notes: "Тестовое подтверждение для invalid schema mock output.",
      });

      const stage = getStage("02-prd");
      const result = await executeWorkflowStage({
        outputDir: tempDir,
        goal: "Тестовый продукт",
        stage,
        profile: "standard",
        executionMode: "agentic",
      });

      assert(result.status === "partial", "02-prd should be partial when structured output violates schema");
      assert(result.warnings.some((warning) => warning.includes("root.extra_field is not allowed")), "warnings should include schema validation error");
    },
  },
  {
    name: "disabled rollout stage blocks before model provider path",
    run: async () => {
      delete process.env.OPENAI_API_KEY;
      const stage = getStage("04-design");
      const result = await executeWorkflowStage({
        outputDir: tempDir,
        goal: "Тестовый продукт",
        stage,
        profile: "standard",
        executionMode: "agentic",
      });

      assert(result.status === "blocked", "04-design should be blocked by rollout gate");
      assert(existsSync(join(tempDir, "design-brief.md")), "design-brief.md should be created");

      const design = await readFile(join(tempDir, "design-brief.md"), "utf8");
      assert(design.includes("not enabled in the current staged rollout"), "blocked artifact should explain rollout gate");
    },
  },
];

async function runTests(): Promise<void> {
  console.log("=== Запуск тестов agentic executor ===");
  let passed = 0;
  let failed = 0;

  tempDir = await mkdtemp(join(tmpdir(), "product-agent-studio-agentic-executor-"));

  try {
    await writeBaseRunFiles(tempDir);

    for (const testCase of testCases) {
      try {
        await testCase.run();
        console.log(`PASS: ${testCase.name}`);
        passed++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`FAIL: ${testCase.name}: ${message}`);
        failed++;
      }
    }
  } finally {
    restoreOpenAiKey();
    await rm(tempDir, { recursive: true, force: true });
  }

  console.log("\n=== Итоги тестирования ===");
  console.log(`Всего проверок: ${passed + failed}`);
  console.log(`Успешно: ${passed}`);
  console.log(`Ошибок: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

async function writeBaseRunFiles(outputDir: string): Promise<void> {
  await writeFile(join(outputDir, "handoff-bundle.md"), [
    "# Handoff Bundle",
    "",
    "## Goal",
    "",
    "Тестовый продукт",
    "",
    "## Completed Artifacts",
    "",
    "- `recursive-brief.md`",
    "",
    "## Next Required Artifact",
    "",
    "`prd.md`",
    "",
  ].join("\n"), "utf8");

  await writeFile(join(outputDir, "stage-gate-ledger.md"), [
    "# Stage Gate Ledger",
    "",
    "## Run",
    "",
    "- Test run",
    "",
    "## Validation Runs",
    "",
    "| Time | Command | Result | Notes |",
    "|---|---|---|---|",
    "",
  ].join("\n"), "utf8");
}

function getStage(stageId: string) {
  const stage = workflowStages.find((item) => item.id === stageId);
  if (!stage) {
    throw new Error(`Unknown stage ${stageId}`);
  }

  return stage;
}

function restoreOpenAiKey(): void {
  if (typeof originalOpenAiKey === "undefined") {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = originalOpenAiKey;
  }

  if (typeof originalNodeEnv === "undefined") {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }

  if (typeof originalMockOutputPath === "undefined") {
    delete process.env.AGENTIC_TEST_SPECIALIST_OUTPUT_PATH;
  } else {
    process.env.AGENTIC_TEST_SPECIALIST_OUTPUT_PATH = originalMockOutputPath;
  }
}

function renderMockPrdAgentOutput(): string {
  const prdContent = [
    "# Product Requirements",
    "",
    "## Inputs Used",
    "",
    "- `recursive-brief.md`",
    "- `research-summary.md`",
    "- `scenario-user-flows.md`",
    "",
    "## Problem",
    "",
    "Команде нужен проверяемый PRD для тестового продукта.",
    "",
    "## Goals",
    "",
    "- Согласовать цель продукта.",
    "- Зафиксировать проверяемые требования.",
    "",
    "## Non-Goals",
    "",
    "- Не описывать production roadmap.",
    "",
    "## Requirements",
    "",
    "- Система должна сохранять PRD как локальный artifact.",
    "",
    "## MoSCoW",
    "",
    "- Must: PRD содержит обязательные секции.",
    "- Should: PRD фиксирует inputs used.",
    "",
    "## Acceptance Criteria",
    "",
    "- Runtime возвращает `completed` без warnings.",
    "",
    "## Analytics",
    "",
    "- Проверить факт создания `prd.md`.",
    "",
  ].join("\n");

  return [
    "```agent-output-yaml",
    "agent_name: prd",
    "status: success",
    "summary: Тестовый PRD сформирован по контракту.",
    "inputs_used:",
    "  - recursive-brief.md",
    "  - research-summary.md",
    "  - scenario-user-flows.md",
    "outputs:",
    "  prd: |",
    ...prdContent.split("\n").map((line) => `    ${line}`),
    "assumptions: []",
    "risks: []",
    "open_questions: []",
    "recommended_next_step: Передать PRD на IA stage.",
    "```",
    "",
  ].join("\n");
}

function renderMockIaAgentOutput(): string {
  const iaContent = [
    "# Information Architecture",
    "",
    "## Inputs Used",
    "",
    "- `prd.md`",
    "- `research-summary.md`",
    "- `scenario-user-flows.md`",
    "",
    "## Primary Screen",
    "",
    "Главный экран показывает ценность продукта, ключевой CTA и доверительные доказательства.",
    "",
    "## Primary Action",
    "",
    "Пользователь нажимает основной CTA и переходит к заявке.",
    "",
    "## Sitemap",
    "",
    "- Главная",
    "- Форма заявки",
    "- FAQ",
    "",
    "## Primary User Flow",
    "",
    "1. Пользователь читает первый экран.",
    "2. Пользователь сверяет требования и доказательства.",
    "3. Пользователь отправляет заявку.",
    "",
  ].join("\n");

  return [
    "```agent-output-yaml",
    "agent_name: ia",
    "status: success",
    "summary: Тестовая IA сформирована по контракту.",
    "inputs_used:",
    "  - prd.md",
    "  - research-summary.md",
    "  - scenario-user-flows.md",
    "outputs:",
    "  ia_brief: |",
    ...iaContent.split("\n").map((line) => `    ${line}`),
    "assumptions: []",
    "risks: []",
    "open_questions: []",
    "recommended_next_step: Передать IA на design stage.",
    "```",
    "",
  ].join("\n");
}

function renderMockMissingArtifactAgentOutput(): string {
  return [
    "```agent-output-yaml",
    "agent_name: prd",
    "status: success",
    "summary: Агент ошибочно вернул success без обязательного Markdown artifact.",
    "inputs_used:",
    "  - recursive-brief.md",
    "  - research-summary.md",
    "outputs:",
    "  notes: Это не является prd artifact.",
    "assumptions: []",
    "risks: []",
    "open_questions: []",
    "recommended_next_step: Передать PRD на IA stage.",
    "```",
    "",
  ].join("\n");
}

function renderMockInvalidSchemaAgentOutput(): string {
  return [
    "```agent-output-yaml",
    "agent_name: prd",
    "status: success",
    "summary: Агент вернул лишнее поле, запрещённое JSON Schema.",
    "inputs_used:",
    "  - recursive-brief.md",
    "  - research-summary.md",
    "outputs:",
    "  prd: '# Product Requirements'",
    "assumptions: []",
    "risks: []",
    "open_questions: []",
    "recommended_next_step: Передать PRD на IA stage.",
    "extra_field: should-fail-schema",
    "```",
    "",
  ].join("\n");
}

function renderMinimalPrdArtifact(): string {
  return [
    "# Product Requirements",
    "",
    "## Inputs Used",
    "",
    "- `recursive-brief.md`",
    "- `research-summary.md`",
    "",
    "## Problem",
    "",
    "Тестовая проблема.",
    "",
    "## Goals",
    "",
    "- Тестовая цель.",
    "",
    "## Non-Goals",
    "",
    "- Тестовое ограничение.",
    "",
    "## Requirements",
    "",
    "- Тестовое требование.",
    "",
    "## MoSCoW",
    "",
    "- Must: тест.",
    "",
    "## Acceptance Criteria",
    "",
    "- Критерий выполнен.",
    "",
    "## Analytics",
    "",
    "- Событие теста.",
    "",
  ].join("\n");
}

function renderMinimalResearchArtifact(): string {
  return [
    "# Research Summary",
    "",
    "## Research Questions",
    "",
    "- Что проверить?",
    "",
    "## Audience",
    "",
    "Тестовая аудитория.",
    "",
    "## Jobs To Be Done",
    "",
    "- Тестовый JTBD.",
    "",
    "## Proto Personas",
    "",
    "- Тестовая персона.",
    "",
    "## Synthetic Interviews",
    "",
    "- Тестовый вывод.",
    "",
    "## Research Validation Plan",
    "",
    "- Проверить позже.",
    "",
    "## Findings",
    "",
    "- Тестовый факт.",
    "",
    "## Sources",
    "",
    "- Локальный тестовый источник.",
    "",
  ].join("\n");
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

runTests().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
