import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildPriorSnapshots,
  CorpusWorkSchema,
  exportPriorSnapshots,
  normalizeCorpusWork
} from "../src/corpus/index.js";

const DEFAULT_INPUT_PATH = "data/corpus/works.json";
const DEFAULT_OUTPUT_DIR = "data/prior-snapshots/";

function parseArgs(argv: string[]) {
  const values = {
    input: DEFAULT_INPUT_PATH,
    outputDir: DEFAULT_OUTPUT_DIR,
    snapshotVersion: `prior:${new Date().toISOString().slice(0, 10)}`
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const nextValue = argv[index + 1];
    if (!value || !nextValue) {
      continue;
    }

    if (value === "--input") {
      values.input = nextValue;
      index += 1;
      continue;
    }

    if (value === "--output-dir") {
      values.outputDir = nextValue;
      index += 1;
      continue;
    }

    if (value === "--snapshot-version") {
      values.snapshotVersion = nextValue;
      index += 1;
    }
  }

  return values;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const raw = await readFile(args.input, "utf8");
  const payload = JSON.parse(raw);
  const works = Array.isArray(payload) ? payload : [];
  const normalizedWorks = works.map((entry) =>
    normalizeCorpusWork(CorpusWorkSchema.parse(entry))
  );
  const snapshots = buildPriorSnapshots({
    normalizedWorks,
    snapshotVersion: args.snapshotVersion
  });
  const artifacts = exportPriorSnapshots({
    snapshots,
    snapshotVersion: args.snapshotVersion
  });

  await mkdir(args.outputDir, { recursive: true });

  for (const artifact of artifacts) {
    await writeFile(
      path.join(args.outputDir, artifact.filename),
      `${JSON.stringify(artifact.artifact, null, 2)}\n`,
      "utf8"
    );
  }

  console.log(
    JSON.stringify(
      {
        outputDir: args.outputDir,
        files: artifacts.map((artifact) => artifact.filename),
        snapshotCount: snapshots.length,
        snapshotVersion: args.snapshotVersion
      },
      null,
      2
    )
  );
}

await main();
