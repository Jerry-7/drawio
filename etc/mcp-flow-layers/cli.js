const fs = require('fs');
const path = require('path');
const { generateDrawioFile } = require('./generator');

function usage()
{
  console.error('Usage: node cli.js <input.json> [output.drawio]');
  process.exit(1);
}

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath)
{
  usage();
}

const absoluteInput = path.resolve(inputPath);
const payload = JSON.parse(fs.readFileSync(absoluteInput, 'utf8'));
const result = generateDrawioFile(
  payload,
  outputPath != null ? outputPath : payload.outputPath
);

console.log(JSON.stringify({
  outputPath: result.outputPath,
  title: payload.title,
  chainCount: Array.isArray(payload.chains) ? payload.chains.length : 0,
  layerCount: Array.isArray(payload.layers) ? payload.layers.length :
    (Array.isArray(payload.chains) ? payload.chains.length : 0),
  nodeCount: Array.isArray(payload.nodes) ? payload.nodes.length : 0
}, null, 2));
