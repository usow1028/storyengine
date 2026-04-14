import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const serverUrl = new URL(process.env.MCP_URL ?? "http://127.0.0.1:8787/mcp");
const transport = new StreamableHTTPClientTransport(serverUrl);
const client = new Client({
  name: "logic3d-narrative-app-smoke",
  version: "0.1.0",
});

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  await client.connect(transport);

  const tools = await client.listTools();
  const toolNames = tools.tools.map((tool) => tool.name).sort();
  assert(
    toolNames.includes("render_narrative_3d_graph"),
    "render_narrative_3d_graph tool is missing"
  );

  const resources = await client.listResources();
  const widget = resources.resources.find(
    (resource) => resource.uri === "ui://widget/logic3d-narrative.html"
  );
  assert(widget, "Logic3D widget resource is missing");

  const rendered = await client.callTool({
    name: "render_narrative_3d_graph",
    arguments: {
      title: "Smoke Story Blocks",
      storyText:
        "상헌은 오전 10시에 잠에서 깨어났다. 엄마는 11시에 출근했다. 상헌은 14시에 가게에 출근했다. 엄마는 17시에 향우회에 갔다. 묘경은 13시에 네일아트를 받았다.",
      showActorTrails: true,
      showCausalLinks: false,
      showAxisGuides: true,
    },
  });

  const scene = rendered.structuredContent?.scene;
  assert(scene?.sceneId, "render_narrative_3d_graph did not return a sceneId");
  assert(Array.isArray(scene?.blocks) && scene.blocks.length === 5, "wrong block count");
  assert(Array.isArray(scene?.actors) && scene.actors.length === 3, "wrong actor count");
  assert(
    Array.isArray(scene?.trails) && scene.trails.length >= 2,
    "expected actor trail lines"
  );

  const resourceRead = await client.readResource({
    uri: "ui://widget/logic3d-narrative.html",
  });
  const widgetHtml = resourceRead.contents.find(
    (item) => item.uri === "ui://widget/logic3d-narrative.html"
  )?.text;

  assert(
    typeof widgetHtml === "string" &&
      widgetHtml.includes("<canvas id=\"viewport\"></canvas>") &&
      widgetHtml.includes("render_narrative_3d_graph"),
    "widget HTML does not contain the expected canvas renderer"
  );

  console.log("Smoke test passed.");
  console.log(`Connected to ${serverUrl.href}`);
  console.log(`Tools: ${toolNames.join(", ")}`);
  console.log(`Scene id: ${scene.sceneId}`);
  console.log(`Blocks: ${scene.blocks.length}`);
} finally {
  await transport.close();
}
