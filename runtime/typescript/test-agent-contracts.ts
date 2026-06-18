import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { critiqueAgentOutput } from "./agent-contracts/agent-output-critic";
import {
  buildDelegationPacket,
  validateDelegationPacket,
} from "./agent-contracts/delegation-packet";
import { workflowStages } from "./workflow-stages";
import type { WorkflowStageExecutorContext } from "./executors/types";

interface TestCase {
  name: string;
  run: () => Promise<void> | void;
}

let tempDir = "";

const testCases: TestCase[] = [
  {
    name: "delegation packet validates complete stage handoff",
    run: async () => {
      await writeFile(join(tempDir, "recursive-brief.md"), "# Brief\n", "utf8");
      await writeFile(join(tempDir, "research-summary.md"), "# Research\n", "utf8");
      await writeFile(join(tempDir, "scenario-user-flows.md"), "# Flows\n", "utf8");
      const context = buildContext("02-prd");
      const packet = buildDelegationPacket(context, ["recursive-brief.md", "research-summary.md", "scenario-user-flows.md"], "approved");
      const result = validateDelegationPacket(packet, tempDir);
      assert(result.valid, `packet should be valid: ${result.errors.join("; ")}`);
      assert(packet.expected_envelope.required_outputs.includes("outputs.prd"), "packet should require outputs.prd");
      assert(packet.allowed_outputs.includes("prd.md"), "packet should allow prd.md");
    },
  },
  {
    name: "delegation packet rejects missing core fields",
    run: () => {
      const context = buildContext("02-prd");
      const packet = buildDelegationPacket(context, ["recursive-brief.md"], "approved");
      packet.objective = "";
      packet.quality_gate = [];
      const result = validateDelegationPacket(packet);
      assert(!result.valid, "packet should be invalid");
      assert(result.errors.includes("objective is required"), "packet should report missing objective");
      assert(result.errors.includes("quality_gate must be a non-empty array"), "packet should report missing quality gate");
    },
  },
  {
    name: "agent output critic passes complete envelope",
    run: () => {
      const result = critiqueAgentOutput({
        expectedAgent: "prd",
        requiredArtifacts: ["prd"],
        requiredInputs: ["recursive-brief.md", "research-summary.md"],
        envelope: {
          agent_name: "prd",
          status: "success",
          summary: "PRD готов.",
          inputs_used: ["recursive-brief.md", "research-summary.md"],
          outputs: {
            prd: "# Product Requirements\n\n## Problem\n\nПроверяемый текст артефакта.",
          },
          assumptions: [],
          risks: [],
          open_questions: [],
          recommended_next_step: "Передать на IA.",
        },
      });
      assert(result.passed, `critic should pass: ${result.blockers.join("; ")}`);
      assert(result.warnings.length === 0, "critic should not warn on complete output");
    },
  },
  {
    name: "agent output critic blocks wrong agent and missing artifact",
    run: () => {
      const result = critiqueAgentOutput({
        expectedAgent: "prd",
        requiredArtifacts: ["prd"],
        requiredInputs: ["recursive-brief.md"],
        envelope: {
          agent_name: "research",
          status: "success",
          summary: "Ошибочный output.",
          inputs_used: [],
          outputs: {
            notes: "not an artifact",
          },
          assumptions: [],
          risks: [],
          open_questions: [],
          recommended_next_step: "Дальше.",
        },
      });
      assert(!result.passed, "critic should block invalid output");
      assert(result.blockers.some((blocker) => blocker.includes("agent_name")), "critic should block wrong agent");
      assert(result.blockers.some((blocker) => blocker.includes("missing required artifact")), "critic should block missing artifact");
      assert(result.blockers.some((blocker) => blocker.includes("inputs_used is empty")), "critic should block empty inputs");
    },
  },
];

async function runTests(): Promise<void> {
  console.log("=== Запуск тестов agent contracts ===");
  let passed = 0;
  let failed = 0;

  tempDir = await mkdtemp(join(tmpdir(), "product-agent-studio-agent-contracts-"));

  try {
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

function buildContext(stageId: string): WorkflowStageExecutorContext {
  const stage = workflowStages.find((item) => item.id === stageId);
  if (!stage) {
    throw new Error(`Unknown stage ${stageId}`);
  }

  return {
    outputDir: tempDir,
    goal: "Тестовый продукт",
    stage,
    profile: "standard",
    executionMode: "agentic",
  };
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

