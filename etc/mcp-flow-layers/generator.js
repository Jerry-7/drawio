const fs = require('fs');
const path = require('path');

const COLORS = [
  { stroke: '#4C78A8', fill: '#EAF2FB' },
  { stroke: '#F58518', fill: '#FFF2E5' },
  { stroke: '#54A24B', fill: '#EDF7ED' },
  { stroke: '#E45756', fill: '#FDECEC' },
  { stroke: '#72B7B2', fill: '#EAF7F6' },
  { stroke: '#B279A2', fill: '#F7EEF5' },
  { stroke: '#9D755D', fill: '#F5EFEC' },
  { stroke: '#BAB0AC', fill: '#F3F1F0' }
];

const TYPE_DEFAULTS = {
  method_card: { width: 320 },
  class_card: { width: 320 },
  data_card: { width: 280 },
  logic_card: { width: 260 },
  decision_card: { width: 220 },
  external_card: { width: 260 },
  note_card: { width: 240 }
};

function escapeXml(value)
{
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createId(prefix, counters)
{
  counters.value += 1;
  return prefix + counters.value;
}

function ensureArray(value)
{
  return Array.isArray(value) ? value : [];
}

function normalizeText(value, fallback)
{
  return (typeof value === 'string' && value.length > 0) ? value : fallback;
}

function normalizeKeyValueItems(items)
{
  return ensureArray(items).map((item, index) =>
  {
    if (typeof item === 'string')
    {
      return {
        name: item,
        meaning: ''
      };
    }

    if (item == null || typeof item !== 'object')
    {
      throw new Error('Expected a key/value item object or string.');
    }

    return {
      name: normalizeText(item.name, 'Item ' + (index + 1)),
      meaning: normalizeText(item.meaning, item.description || '')
    };
  });
}

function normalizeBullets(items)
{
  return ensureArray(items).map((item, index) =>
  {
    if (typeof item === 'string')
    {
      return item;
    }

    if (item == null || typeof item !== 'object')
    {
      throw new Error('Expected a bullet string or object.');
    }

    return normalizeText(item.text, 'Point ' + (index + 1));
  });
}

function inferNodeType(node)
{
  if (node.type != null)
  {
    return node.type;
  }

  return 'logic_card';
}

function normalizeNode(node, index)
{
  if (node == null || typeof node !== 'object')
  {
    throw new Error('Each node must be an object.');
  }

  const type = inferNodeType(node);

  return {
    id: normalizeText(node.id, 'node_' + (index + 1)),
    type,
    layer: normalizeText(node.layer, 'Layer 1'),
    order: Number.isFinite(node.order) ? node.order : index,
    title: normalizeText(node.title, node.label || ('Node ' + (index + 1))),
    subtitle: normalizeText(node.subtitle, ''),
    description: normalizeText(node.description, ''),
    x: Number.isFinite(node.x) ? node.x : null,
    y: Number.isFinite(node.y) ? node.y : null,
    width: Number.isFinite(node.width) ? node.width : null,
    height: Number.isFinite(node.height) ? node.height : null,
    inputs: normalizeKeyValueItems(node.inputs),
    outputs: normalizeKeyValueItems(node.outputs),
    fields: normalizeKeyValueItems(node.fields),
    methods: ensureArray(node.methods).map((item, methodIndex) =>
    {
      if (typeof item === 'string')
      {
        return {
          name: item,
          description: ''
        };
      }

      if (item == null || typeof item !== 'object')
      {
        throw new Error('Each class method entry must be a string or object.');
      }

      return {
        name: normalizeText(item.name, 'method_' + (methodIndex + 1)),
        description: normalizeText(item.description, '')
      };
    }),
    logic: normalizeBullets(node.logic),
    notes: normalizeBullets(node.notes),
    condition: normalizeText(node.condition, ''),
    branches: ensureArray(node.branches).map((item, branchIndex) =>
    {
      if (typeof item === 'string')
      {
        return item;
      }

      if (item == null || typeof item !== 'object')
      {
        throw new Error('Each decision branch must be a string or object.');
      }

      return normalizeText(item.label, item.text || ('Branch ' + (branchIndex + 1)));
    }),
    source: normalizeText(node.source, ''),
    target: normalizeText(node.target, ''),
    responsibility: normalizeText(node.responsibility, node.description || '')
  };
}

function normalizeEdge(edge, index)
{
  if (edge == null || typeof edge !== 'object')
  {
    throw new Error('Each edge must be an object.');
  }

  return {
    id: normalizeText(edge.id, 'edge_' + (index + 1)),
    from: normalizeText(edge.from, ''),
    to: normalizeText(edge.to, ''),
    label: normalizeText(edge.label, ''),
    kind: normalizeText(edge.kind, 'call'),
    layer: normalizeText(edge.layer, '')
  };
}

function buildModelFromChains(input)
{
  const chains = ensureArray(input.chains);

  if (chains.length === 0)
  {
    throw new Error('Input must include at least one chain in `chains`.');
  }

  const layers = [];
  const nodes = [];
  const edges = [];

  chains.forEach((chain, chainIndex) =>
  {
    if (chain == null || typeof chain !== 'object')
    {
      throw new Error('Each chain must be an object.');
    }

    const layerId = normalizeText(chain.id, 'chain_' + (chainIndex + 1));
    const layerLabel = normalizeText(chain.label, 'Chain ' + (chainIndex + 1));
    const steps = ensureArray(chain.steps);

    if (steps.length === 0)
    {
      throw new Error('Each chain must include at least one step.');
    }

    layers.push({
      id: layerId,
      label: layerLabel,
      description: normalizeText(chain.description, ''),
      order: chainIndex
    });

    let previousNodeId = null;

    steps.forEach((step, stepIndex) =>
    {
      let node;

      if (typeof step === 'string')
      {
        node = {
          id: layerId + '_step_' + (stepIndex + 1),
          type: 'logic_card',
          layer: layerId,
          title: step,
          description: '',
          order: stepIndex
        };
      }
      else if (step != null && typeof step === 'object')
      {
        node = {
          id: normalizeText(step.id, layerId + '_step_' + (stepIndex + 1)),
          type: 'logic_card',
          layer: layerId,
          title: normalizeText(step.label, step.name || ('Step ' + (stepIndex + 1))),
          subtitle: normalizeText(step.subtitle, step.file || ''),
          description: normalizeText(step.description, ''),
          order: stepIndex,
          logic: step.logic
        };
      }
      else
      {
        throw new Error('Each step must be a string or object.');
      }

      nodes.push(node);

      if (previousNodeId != null)
      {
        edges.push({
          id: layerId + '_edge_' + stepIndex,
          from: previousNodeId,
          to: node.id,
          kind: 'call',
          layer: layerId
        });
      }

      previousNodeId = node.id;
    });
  });

  return {
    title: input.title || 'Code Flow Layers',
    pageName: input.pageName || 'Code Flow',
    direction: input.direction === 'vertical' ? 'vertical' : 'horizontal',
    layers,
    nodes,
    edges
  };
}

function buildModelFromSemanticInput(input)
{
  const rawNodes = ensureArray(input.nodes);

  if (rawNodes.length === 0)
  {
    throw new Error('Semantic input must include at least one entry in `nodes`.');
  }

  const rawLayers = ensureArray(input.layers);
  const nodes = rawNodes.map(normalizeNode);
  const edges = ensureArray(input.edges).map(normalizeEdge);
  const layersById = {};
  const layers = [];

  rawLayers.forEach((layer, index) =>
  {
    if (layer == null || typeof layer !== 'object')
    {
      throw new Error('Each layer must be an object.');
    }

    const normalized = {
      id: normalizeText(layer.id, 'layer_' + (index + 1)),
      label: normalizeText(layer.label, layer.id || ('Layer ' + (index + 1))),
      description: normalizeText(layer.description, ''),
      order: Number.isFinite(layer.order) ? layer.order : index
    };

    layersById[normalized.id] = normalized;
    layers.push(normalized);
  });

  nodes.forEach((node, index) =>
  {
    if (!layersById[node.layer])
    {
      const implicit = {
        id: node.layer,
        label: node.layer,
        description: '',
        order: layers.length + index
      };

      layersById[implicit.id] = implicit;
      layers.push(implicit);
    }
  });

  return {
    title: input.title || 'Code Flow Layers',
    pageName: input.pageName || 'Code Flow',
    direction: input.direction === 'vertical' ? 'vertical' : 'horizontal',
    layers: layers.sort((a, b) => a.order - b.order),
    nodes,
    edges
  };
}

function normalizeInput(input)
{
  if (input == null || typeof input !== 'object')
  {
    throw new Error('Input must be an object.');
  }

  if (Array.isArray(input.nodes))
  {
    return buildModelFromSemanticInput(input);
  }

  return buildModelFromChains(input);
}

function estimateNodeHeight(node)
{
  const sectionHeader = 20;
  const lineHeight = 18;
  let height = 0;

  switch (node.type)
  {
    case 'method_card':
      height = 40;
      height += sectionHeader + Math.max(1, node.inputs.length) * lineHeight;
      height += sectionHeader + Math.max(1, node.logic.length) * lineHeight;
      height += sectionHeader + Math.max(1, node.outputs.length) * lineHeight;
      return Math.max(height, 190);

    case 'class_card':
      height = 40;
      height += sectionHeader + Math.max(1, node.responsibility ? 2 : 1) * lineHeight;
      height += sectionHeader + Math.max(1, node.methods.length) * lineHeight;
      return Math.max(height, 170);

    case 'data_card':
      height = 40;
      height += sectionHeader + Math.max(1, node.fields.length) * lineHeight;
      height += sectionHeader + Math.max(1, (node.source || node.target) ? 2 : 1) * lineHeight;
      return Math.max(height, 150);

    case 'logic_card':
      height = 40;
      height += Math.max(2, node.logic.length || (node.description ? 2 : 0)) * lineHeight;
      return Math.max(height, 120);

    case 'decision_card':
      height = 120 + Math.max(0, node.branches.length - 2) * 14;
      return height;

    case 'external_card':
      height = 40;
      height += Math.max(2, node.description ? 2 : 0) * lineHeight;
      return Math.max(height, 110);

    case 'note_card':
      height = 40;
      height += Math.max(2, node.notes.length || (node.description ? 2 : 0)) * lineHeight;
      return Math.max(height, 110);

    default:
      return 120;
  }
}

function formatKeyValueLines(items)
{
  if (items.length === 0)
  {
    return '<span style="color:#888888;">None</span>';
  }

  return items.map(item =>
    `<div><span style="font-weight:600;">${escapeXml(item.name)}</span>` +
    (item.meaning ? `: ${escapeXml(item.meaning)}` : '') +
    '</div>'
  ).join('');
}

function formatBulletLines(items, fallback)
{
  if (items.length === 0)
  {
    return `<div style="color:#888888;">${escapeXml(fallback)}</div>`;
  }

  return items.map(item => `<div>&#8226; ${escapeXml(item)}</div>`).join('');
}

function sectionHtml(title, bodyHtml, border)
{
  return (
    `<div style="padding:8px 10px;${border ? 'border-top:1px solid #D7DCE3;' : ''}">` +
    `<div style="font-size:11px;font-weight:700;color:#5F6B7A;text-transform:uppercase;margin-bottom:4px;">${escapeXml(title)}</div>` +
    bodyHtml +
    '</div>'
  );
}

function renderMethodCard(node, colors)
{
  return (
    `<div style="margin:0;padding:0;">` +
    `<div style="text-align:center;font-weight:700;font-size:14px;padding:10px 12px;background:${colors.fill};border-bottom:2px solid ${colors.stroke};">${escapeXml(node.title)}</div>` +
    sectionHtml('Inputs', formatKeyValueLines(node.inputs), false) +
    sectionHtml('Core Logic', formatBulletLines(node.logic, node.description || 'No logic description'), true) +
    sectionHtml('Outputs', formatKeyValueLines(node.outputs), true) +
    `</div>`
  );
}

function renderClassCard(node, colors)
{
  const responsibility = node.responsibility ?
    `<div>${escapeXml(node.responsibility)}</div>` :
    '<div style="color:#888888;">No responsibility summary</div>';
  const methods = node.methods.length === 0 ?
    '<div style="color:#888888;">No key methods</div>' :
    node.methods.map(method =>
      `<div><span style="font-weight:600;">${escapeXml(method.name)}</span>` +
      (method.description ? `: ${escapeXml(method.description)}` : '') +
      '</div>'
    ).join('');

  return (
    `<div style="margin:0;padding:0;">` +
    `<div style="text-align:center;font-weight:700;font-size:14px;padding:10px 12px;background:${colors.fill};border-bottom:2px solid ${colors.stroke};">${escapeXml(node.title)}</div>` +
    sectionHtml('Responsibility', responsibility, false) +
    sectionHtml('Key Methods', methods, true) +
    `</div>`
  );
}

function renderDataCard(node, colors)
{
  const flowLines = [];

  if (node.source)
  {
    flowLines.push(`<div><span style="font-weight:600;">Source</span>: ${escapeXml(node.source)}</div>`);
  }

  if (node.target)
  {
    flowLines.push(`<div><span style="font-weight:600;">Target</span>: ${escapeXml(node.target)}</div>`);
  }

  return (
    `<div style="margin:0;padding:0;">` +
    `<div style="text-align:center;font-weight:700;font-size:14px;padding:10px 12px;background:${colors.fill};border-bottom:2px solid ${colors.stroke};">${escapeXml(node.title)}</div>` +
    sectionHtml('Fields', formatKeyValueLines(node.fields), false) +
    sectionHtml('Flow', flowLines.join('') || '<div style="color:#888888;">No source/target details</div>', true) +
    `</div>`
  );
}

function renderLogicCard(node, colors)
{
  const bullets = node.logic.length > 0 ? node.logic : (node.description ? [node.description] : []);

  return (
    `<div style="margin:0;padding:0;">` +
    `<div style="text-align:center;font-weight:700;font-size:14px;padding:10px 12px;background:${colors.fill};border-bottom:2px solid ${colors.stroke};">${escapeXml(node.title)}</div>` +
    sectionHtml('Logic', formatBulletLines(bullets, 'No logic description'), false) +
    `</div>`
  );
}

function renderExternalCard(node, colors)
{
  const details = node.description ?
    `<div>${escapeXml(node.description)}</div>` :
    '<div style="color:#888888;">No description</div>';

  return (
    `<div style="margin:0;padding:0;">` +
    `<div style="text-align:center;font-weight:700;font-size:14px;padding:10px 12px;background:${colors.fill};border-bottom:2px solid ${colors.stroke};">${escapeXml(node.title)}</div>` +
    sectionHtml('External Dependency', details, false) +
    `</div>`
  );
}

function renderNoteCard(node, colors)
{
  const bullets = node.notes.length > 0 ? node.notes : (node.description ? [node.description] : []);

  return (
    `<div style="margin:0;padding:0;">` +
    `<div style="text-align:center;font-weight:700;font-size:14px;padding:10px 12px;background:${colors.fill};border-bottom:2px solid ${colors.stroke};">${escapeXml(node.title)}</div>` +
    sectionHtml('Notes', formatBulletLines(bullets, 'No notes'), false) +
    `</div>`
  );
}

function renderHtmlLabel(node, colors)
{
  switch (node.type)
  {
    case 'method_card':
      return renderMethodCard(node, colors);
    case 'class_card':
      return renderClassCard(node, colors);
    case 'data_card':
      return renderDataCard(node, colors);
    case 'logic_card':
      return renderLogicCard(node, colors);
    case 'external_card':
      return renderExternalCard(node, colors);
    case 'note_card':
      return renderNoteCard(node, colors);
    default:
      return renderLogicCard(node, colors);
  }
}

function getNodeStyle(node, colors)
{
  if (node.type === 'decision_card')
  {
    return `rhombus;whiteSpace=wrap;html=1;strokeWidth=2;strokeColor=${colors.stroke};fillColor=#FFFFFF;fontSize=13;fontColor=#1F1F1F;spacing=10;`;
  }

  if (node.type === 'external_card')
  {
    return `rounded=1;arcSize=12;whiteSpace=wrap;html=1;strokeWidth=2;dashed=1;strokeColor=${colors.stroke};fillColor=#FFFFFF;fontSize=13;fontColor=#1F1F1F;spacing=0;`;
  }

  if (node.type === 'note_card')
  {
    return `shape=note;whiteSpace=wrap;html=1;strokeWidth=1;strokeColor=${colors.stroke};fillColor=${colors.fill};fontSize=13;fontColor=#1F1F1F;spacing=8;`;
  }

  return `rounded=1;arcSize=12;whiteSpace=wrap;html=1;strokeWidth=2;strokeColor=${colors.stroke};fillColor=#FFFFFF;fontSize=13;fontColor=#1F1F1F;spacing=0;`;
}

function getNodeValue(node, colors)
{
  if (node.type === 'decision_card')
  {
    const branches = node.branches.length > 0 ?
      node.branches.map(item => `&#8226; ${escapeXml(item)}`).join('<br>') :
      '<span style="color:#666666;">No branch details</span>';

    return (
      `<div style="text-align:center;"><div style="font-weight:700;font-size:14px;">${escapeXml(node.title)}</div>` +
      `<div style="margin-top:6px;">${escapeXml(node.condition || node.description || '')}</div>` +
      `<div style="margin-top:8px;font-size:11px;color:#666666;">${branches}</div></div>`
    );
  }

  if (node.type === 'note_card')
  {
    const bullets = node.notes.length > 0 ? node.notes : (node.description ? [node.description] : []);
    return `<div style="padding:6px 4px;">${formatBulletLines(bullets, 'No notes')}</div>`;
  }

  return renderHtmlLabel(node, colors);
}

function estimateNodeSize(node)
{
  const fallback = TYPE_DEFAULTS[node.type] || TYPE_DEFAULTS.logic_card;

  return {
    width: node.width || fallback.width,
    height: node.height || estimateNodeHeight(node)
  };
}

function getEdgeStyle(edge, colors)
{
  const kind = edge.kind || 'call';
  let strokeColor = colors.stroke;
  let dashed = '0';
  let arrow = 'block';

  if (kind === 'data_flow')
  {
    strokeColor = '#2C7FB8';
    arrow = 'open';
  }
  else if (kind === 'return')
  {
    strokeColor = '#54A24B';
    dashed = '1';
    arrow = 'open';
  }
  else if (kind === 'dependency')
  {
    strokeColor = '#9D755D';
    dashed = '1';
    arrow = 'open';
  }
  else if (kind === 'contains')
  {
    strokeColor = '#777777';
    dashed = '1';
    arrow = 'none';
  }

  return `edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeWidth=2;strokeColor=${strokeColor};dashed=${dashed};endArrow=${arrow};endFill=1;`;
}

function buildDiagramXml(input)
{
  const data = normalizeInput(input);
  const counters = { value: 1 };
  const rootId = createId('root-', counters);
  const pageRootId = createId('page-', counters);
  const overviewLayerId = createId('layer-', counters);
  const cellXml = [];
  const directionHorizontal = data.direction === 'horizontal';
  const laneGap = 56;
  const nodeGap = 28;
  const laneHeader = 40;
  const lanePadding = 24;
  const nodePositions = {};
  const nodeParentLayers = {};
  const logicalLayers = {};
  let maxExtentX = 0;
  let maxExtentY = 0;

  cellXml.push(`        <mxCell id="${rootId}" />`);
  cellXml.push(`        <mxCell id="${pageRootId}" parent="${rootId}" />`);
  cellXml.push(`        <mxCell id="${overviewLayerId}" value="Overview" parent="${pageRootId}" visible="1" locked="1" />`);

  const titleId = createId('title-', counters);
  cellXml.push(
    `        <mxCell id="${titleId}" value="${escapeXml(data.title)}" style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;fontStyle=1;fontSize=22;fontColor=#1F1F1F;" parent="${overviewLayerId}" vertex="1">` +
    `<mxGeometry x="40" y="24" width="820" height="32" as="geometry" /></mxCell>`
  );

  let laneCursorX = 40;
  let laneCursorY = 80;

  data.layers.forEach((layer, layerIndex) =>
  {
    const colors = COLORS[layerIndex % COLORS.length];
    const logicalLayerId = createId('layer-', counters);
    const laneId = createId('lane-', counters);
    const layerNodes = data.nodes
      .filter(node => node.layer === layer.id)
      .sort((a, b) => a.order - b.order);
    const nodeSizes = layerNodes.map(estimateNodeSize);
    const laneWidth = directionHorizontal ?
      lanePadding * 2 + nodeSizes.reduce((sum, size) => sum + size.width, 0) + Math.max(0, layerNodes.length - 1) * nodeGap :
      lanePadding * 2 + Math.max(0, ...nodeSizes.map(size => size.width));
    const laneHeight = directionHorizontal ?
      laneHeader + lanePadding * 2 + Math.max(120, ...nodeSizes.map(size => size.height)) :
      laneHeader + lanePadding * 2 + nodeSizes.reduce((sum, size) => sum + size.height, 0) + Math.max(0, layerNodes.length - 1) * nodeGap;
    const laneX = directionHorizontal ? 40 : laneCursorX;
    const laneY = directionHorizontal ? laneCursorY : 80;
    const laneLabel = layer.description ?
      `${escapeXml(layer.label)}<br><font style="font-size:11px;color:#5F6B7A;">${escapeXml(layer.description)}</font>` :
      escapeXml(layer.label);

    logicalLayers[layer.id] = {
      cellId: logicalLayerId,
      laneId,
      colors
    };

    cellXml.push(`        <mxCell id="${logicalLayerId}" value="${escapeXml(layer.label)}" parent="${pageRootId}" visible="1" />`);
    cellXml.push(
      `        <mxCell id="${laneId}" value="${escapeXml(laneLabel)}" style="swimlane;html=1;startSize=40;rounded=0;shadow=0;horizontal=1;container=1;collapsible=0;whiteSpace=wrap;fontStyle=1;fontSize=14;strokeColor=${colors.stroke};fillColor=${colors.fill};fontColor=#1F1F1F;" parent="${logicalLayerId}" vertex="1">` +
      `<mxGeometry x="${laneX}" y="${laneY}" width="${laneWidth}" height="${laneHeight}" as="geometry" /></mxCell>`
    );

    maxExtentX = Math.max(maxExtentX, laneX + laneWidth);
    maxExtentY = Math.max(maxExtentY, laneY + laneHeight);

    if (directionHorizontal)
    {
      laneCursorY += laneHeight + laneGap;
    }
    else
    {
      laneCursorX += laneWidth + laneGap;
    }

    let cursorX = lanePadding;
    let cursorY = laneHeader + lanePadding;

    layerNodes.forEach((node, nodeIndex) =>
    {
      const size = nodeSizes[nodeIndex];
      const nodeId = createId('node-', counters);
      const x = Number.isFinite(node.x) ? node.x : cursorX;
      const y = Number.isFinite(node.y) ? node.y : cursorY;

      nodePositions[node.id] = nodeId;
      nodeParentLayers[node.id] = layer.id;

      cellXml.push(
        `        <mxCell id="${nodeId}" value="${escapeXml(getNodeValue(node, colors))}" style="${getNodeStyle(node, colors)}" parent="${laneId}" vertex="1">` +
        `<mxGeometry x="${x}" y="${y}" width="${size.width}" height="${size.height}" as="geometry" /></mxCell>`
      );

      if (directionHorizontal)
      {
        cursorX += size.width + nodeGap;
      }
      else
      {
        cursorY += size.height + nodeGap;
      }
    });
  });

  data.edges.forEach(edge =>
  {
    const sourceId = nodePositions[edge.from];
    const targetId = nodePositions[edge.to];

    if (sourceId == null || targetId == null)
    {
      throw new Error('Edge references unknown node: ' + edge.from + ' -> ' + edge.to);
    }

    let parentId = overviewLayerId;

    if (edge.layer && logicalLayers[edge.layer])
    {
      parentId = logicalLayers[edge.layer].cellId;
    }
    else if (nodeParentLayers[edge.from] === nodeParentLayers[edge.to] &&
      logicalLayers[nodeParentLayers[edge.from]])
    {
      parentId = logicalLayers[nodeParentLayers[edge.from]].cellId;
    }

    const colors = logicalLayers[nodeParentLayers[edge.from]] ?
      logicalLayers[nodeParentLayers[edge.from]].colors :
      COLORS[0];
    const edgeId = createId('edge-', counters);
    const label = edge.label ? escapeXml(edge.label) : '';

    cellXml.push(
      `        <mxCell id="${edgeId}" value="${label}" style="${getEdgeStyle(edge, colors)}" parent="${parentId}" source="${sourceId}" target="${targetId}" edge="1">` +
      `<mxGeometry relative="1" as="geometry" /></mxCell>`
    );
  });

  const pageWidth = Math.max(1000, maxExtentX + 80);
  const pageHeight = Math.max(700, maxExtentY + 80);

  return [
    '<mxfile host="mcp.drawio" modified="' + new Date().toISOString() + '" agent="Codex MCP" version="25.0.0" type="device" compressed="false">',
    `  <diagram id="code-flow-layers" name="${escapeXml(data.pageName)}">`,
    `    <mxGraphModel dx="1600" dy="1200" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${pageWidth}" pageHeight="${pageHeight}" background="none" math="0" shadow="0">`,
    '      <root>',
    cellXml.join('\n'),
    '      </root>',
    '    </mxGraphModel>',
    '  </diagram>',
    '</mxfile>'
  ].join('\n');
}

function generateDrawioFile(input, outputPath)
{
  const xml = buildDiagramXml(input);

  if (outputPath != null)
  {
    const absolute = path.resolve(outputPath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, xml, 'utf8');

    return {
      outputPath: absolute,
      xml
    };
  }

  return { xml };
}

module.exports = {
  buildDiagramXml,
  generateDrawioFile,
  normalizeInput
};
