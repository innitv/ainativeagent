import { existsSync } from "node:fs";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Agent, run } from "@openai/agents";
import { critiqueAgentOutput } from "../agent-contracts/agent-output-critic";
import {
  buildDelegationPacket,
  renderDelegationPacket,
  validateDelegationPacket,
} from "../agent-contracts/delegation-packet";
import { ensureAgenticArtifactSections } from "../agent-output/artifact-normalizer";
import {
  hasArtifactOutput,
  parseAgenticOutputEnvelope,
  resolveArtifactContent,
} from "../agent-output/agent-output-contract";
import { agentInstructionFiles, agentNames } from "../agents.registry";
import { createSpecialistAgents, loadAgentInstructions, type AgentRegistryKey } from "../agents.sdk";
import { formatModelProviderApprovalTarget } from "../agentic-approval-targets";
import { formatEnabledAgenticStages, isAgenticStageEnabled } from "../agentic-rollout";
import { requireApproval } from "../approval-gate";
import { routeTools } from "../route.config";
import { agentOutputStatusToStageStatus } from "../status-resolver";
import { artifactFiles, getRequiredArtifactsForStage } from "../workflow-stages";
import { nowIso, type WorkflowStageResult, type WorkflowStageStatus } from "../workflow-state";
import { formatLedgerCell, stageResult } from "./executor-common";
import type { WorkflowStageExecutorContext } from "./types";

export async function executeAgenticStage(context: WorkflowStageExecutorContext): Promise<WorkflowStageResult> {
  const requiredArtifacts = getRequiredArtifactsForStage(context.stage, context.profile);
  const files = requiredArtifacts.map((artifact) => artifactFiles[artifact]).filter(Boolean);
  const inputs = inferAgenticInputs(context.stage.owner);
  const hasApiKey = Boolean(process.env.OPENAI_API_KEY);

  if (!isAgenticStageEnabled(context.stage.id)) {
    const warning = [
      `Agentic execution for ${context.stage.id} is not enabled in the current staged rollout.`,
      `Enabled stages: ${formatEnabledAgenticStages()}.`,
    ].join(" ");
    await writeBlockedAgenticArtifacts(context, requiredArtifacts, inputs, warning);
    return finalizeAgenticStage(context, "blocked", files, inputs, [warning]);
  }

  if (!hasApiKey) {
    const warning = "Agentic executor requires OPENAI_API_KEY for real specialist execution.";
    await writeBlockedAgenticArtifacts(context, requiredArtifacts, inputs, warning);
    return finalizeAgenticStage(context, "blocked", files, inputs, [warning]);
  }

  const modelApprovalTarget = formatModelProviderApprovalTarget(context.stage);
  const modelApproval = await requireApproval({
    outputDir: context.outputDir,
    action: "model_provider_call",
    stageId: context.stage.id,
    target: modelApprovalTarget,
    reason: "Agentic specialist execution sends stage inputs to the configured model provider",
  });
  if (!modelApproval.approved) {
    await writeBlockedAgenticArtifacts(context, requiredArtifacts, inputs, modelApproval.message);
    return finalizeAgenticStage(context, "blocked", files, inputs, [modelApproval.message]);
  }

  const specialistKey = findSpecialistKey(context.stage.owner);
  if (!specialistKey) {
    const warning = `No specialist agent is registered for stage owner '${context.stage.owner}'.`;
    await writeBlockedAgenticArtifacts(context, requiredArtifacts, inputs, warning);
    return finalizeAgenticStage(context, "blocked", files, inputs, [warning]);
  }

  const instructions = await loadAgentInstructions();
  const specialists = createSpecialistAgents(instructions);
  const specialist = specialists[specialistKey];
  if (!specialist) {
    const warning = `Specialist '${specialistKey}' could not be created.`;
    await writeBlockedAgenticArtifacts(context, requiredArtifacts, inputs, warning);
    return finalizeAgenticStage(context, "blocked", files, inputs, [warning]);
  }

  const delegationPacket = buildDelegationPacket(context, inputs, "approved:model_provider_call");
  const delegationValidation = validateDelegationPacket(delegationPacket, context.outputDir);
  if (!delegationValidation.valid) {
    const warning = `Delegation packet invalid: ${delegationValidation.errors.join("; ")}`;
    await writeBlockedAgenticArtifacts(context, requiredArtifacts, inputs, warning);
    return finalizeAgenticStage(context, "blocked", files, inputs, [warning, ...delegationValidation.warnings]);
  }

  const prompt = await buildSpecialistPrompt(context, requiredArtifacts, inputs, delegationPacket, delegationValidation.warnings);
  const finalOutput = await runSpecialistAndExtractOutput(specialist, prompt, context.stage.id);

  if (!finalOutput?.trim()) {
    const warning = `Specialist '${specialistKey}' returned an empty output.`;
    await writeBlockedAgenticArtifacts(context, requiredArtifacts, inputs, warning);
    return finalizeAgenticStage(context, "blocked", files, inputs, [warning]);
  }

  const parsedOutput = parseAgenticOutputEnvelope(finalOutput);
  const warnings: string[] = [...parsedOutput.warnings];
  const critic = critiqueAgentOutput({
    envelope: parsedOutput.envelope,
    expectedAgent: context.stage.owner,
    requiredArtifacts,
    requiredInputs: inputs,
  });
  warnings.push(...critic.warnings, ...critic.blockers);
  const contractStatus = parsedOutput.envelope
    ? agentOutputStatusToStageStatus(parsedOutput.envelope.status)
    : "partial";

  for (const artifactName of requiredArtifacts) {
    const file = artifactFiles[artifactName];
    const sections = context.stage.requiredSectionsByArtifact[artifactName] ?? [];
    if (parsedOutput.envelope && !hasArtifactOutput(parsedOutput.envelope, artifactName, file)) {
      warnings.push(`${file}: agent output contract did not include outputs.${artifactName} or outputs.${file}`);
    }
    const modelOutput = resolveArtifactContent(finalOutput, parsedOutput.envelope, artifactName, file);
    const normalized = ensureAgenticArtifactSections({
      title: context.stage.title,
      inputs: parsedOutput.envelope?.inputs_used?.length ? parsedOutput.envelope.inputs_used : inputs,
      sections,
      modelOutput,
    });
    warnings.push(...normalized.warnings.map((warning) => `${file}: ${warning}`));
    await writeFile(join(context.outputDir, file), normalized.content, "utf8");
  }

  const status: WorkflowStageStatus = critic.blockers.length
    ? "partial"
    : contractStatus === "completed" && warnings.length ? "partial" : contractStatus;

  return finalizeAgenticStage(
    context,
    status,
    files,
    parsedOutput.envelope?.inputs_used?.length ? parsedOutput.envelope.inputs_used : inputs,
    warnings,
  );
}

