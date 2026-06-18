import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadAgentMetadata } from "./agent-metadata";
import { agentInstructionFiles, agentNames } from "./agents.registry";
import { routeTools } from "./route.config";
import { workflowStages } from "./workflow-stages";

export type AgentRegistryKey = keyof typeof agentInstructionFiles;

export interface AgentCapabilityRecord {
  registry_key: AgentRegistryKey;
  agent_name: string;
  role: "orchestrator" | "specialist";
  description: string;
  instruction_file: string;
  instruction_exists: boolean;
  owner_stage_ids: string[];
  route_steps: string[];
  route_tools: string[];
  required_inputs: string[];
  required_outputs: string[];
  approval_actions: string[];
  skills: string[];
  contract_schema: string;
  writes_external: boolean;
  enabled_as_tool: boolean;
}

export const agentCapabilityDescriptions: Record<AgentRegistryKey, string> = {
  orchestrator: "Владеет маршрутизацией, Agent Trigger Matrix, gates, delegation packets, ledger/handoff и финальным ответом.",
  research: "Собирает source-backed research pack, пользовательские сценарии, конкурентов, персон, интервью и SWOT.",
  prd: "Формирует PRD: problem, goals, scope, requirements, MoSCoW, acceptance criteria и analytics.",
  notionPublisher: "Готовит Notion-ready export и выполняет Notion publication только при exact approval.",
  ia: "Проектирует information architecture, sitemap, primary screen/action и основной пользовательский flow.",
  design: "Создает design brief, UX/UI структуру, visual evidence, Figma surface mode и foundation; для wireframes и макетов одинаково требует tokens/styles, компоненты, variants/states, slots/properties, responsive/accessibility и reference-analysis при reference profile.",
  designGenerator: "Преобразует IA, design direction и copy в screen/Figma specification; для wireframes и макетов одинаково требует component inventory, component sets/variants, slots/properties, Auto Layout intent, states и handoff verification.",
  prototype: "Описывает transition map и инструкции для clickable prototype.",
  copywriting: "Готовит copy deck: hero, CTA, секции, FAQ, SEO и claims to validate.",
  frontend: "Реализует или описывает frontend delivery с учетом PRD, IA, screens, copy и prototype.",
  testBench: "Создает test bench: funnel analytics, проверки главного сценария и refresh после frontend.",
  qaReview: "Проверяет PRD fit, UX, visual/reference gates, accessibility, responsive, secrets и readiness.",
  release: "Формирует release notes: scope, changed files, validation, decision matrix и rollback notes.",
};

export function loadAgentCapabilityRegistry(root = process.cwd()): AgentCapabilityRecord[] {
  return (Object.entries(agentInstructionFiles) as Array<[AgentRegistryKey, string]>)
    .map(([key, instructionFile]) => {
      const agentName = agentNames[key];
      const metadata = loadAgentMetadata(join(root, instructionFile));
      const agentRoutes = Object.entries(routeTools)
        .filter(([, route]) => route.agent === agentName);
      const stageIds = workflowStages
        .filter((stage) => stage.owner === agentName)
        .map((stage) => stage.id);

      return {
        registry_key: key,
        agent_name: agentName,
        role: key === "orchestrator" ? "orchestrator" : "specialist",
        description: agentCapabilityDescriptions[key],
        instruction_file: instructionFile,
        instruction_exists: existsSync(join(root, instructionFile)),
        owner_stage_ids: metadata?.owner_stage_ids ?? stageIds,
        route_steps: agentRoutes.map(([routeStep]) => routeStep),
        route_tools: agentRoutes.map(([, route]) => route.tool),
        required_inputs: metadata?.required_inputs ?? unique(agentRoutes.flatMap(([, route]) => route.inputs)),
        required_outputs: metadata?.required_outputs ?? unique(agentRoutes.flatMap(([, route]) => route.outputs)),
        approval_actions: metadata?.approval_actions ?? [],
        skills: metadata?.skills ?? [],
        contract_schema: metadata?.contract_schema ?? "agent-pack/schemas/agent-output.schema.json",
        writes_external: Boolean(metadata?.approval_actions.length || agentRoutes.some(([, route]) => "requiresApproval" in route && route.requiresApproval)),
        enabled_as_tool: key !== "orchestrator" && agentRoutes.length > 0,
      };
    });
}

export function validateAgentCapabilityRegistry(root = process.cwd()): string[] {
  const errors: string[] = [];
  const records = loadAgentCapabilityRegistry(root);
  const recordsByName = new Map(records.map((record) => [record.agent_name, record]));

  for (const [key, name] of Object.entries(agentNames) as Array<[AgentRegistryKey, string]>) {
    const record = recordsByName.get(name);
    if (!record) {
      errors.push(`missing capability record for agent '${name}'`);
      continue;
    }

    if (record.registry_key !== key) {
      errors.push(`${name}: registry_key '${record.registry_key}' must be '${key}'`);
    }

    if (!record.description.trim()) {
      errors.push(`${name}: description is required`);
    }

    if (!record.instruction_exists) {
      errors.push(`${name}: instruction file is missing: ${record.instruction_file}`);
    }

    if (record.contract_schema !== "agent-pack/schemas/agent-output.schema.json") {
      errors.push(`${name}: contract_schema must be agent-pack/schemas/agent-output.schema.json`);
    }
  }

  for (const [routeStep, route] of Object.entries(routeTools)) {
    const record = recordsByName.get(route.agent);
    if (!record) {
      errors.push(`${routeStep}: route agent '${route.agent}' is missing from capability registry`);
      continue;
    }

    if (!record.route_steps.includes(routeStep)) {
      errors.push(`${record.agent_name}: capability registry missing route step '${routeStep}'`);
    }

    if (!record.route_tools.includes(route.tool)) {
      errors.push(`${record.agent_name}: capability registry missing route tool '${route.tool}'`);
    }

    for (const output of route.outputs) {
      if (!record.required_outputs.includes(output)) {
        errors.push(`${record.agent_name}: capability registry missing route output '${output}'`);
      }
    }
  }

  const orchestrator = records.find((record) => record.role === "orchestrator");
  if (!orchestrator || orchestrator.enabled_as_tool) {
    errors.push("orchestrator must exist and must not be exposed as a specialist tool");
  }

  return errors;
}

export function renderAgentCapabilityRegistry(records = loadAgentCapabilityRegistry()): string {
  const header = "| Agent | Role | Stages | Route tools | Outputs | Approvals | Skills |";
  const separator = "|---|---|---|---|---|---|---|";
  const rows = records.map((record) => [
    `\`${record.agent_name}\``,
    record.role,
    renderList(record.owner_stage_ids),
    renderList(record.route_tools),
    renderList(record.required_outputs),
    renderList(record.approval_actions),
    renderList(record.skills),
  ].join(" | "));

  return [
    "# Agent Capability Registry",
    "",
    header,
    separator,
    ...rows.map((row) => `| ${row} |`),
    "",
  ].join("\n");
}

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

function renderList(items: readonly string[]): string {
  return items.length ? items.map((item) => `\`${item}\``).join("<br>") : "none";
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = validateAgentCapabilityRegistry();
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(renderAgentCapabilityRegistry());
  }
}
