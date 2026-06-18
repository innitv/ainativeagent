import assert from "node:assert/strict";
import {
  loadAgentCapabilityRegistry,
  renderAgentCapabilityRegistry,
  validateAgentCapabilityRegistry,
} from "./agent-capability-registry";
import { agentInstructionFiles, agentNames } from "./agents.registry";
import { routeTools } from "./route.config";

const errors = validateAgentCapabilityRegistry();
assert.deepEqual(errors, []);

const records = loadAgentCapabilityRegistry();
assert.equal(records.length, Object.keys(agentInstructionFiles).length);

const orchestrator = records.find((record) => record.agent_name === agentNames.orchestrator);
assert.ok(orchestrator, "orchestrator capability record should exist");
assert.equal(orchestrator.role, "orchestrator");
assert.equal(orchestrator.enabled_as_tool, false);
assert.ok(orchestrator.owner_stage_ids.includes("00-intake"));

const prd = records.find((record) => record.agent_name === agentNames.prd);
assert.ok(prd, "prd capability record should exist");
assert.equal(prd.role, "specialist");
assert.equal(prd.enabled_as_tool, true);
assert.ok(prd.route_steps.includes("prd"));
assert.ok(prd.route_tools.includes(routeTools.prd.tool));
assert.ok(prd.required_inputs.includes("scenario_user_flows"));
assert.ok(prd.required_outputs.includes("prd"));

const notionPublisher = records.find((record) => record.agent_name === agentNames.notionPublisher);
assert.ok(notionPublisher, "notion publisher capability record should exist");
assert.equal(notionPublisher.writes_external, true);
assert.ok(notionPublisher.approval_actions.includes("notion_prd_export"));

const rendered = renderAgentCapabilityRegistry(records);
assert.ok(rendered.includes("# Agent Capability Registry"));
assert.ok(rendered.includes("`prd`"));
assert.ok(rendered.includes("`create_prd`"));

console.log("agent capability registry tests passed");
