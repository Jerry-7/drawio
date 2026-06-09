const path = require('path');
const { generateDrawioFile } = require('./generator');

function writeMessage(message)
{
  process.stdout.write(JSON.stringify(message) + '\n');
}

function writeError(id, code, message)
{
  writeMessage({
    jsonrpc: '2.0',
    id,
    error: { code, message }
  });
}

function writeResult(id, result)
{
  writeMessage({
    jsonrpc: '2.0',
    id,
    result
  });
}

function listTools()
{
  return [
    {
      name: 'generate_layered_flow_drawio',
      description: 'Generate a layered draw.io flow diagram from agent-produced call-chain data or semantic card data. Supports method/class/data/logic/decision/external/note cards and real draw.io layers.',
      inputSchema: {
        type: 'object',
        required: ['title', 'outputPath'],
        properties: {
          title: { type: 'string' },
          pageName: { type: 'string' },
          direction: {
            type: 'string',
            enum: ['horizontal', 'vertical']
          },
          outputPath: { type: 'string' },
          layers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                description: { type: 'string' },
                order: { type: 'number' }
              }
            }
          },
          nodes: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'type', 'layer', 'title'],
              properties: {
                id: { type: 'string' },
                type: {
                  type: 'string',
                  enum: [
                    'method_card',
                    'class_card',
                    'data_card',
                    'logic_card',
                    'decision_card',
                    'external_card',
                    'note_card'
                  ]
                },
                layer: { type: 'string' },
                title: { type: 'string' },
                subtitle: { type: 'string' },
                description: { type: 'string' },
                responsibility: { type: 'string' },
                condition: { type: 'string' },
                source: { type: 'string' },
                target: { type: 'string' },
                order: { type: 'number' },
                x: { type: 'number' },
                y: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' },
                inputs: {
                  type: 'array',
                  items: {
                    oneOf: [
                      { type: 'string' },
                      {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          meaning: { type: 'string' },
                          description: { type: 'string' }
                        }
                      }
                    ]
                  }
                },
                outputs: {
                  type: 'array',
                  items: {
                    oneOf: [
                      { type: 'string' },
                      {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          meaning: { type: 'string' },
                          description: { type: 'string' }
                        }
                      }
                    ]
                  }
                },
                fields: {
                  type: 'array',
                  items: {
                    oneOf: [
                      { type: 'string' },
                      {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          meaning: { type: 'string' },
                          description: { type: 'string' }
                        }
                      }
                    ]
                  }
                },
                methods: {
                  type: 'array',
                  items: {
                    oneOf: [
                      { type: 'string' },
                      {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          description: { type: 'string' }
                        }
                      }
                    ]
                  }
                },
                logic: {
                  type: 'array',
                  items: {
                    oneOf: [
                      { type: 'string' },
                      {
                        type: 'object',
                        properties: {
                          text: { type: 'string' }
                        }
                      }
                    ]
                  }
                },
                notes: {
                  type: 'array',
                  items: {
                    oneOf: [
                      { type: 'string' },
                      {
                        type: 'object',
                        properties: {
                          text: { type: 'string' }
                        }
                      }
                    ]
                  }
                },
                branches: {
                  type: 'array',
                  items: {
                    oneOf: [
                      { type: 'string' },
                      {
                        type: 'object',
                        properties: {
                          label: { type: 'string' },
                          text: { type: 'string' }
                        }
                      }
                    ]
                  }
                }
              }
            }
          },
          edges: {
            type: 'array',
            items: {
              type: 'object',
              required: ['from', 'to'],
              properties: {
                id: { type: 'string' },
                from: { type: 'string' },
                to: { type: 'string' },
                label: { type: 'string' },
                layer: { type: 'string' },
                kind: {
                  type: 'string',
                  enum: ['call', 'data_flow', 'return', 'dependency', 'contains']
                }
              }
            }
          },
          chains: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['label', 'steps'],
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                description: { type: 'string' },
                steps: {
                  type: 'array',
                  minItems: 1,
                  items: {
                    oneOf: [
                      { type: 'string' },
                      {
                        type: 'object',
                        required: ['label'],
                        properties: {
                          id: { type: 'string' },
                          label: { type: 'string' },
                          subtitle: { type: 'string' },
                          file: { type: 'string' }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    }
  ];
}

function handleToolCall(id, params)
{
  const name = params && params.name;
  const args = params && params.arguments;

  if (name !== 'generate_layered_flow_drawio')
  {
    writeError(id, -32602, 'Unknown tool: ' + name);
    return;
  }

  if (args == null || typeof args !== 'object')
  {
    writeError(id, -32602, 'Tool arguments must be an object.');
    return;
  }

  try
  {
    const result = generateDrawioFile(args, args.outputPath);
    writeResult(id, {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            outputPath: result.outputPath,
            pageName: args.pageName || 'Code Flow',
            chainCount: Array.isArray(args.chains) ? args.chains.length : 0,
            layerCount: Array.isArray(args.layers) ? args.layers.length :
              (Array.isArray(args.chains) ? args.chains.length : 0),
            nodeCount: Array.isArray(args.nodes) ? args.nodes.length : 0,
            mode: Array.isArray(args.nodes) ? 'semantic_cards' : 'chains'
          }, null, 2)
        }
      ]
    });
  }
  catch (error)
  {
    writeError(id, -32000, error.message);
  }
}

function handleMessage(message)
{
  if (message == null || typeof message !== 'object')
  {
    return;
  }

  if (message.method === 'initialize')
  {
    writeResult(message.id, {
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: 'drawio-flow-layers',
        version: '0.1.0'
      },
      capabilities: {
        tools: {}
      }
    });
    return;
  }

  if (message.method === 'tools/list')
  {
    writeResult(message.id, { tools: listTools() });
    return;
  }

  if (message.method === 'tools/call')
  {
    handleToolCall(message.id, message.params || {});
    return;
  }

  if (message.method === 'notifications/initialized')
  {
    return;
  }

  writeError(message.id, -32601, 'Method not found: ' + message.method);
}

let buffer = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk =>
{
  buffer += chunk;

  while (true)
  {
    const newlineIndex = buffer.indexOf('\n');

    if (newlineIndex < 0)
    {
      break;
    }

    const line = buffer.slice(0, newlineIndex).trim();
    buffer = buffer.slice(newlineIndex + 1);

    if (line.length === 0)
    {
      continue;
    }

    try
    {
      handleMessage(JSON.parse(line));
    }
    catch (error)
    {
      writeMessage({
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error: ' + error.message
        }
      });
    }
  }
});

process.stdin.on('end', () =>
{
  process.exit(0);
});
