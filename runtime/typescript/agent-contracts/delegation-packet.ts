import { existsSync } from "node:fs";
import { join } from "node:path";
import { agentNames } from "../agents.registry";
import { routeTools } from "../route.config";
import { artifactFiles, getRequiredArtifactsForStage } from "../workflow-stages";
import type { WorkflowStageExecutorContext } from "../executors/types";

export interface DelegationPacket {
  stage_id: string;
  owner_agent: string;
  objective: string;
  required_inputs: string[];
  allowed_outputs: string[];
  forbidden_actions: string[];
  approval_state: string;
  quality_gate: string[];
  surface_output_contract: string;
  context_budget: string;
  expected_envelope: {
    status: "success|partial|blocked";
    required_outputs: string[];
  };
  unresolved_risks: string[];
  handoff_consumer: string;
}

export interface DelegationPacketValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const forbiddenActions = [
  "external write without exact approval",
  "delete or move user data without explicit target",
  "write to Notion/Figma/deploy/git without approval when not directly requested",
  "change downstream product meaning without approved deviation",
];

export function buildDelegationPacket(
  context: WorkflowStageExecutorContext,
  inputs: readonly string[],
  approvalState: string,
): DelegationPacket {
  const requiredArtifacts = getRequiredArtifactsForStage(context.stage, context.profile);
  const allowedOutputs = requiredArtifacts
    .map((artifact) => artifactFiles[artifact])
    .filter(Boolean);

  return {
    stage_id: context.stage.id,
    owner_agent: context.stage.owner,
    objective: `Создать ${context.stage.title} для цели: ${context.goal}`,
    required_inputs: [...inputs],
    allowed_outputs: allowedOutputs,
    forbidden_actions: forbiddenActions,
    approval_state: approvalState,
    quality_gate: buildQualityGate(context, requiredArtifacts),
    surface_output_contract: context.stage.id >= "04-design"
      ? "required when stage creates a user-facing surface; use surface_output in agent output"
      : "not_applicable unless the stage creates a user-facing surface",
    context_budget: context.stage.id >= "08-frontend"
      ? "compressed handoff-bundle.md plus required input files only"
      : "required input files plus stage-specific context",
    expected_envelope: {
      status: "success|partial|blocked",
      required_outputs: requiredArtifacts.map((artifact) => `outputs.${artifact}`),
    },
    unresolved_risks: [],
    handoff_consumer: inferHandoffConsumer(context.stage.id),
  };
}

export function validateDelegationPacket(
  packet: DelegationPacket,
  outputDir?: string,
): DelegationPacketValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  requireNonEmpty(packet.stage_id, "stage_id", errors);
  requireNonEmpty(packet.owner_agent, "owner_agent", errors);
  requireNonEmpty(packet.objective, "objective", errors);
  requireArray(packet.required_inputs, "required_inputs", errors);
  requireArray(packet.allowed_outputs, "allowed_outputs", errors);
  requireArray(packet.forbidden_actions, "forbidden_actions", errors);
  requireNonEmpty(packet.approval_state, "approval_state", errors);
  requireArray(packet.quality_gate, "quality_gate", errors);
  requireNonEmpty(packet.surface_output_contract, "surface_output_contract", errors);
  requireNonEmpty(packet.context_budget, "context_budget", errors);
  requireArray(packet.expected_envelope.required_outputs, "expected_envelope.required_outputs", errors);
  requireNonEmpty(packet.expected_envelope.status, "expected_envelope.status", errors);
  requireArrayField(packet.unresolved_risks, "unresolved_risks", errors);
  requireNonEmpty(packet.handoff_consumer, "handoff_consumer", errors);

  if (packet.required_inputs.includes("goal") || packet.required_inputs.includes("context")) {
    warnings.push("delegation packet contains abstract inputs; prefer concrete artifact files");
  }

  if (!packet.allowed_outputs.every((output) => output.endsWith(".md") || output.endsWith(".json"))) {
    warnings.push("allowed_outputs should be concrete artifact filenames");
  }

  if (!packet.expected_envelope.required_outputs.every((output) => output.startsWith("outputs."))) {
    errors.push("expected_envelope.required_outputs must use outputs.<artifact_name> keys");
  }

  if (outputDir) {
    for (const input of packet.required_inputs) {
      if (isConcreteLocalInput(input) && !existsSync(join(outputDir, input))) {
        warnings.push(`required input is missing in output directory: ${input}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function renderDelegationPacket(packet: DelegationPacket): string {
  return JSON.stringify(packet, null, 2);
}

function buildQualityGate(context: WorkflowStageExecutorContext, requiredArtifacts: readonly string[]): string[] {
  const sections = requiredArtifacts.flatMap((artifact) => context.stage.requiredSectionsByArtifact[artifact] ?? []);
  return [
    "return a structured agent-output-yaml or agent-output-json envelope",
    "include complete Markdown content for every required artifact in outputs",
    "list real inputs_used, not aspirational inputs",
    "return partial or blocked when required inputs, approval, evidence, or verification are missing",
    ...sections.map((section) => `required section: ${section}`),
  ];
}

function inferHandoffConsumer(stageId: string): string {
  const routeEntries = Object.entries(routeTools);
  const current = routeEntries.find(([, route]) => route.stageId === stageId);
  if (!current) {
    return "orchestrator";
  }

  const currentOutputs = new Set<string>(current[1].outputs ?? []);
  const consumer = routeEntries.find(([, route]) => {
    if (route.stageId === stageId) {
      return false;
    }
    return route.inputs.some((input) => currentOutputs.has(input));
  });

  return consumer?.[1].agent ?? agentNames.orchestrator;
}

function requireNonEmpty(value: string, field: string, errors: string[]): void {
  if (!value.trim()) {
    errors.push(`${field} is required`);
  }
}

function requireArray(value: readonly unknown[], field: string, errors: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${field} must be a non-empty array`);
  }
}

function requireArrayField(value: readonly unknown[], field: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array`);
  }
}

function isConcreteLocalInput(input: string): boolean {
  return /\.(md|json|yaml|yml|txt)$/i.test(input);
}
