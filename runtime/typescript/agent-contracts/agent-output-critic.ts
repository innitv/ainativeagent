import {
  hasArtifactOutput,
  type AgenticOutputEnvelope,
} from "../agent-output/agent-output-contract";
import { artifactFiles } from "../workflow-stages";

export interface AgentOutputCriticInput {
  envelope?: AgenticOutputEnvelope;
  expectedAgent: string;
  requiredArtifacts: readonly string[];
  requiredInputs: readonly string[];
}

export interface AgentOutputCriticResult {
  passed: boolean;
  warnings: string[];
  blockers: string[];
}

export function critiqueAgentOutput(input: AgentOutputCriticInput): AgentOutputCriticResult {
  const warnings: string[] = [];
  const blockers: string[] = [];

  if (!input.envelope) {
    blockers.push("agent output critic: structured envelope is missing");
    return { passed: false, warnings, blockers };
  }

  const envelope = input.envelope;

  if (envelope.agent_name !== input.expectedAgent) {
    blockers.push(`agent output critic: agent_name '${envelope.agent_name}' does not match expected '${input.expectedAgent}'`);
  }

  if (!envelope.summary.trim()) {
    warnings.push("agent output critic: summary is empty");
  }

  if (!envelope.inputs_used.length) {
    blockers.push("agent output critic: inputs_used is empty");
  }

  const missingInputs = input.requiredInputs
    .filter((inputName) => /\.(md|json|yaml|yml|txt)$/i.test(inputName))
    .filter((inputName) => !envelope.inputs_used.includes(inputName));
  if (missingInputs.length) {
    warnings.push(`agent output critic: inputs_used does not mention required input(s): ${missingInputs.join(", ")}`);
  }

  for (const artifactName of input.requiredArtifacts) {
    const fileName = artifactFiles[artifactName];
    if (!hasArtifactOutput(envelope, artifactName, fileName)) {
      blockers.push(`agent output critic: missing required artifact output outputs.${artifactName} or outputs.${fileName}`);
      continue;
    }

    const output = envelope.outputs[artifactName] ?? envelope.outputs[fileName];
    if (typeof output === "string" && output.trim().length < 40) {
      warnings.push(`agent output critic: ${artifactName} output looks too short to be a complete artifact`);
    }
  }

  if (envelope.status === "success") {
    if (envelope.risks.length || envelope.open_questions.length) {
      warnings.push("agent output critic: success includes risks/open_questions; verify this is not partial work");
    }
  }

  if (envelope.status === "partial" && !envelope.risks.length && !envelope.open_questions.length) {
    blockers.push("agent output critic: partial status requires risks or open_questions");
  }

  if (envelope.status === "blocked" && (!envelope.risks.length || !envelope.recommended_next_step.trim())) {
    blockers.push("agent output critic: blocked status requires risks and recommended_next_step");
  }

  return {
    passed: blockers.length === 0,
    warnings,
    blockers,
  };
}