async function runSpecialistAndExtractOutput(specialist: Agent, prompt: string, stageId: string): Promise<string> {
  const testOutputDir = process.env.AGENTIC_TEST_SPECIALIST_OUTPUT_DIR;
  if (process.env.NODE_ENV === "test" && testOutputDir) {
    return readFile(join(testOutputDir, `${stageId}.md`), "utf8");
  }

  const testOutputPath = process.env.AGENTIC_TEST_SPECIALIST_OUTPUT_PATH;
  if (process.env.NODE_ENV === "test" && testOutputPath) {
    return readFile(testOutputPath, "utf8");
  }

  const result = await run(specialist, prompt);
  return typeof result.finalOutput === "string"
    ? result.finalOutput
    : JSON.stringify(result.finalOutput, null, 2);
}

async function finalizeAgenticStage(
  context: WorkflowStageExecutorContext,
  status: WorkflowStageStatus,
  files: string[],
  inputs: string[],
  warnings: string[],
): Promise<WorkflowStageResult> {
  await appendAgenticStageProgress(context, status, files, inputs, warnings);

  return stageResult(
    context.stage.id,
    context.stage.title,
    status,
    files,
    inputs,
    warnings,
  );
}

async function writeBlockedAgenticArtifacts(
  context: WorkflowStageExecutorContext,
  requiredArtifacts: readonly string[],
  inputs: string[],
  warning: string,
): Promise<void> {
  for (const artifactName of requiredArtifacts) {
    const file = artifactFiles[artifactName];
    if (!file) {
      continue;
    }

    const sections = context.stage.requiredSectionsByArtifact[artifactName] ?? [];
    const content = renderBlockedAgenticArtifact({
      title: context.stage.title,
      stageId: context.stage.id,
      owner: context.stage.owner,
      file,
      inputs,
      warning,
      sections,
    });
    await writeFile(join(context.outputDir, file), content, "utf8");
  }
}

function renderBlockedAgenticArtifact(options: {
  title: string;
  stageId: string;
  owner: string;
  file: string;
  inputs: string[];
  warning: string;
  sections: readonly string[];
}): string {
  const requiredSections = options.sections.length ? options.sections : ["## Inputs Used", "## Status"];
  return [
    `# ${options.title}`,
    "",
    "## Status",
    "",
    "blocked",
    "",
    "## Inputs Used",
    "",
    ...options.inputs.map((input) => `- \`${input}\``),
    "",
    "## Agentic Execution",
    "",
    `- Stage: ${options.stageId}`,
    `- Owner: ${options.owner}`,
    `- Output artifact: ${options.file}`,
    `- Blocker: ${options.warning}`,
    "",
    ...requiredSections
      .filter((section) => !["## Status", "## Inputs Used"].includes(section))
      .flatMap((section) => [section, "", "Заблокировано до включения specialist LLM execution для этой стадии.", ""]),
    "## Recommended Next Step",
    "",
    "Запусти workflow в режиме `local` или настрой agentic specialist executor с подтверждённым model provider.",
    "",
  ].join("\n");
}

