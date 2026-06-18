import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { Agent, run } from "@openai/agents";
import { agentCapabilityDescriptions } from "./agent-capability-registry";
import { agentInstructionFiles, agentNames } from "./agents.registry";
import { parseAgentInstructionDocument } from "./agent-metadata";
import { getRoutePlanForProfile, routeTools, type RouteProfile } from "./route.config";

export type AgentRegistryKey = keyof typeof agentInstructionFiles;

export interface AgentsSdkLayer {
  orchestrator: Agent;
  specialists: Partial<Record<AgentRegistryKey, Agent>>;
  routeToolNames: string[];
}

export interface StandaloneRunResult {
  finalOutput: unknown;
}

export async function loadAgentInstructions(): Promise<Record<AgentRegistryKey, string>> {
  const entries = await Promise.all(
    Object.entries(agentInstructionFiles).map(async ([key, file]) => {
      const content = parseAgentInstructionDocument(await readFile(file, "utf8")).body;
      return [key, content] as const;
    }),
  );

  return Object.fromEntries(entries) as Record<AgentRegistryKey, string>;
}

export async function createAgentsSdkLayer(profile: RouteProfile = "standard"): Promise<AgentsSdkLayer> {
  const instructions = await loadAgentInstructions();
  const specialists = createSpecialistAgents(instructions);
  const orchestrator = createOrchestratorAgent(instructions.orchestrator, specialists, profile);

  return {
    orchestrator,
    specialists,
    routeToolNames: orchestrator.tools.map((tool) => tool.name),
  };
}

export function createSpecialistAgents(
  instructions: Record<AgentRegistryKey, string>,
): Partial<Record<AgentRegistryKey, Agent>> {
  const specialists: Partial<Record<AgentRegistryKey, Agent>> = {};

  for (const [key, instruction] of Object.entries(instructions) as [AgentRegistryKey, string][]) {
    if (key === "orchestrator") {
      continue;
    }

    specialists[key] = new Agent({
      name: agentNames[key],
      instructions: instruction,
      handoffDescription: agentCapabilityDescriptions[key],
    });
  }

  return specialists;
}

export function createOrchestratorAgent(
  instructions: string,
  specialists: Partial<Record<AgentRegistryKey, Agent>>,
  profile: RouteProfile = "standard",
): Agent {
  const routeToolsAsAgentTools = getRoutePlanForProfile(profile).flatMap((step) => {
    const route = routeTools[step];

    if (route.agent === agentNames.orchestrator) {
      return [];
    }

    const specialistKey = findAgentRegistryKey(route.agent);
    const specialist = specialists[specialistKey];

    if (!specialist) {
      throw new Error(`Missing specialist agent for route step '${step}'.`);
    }

    const referenceOutputs = profile === "reference" && "referenceOutputs" in route && Array.isArray(route.referenceOutputs)
      ? route.referenceOutputs
      : [];
    const outputs = [...route.outputs, ...referenceOutputs];

    return [specialist.asTool({
      toolName: route.tool,
      toolDescription: `${agentCapabilityDescriptions[specialistKey]} Inputs: ${route.inputs.join(", ")}. Outputs: ${outputs.join(", ")}.`,
    })];
  });

  return new Agent({
    name: agentNames.orchestrator,
    instructions,
    handoffDescription: "Owns final synthesis and controls the product landing workflow.",
    tools: routeToolsAsAgentTools,
  });
}

export async function runStandaloneAgentsSdkWorkflow(goal: string): Promise<StandaloneRunResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Standalone Agents SDK mode requires OPENAI_API_KEY. Use Codex agent pack mode when no API key is available.");
  }

  const { orchestrator } = await createAgentsSdkLayer(detectRouteProfile(goal));
  const result = await run(orchestrator, goal);

  return { finalOutput: result.finalOutput };
}

function findAgentRegistryKey(agentName: string): AgentRegistryKey {
  const found = Object.entries(agentNames).find(([, value]) => value === agentName)?.[0];

  if (!found || !(found in agentInstructionFiles)) {
    throw new Error(`No agent instruction file registered for '${agentName}'.`);
  }

  return found as AgentRegistryKey;
}

async function inspectLayer(): Promise<void> {
  const missingInstructionFiles = Object.values(agentInstructionFiles).filter((file) => !existsSync(file));
  if (missingInstructionFiles.length) {
    throw new Error(`Missing agent instruction files: ${missingInstructionFiles.join(", ")}`);
  }

  const profile = parseInspectProfile();
  const layer = await createAgentsSdkLayer(profile);
  console.log(`Profile: ${profile}`);
  console.log(`Orchestrator: ${layer.orchestrator.name}`);
  console.log(`Specialists: ${Object.keys(layer.specialists).length}`);
  console.log(`Route tools: ${layer.routeToolNames.join(", ")}`);
}

function detectRouteProfile(goal: string): RouteProfile {
  return /https?:\/\/|visual reference|reference url|как этот сайт|референс/i.test(goal)
    ? "reference"
    : "standard";
}

function parseInspectProfile(): RouteProfile {
  const profileIndex = process.argv.indexOf("--profile");
  const profile = profileIndex >= 0 ? process.argv[profileIndex + 1] : process.env.WORKFLOW_PROFILE;

  if (profile === "reference" || profile === "standard") {
    return profile;
  }

  return "standard";
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  inspectLayer().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
