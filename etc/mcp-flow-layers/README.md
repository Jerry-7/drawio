# Layered Flow MCP

This directory contains a minimal stdio MCP server for generating `.drawio`
files from agent-produced call-chain data or semantic code cards.

## Purpose

The intended split of work is:

- The AI agent reads project code and decides which methods, classes, data
  structures, and decision points matter.
- This MCP server turns those chains into a draw.io diagram that is easier for
  humans to read.
- Each logical chain or topic can be placed on its own draw.io layer so
  different reading paths remain easy to scan.

## Tool

The server exposes one tool:

- `generate_layered_flow_drawio`

It supports two input modes.

## Input Mode 1: Simple Chains

- `title`: diagram title
- `pageName`: draw.io page name
- `direction`: `horizontal` or `vertical`
- `outputPath`: where to write the `.drawio` file
- `chains`: array of call chains, each with `label` and `steps`

Each step may be a string or an object:

```json
{
  "label": "resolve symbol match",
  "subtitle": "query to function"
}
```

Use this mode when the agent only knows the major ordered call path.

## Input Mode 2: Semantic Cards

Use `layers`, `nodes`, and `edges` when the agent wants richer code-reading
cards.

Supported node types:

- `method_card`
- `class_card`
- `data_card`
- `logic_card`
- `decision_card`
- `external_card`
- `note_card`

Example `method_card`:

```json
{
  "id": "method_trace_feature_flow",
  "type": "method_card",
  "layer": "core_method",
  "title": "traceFeatureFlow(query, maxDepth)",
  "inputs": [
    { "name": "query", "meaning": "User-entered feature or method name" }
  ],
  "logic": [
    "Load the project index",
    "Resolve the entry symbol",
    "Traverse downstream calls"
  ],
  "outputs": [
    { "name": "trace", "meaning": "Ordered call-chain result" }
  ]
}
```

Example `class_card`:

```json
{
  "id": "class_trace_service",
  "type": "class_card",
  "layer": "entry_context",
  "title": "FeatureTraceService",
  "responsibility": "Coordinates project-index lookup and trace assembly.",
  "methods": [
    {
      "name": "traceFeatureFlow(query, maxDepth)",
      "description": "Main user-facing entrypoint"
    }
  ]
}
```

Example `decision_card`:

```json
{
  "id": "decision_symbol_found",
  "type": "decision_card",
  "layer": "core_method",
  "title": "Symbol resolved?",
  "condition": "Did query resolution produce a concrete method symbol?",
  "branches": [
    "Yes: continue",
    "No: return no-match result"
  ]
}
```

## Local check

```powershell
cd etc\mcp-flow-layers
node --check generator.js
node --check server.js
node --check cli.js
```

## Example

See [examples/java-call-chains.json](./examples/java-call-chains.json).
See [examples/semantic-cards.json](./examples/semantic-cards.json).

## Notes

This server does not analyze code on its own. That is deliberate: it keeps the
interface stable for any agent that can already inspect a repository and
produce structured chain data or semantic card data.