async function buildSpecialistPrompt(
  context: WorkflowStageExecutorContext,
  requiredArtifacts: readonly string[],
  inputs: string[],
  delegationPacket = buildDelegationPacket(context, inputs, "approved:model_provider_call"),
  delegationWarnings: readonly string[] = [],
): Promise<string> {
  const packetWarnings = delegationWarnings.map((warning) => `Delegation packet warning: ${warning}`);
  const inputBlocks = await Promise.all(inputs.map(async (input) => {
    const path = join(context.outputDir, input);
    if (!existsSync(path)) {
      return `## ${input}\n\nMissing in output directory.`;
    }

    const content = await readFile(path, "utf8");
    return `## ${input}\n\n${content}`;
  }));

  const requiredFiles = requiredArtifacts.map((artifact) => artifactFiles[artifact]).join(", ");
  const requiredSections = requiredArtifacts.flatMap((artifact) => context.stage.requiredSectionsByArtifact[artifact] ?? []);

  return [
    `Ты исполняешь workflow stage ${context.stage.id}: ${context.stage.title}.`,
    `Owner: ${context.stage.owner}.`,
    `Execution mode: ${context.executionMode}.`,
    "",
    "# Delegation Packet",
    "",
    "```json",
    renderDelegationPacket(delegationPacket),
    "```",
    "",
    packetWarnings.length
      ? ["# Delegation Packet Validation", "", ...packetWarnings.map((warning) => `- ${warning}`), ""].join("\n")
      : "",
    "Верни результат по agent output contract. Предпочтительный формат: fenced block `agent-output-yaml` или `agent-output-json`.",
    "Внутри `outputs` положи Markdown текущего артефакта по artifact name или file name.",
    `Required output file(s): ${requiredFiles}.`,
    "Обязательные секции:",
    ...requiredSections.map((section) => `- ${section}`),
    "",
    "Пиши поясняющий текст артефакта на русском языке, если file conventions не требуют английских идентификаторов.",
    "Сохрани assumptions, risks, open questions и inputs used.",
    "",
    "# Inputs",
    "",
    ...inputBlocks,
  ].join("\n");
}

async function appendStageLedgerNote(
  outputDir: string,
  stageId: string,
  result: WorkflowStageStatus,
  note: string,
): Promise<void> {
  const ledgerPath = join(outputDir, artifactFiles.stage_gate_ledger);
  if (!existsSync(ledgerPath)) {
    return;
  }

  await appendFile(
    ledgerPath,
    [
      "",
      `| ${nowIso()} | agentic executor ${stageId} | ${result} | ${formatLedgerCell(note)} |`,
    ].join("\n"),
    "utf8",
  );
}

async function appendAgenticStageProgress(
  context: WorkflowStageExecutorContext,
  status: WorkflowStageStatus,
  files: string[],
  inputs: string[],
  warnings: string[],
): Promise<void> {
  const handoffPath = join(context.outputDir, artifactFiles.handoff_bundle);
  if (existsSync(handoffPath)) {
    await appendFile(
      handoffPath,
      [
        "",
        `## ${context.stage.id} ${context.stage.title}`,
        "",
        "- Execution mode: `agentic`",
        `- Stage status: \`${status}\``,
        `- Completed artifacts: ${files.length ? files.map((file) => `\`${file}\``).join(", ") : "none"}`,
        `- Inputs used: ${inputs.length ? inputs.map((input) => `\`${input}\``).join(", ") : "none"}`,
        warnings.length
          ? `- Warnings/blockers: ${warnings.map(formatLedgerCell).join("; ")}`
          : "- Warnings/blockers: none",
        "- Next Required Artifact: see stage-gate-ledger.md",
      ].join("\n"),
      "utf8",
    );
  }

  await appendStageLedgerNote(
    context.outputDir,
    context.stage.id,
    status,
    [
      `Agentic execution wrote ${files.length ? files.map((file) => `\`${file}\``).join(", ") : "no artifacts"}`,
      warnings.length ? `Warnings/blockers: ${warnings.join("; ")}` : "No warnings",
    ].join(". "),
  );
}

function findSpecialistKey(owner: string): AgentRegistryKey | undefined {
  const found = Object.entries(agentNames).find(([, value]) => value === owner)?.[0];
  if (!found || found === "orchestrator" || !(found in agentInstructionFiles)) {
    return undefined;
  }

  return found as AgentRegistryKey;
}

function inferAgenticInputs(owner: string): string[] {
  const route = Object.values(routeTools).find((item) => item.agent === owner || item.agent === agentNames[owner as keyof typeof agentNames]);
  if (!route) {
    return [artifactFiles.handoff_bundle];
  }

  return route.inputs
    .map((input) => artifactFiles[input as keyof typeof artifactFiles] ?? input)
    .filter((input) => !["goal", "context", "constraints", "sources", "source_policy"].includes(input));
}
