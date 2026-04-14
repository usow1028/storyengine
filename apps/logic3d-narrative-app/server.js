import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";

import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
  registerAppTool,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number(process.env.PORT ?? 8787);
const MCP_PATH = "/mcp";
const WIDGET_URI = "ui://widget/logic3d-narrative.html";
const widgetTemplate = readFileSync(
  new URL("./public/logic3d-widget.html", import.meta.url),
  "utf8"
);

const sceneStore = new Map();

const DEFAULT_CAMERA = Object.freeze({
  yaw: -0.88,
  pitch: 0.6,
  zoom: 86,
  distance: 24,
});

const ACTOR_PALETTE = Object.freeze([
  "#1677ff",
  "#f97316",
  "#00a86b",
  "#b453e5",
  "#ef4444",
  "#0ea5a8",
  "#ca8a04",
  "#7c3aed",
]);

const RELATION_COLORS = Object.freeze({
  causes: "#ff6b4a",
  enables: "#1d72ff",
  motivates: "#b453e5",
  reveals: "#00a86b",
  blocks: "#d64545",
  restores: "#f59e0b",
  continuation: "#8ea2c2",
});

const widgetMeta = Object.freeze({
  ui: {
    prefersBorder: false,
    csp: {
      connectDomains: [],
      resourceDomains: [],
    },
  },
  "openai/widgetDescription":
    "Block-based narrative 3D graph renderer inspired by logic3d event, actor, and causal structures.",
  "openai/widgetPrefersBorder": false,
});

const actorSchema = z.object({
  actorId: z.string().trim().min(1).max(60).optional(),
  name: z.string().trim().min(1).max(60),
  laneIndex: z.number().int().positive().max(24).optional(),
  color: z
    .string()
    .trim()
    .regex(/^#?[0-9a-fA-F]{6}$/)
    .optional(),
  description: z.string().trim().max(160).optional(),
});

const narrativeEventSchema = z.object({
  eventId: z.string().trim().min(1).max(60).optional(),
  eventType: z.string().trim().min(1).max(60).optional(),
  title: z.string().trim().min(1).max(140),
  summary: z.string().trim().max(260).optional(),
  actorIds: z.array(z.string().trim().min(1).max(60)).max(6).optional(),
  actorNames: z.array(z.string().trim().min(1).max(60)).max(6).optional(),
  targetIds: z.array(z.string().trim().min(1).max(60)).max(6).optional(),
  sequence: z
    .union([z.number().finite().min(0).max(500), z.string().trim().min(1).max(40)])
    .optional(),
  revealRank: z
    .union([z.number().finite().min(0).max(500), z.string().trim().min(1).max(40)])
    .optional(),
  blockHeight: z.number().finite().min(0.6).max(4).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(8).default([]).optional(),
  preconditions: z.array(z.string().trim().min(1).max(120)).max(8).default([]).optional(),
  effects: z.array(z.string().trim().min(1).max(120)).max(8).default([]).optional(),
});

const causalLinkSchema = z.object({
  linkId: z.string().trim().min(1).max(60).optional(),
  causeEventId: z.string().trim().min(1).max(60),
  effectEventId: z.string().trim().min(1).max(60),
  relation: z
    .enum(["enables", "causes", "motivates", "reveals", "blocks", "restores"])
    .default("causes")
    .optional(),
  label: z.string().trim().max(80).optional(),
});

const renderNarrativeGraphSchema = {
  title: z.string().trim().min(1).max(120).optional(),
  synopsis: z.string().trim().max(320).optional(),
  storyText: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .describe(
      "Optional natural-language story text. If events are omitted, the server extracts simple event beats."
    ),
  xAxisLabel: z.string().trim().min(1).max(80).default("시간 순서").optional(),
  yAxisLabel: z.string().trim().min(1).max(80).default("행동 주체").optional(),
  zAxisLabel: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .default("서사 노출/인과 우선도")
    .optional(),
  actors: z.array(actorSchema).max(24).optional(),
  events: z.array(narrativeEventSchema).max(48).optional(),
  causalLinks: z.array(causalLinkSchema).max(80).default([]).optional(),
  showActorTrails: z.boolean().default(true).optional(),
  showCausalLinks: z.boolean().default(true).optional(),
  showAxisGuides: z.boolean().default(true).optional(),
};

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function buildWidgetHtml(previewScene = null) {
  return widgetTemplate.replace("__PREVIEW_SCENE_JSON__", safeJson(previewScene));
}

function sendText(
  res,
  statusCode,
  text,
  contentType = "text/plain; charset=utf-8"
) {
  res.writeHead(statusCode, { "content-type": contentType });
  res.end(text);
}

function cleanText(value, fallback = "") {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function normalizeId(value, fallback) {
  const normalized = cleanText(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function uniqueStrings(values) {
  const result = [];
  const seen = new Set();
  for (const value of values ?? []) {
    const text = cleanText(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }
  return result;
}

function ensureHex(color) {
  const value = cleanText(color);
  if (!value) return null;
  return value.startsWith("#") ? value : `#${value}`;
}

function toFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseClockLikeValue(value) {
  const text = cleanText(value);
  if (!text) return null;

  const numeric = Number(text);
  if (Number.isFinite(numeric)) {
    return numeric;
  }

  const match = text.match(
    /^(?:(오전|오후)\s*)?(\d{1,2})시(?:\s*(\d{1,2})분?)?$/
  );
  if (!match) return null;

  const meridiem = match[1] ?? "";
  let hour = Number(match[2]);
  const minutes = match[3] ? Number(match[3]) : 0;

  if (meridiem === "오후" && hour < 12) {
    hour += 12;
  }
  if (meridiem === "오전" && hour === 12) {
    hour = 0;
  }

  return hour + minutes / 60;
}

function normalizeLinkId(candidate, index) {
  return normalizeId(candidate, `link-${index + 1}`);
}

function normalizeEventId(candidate, index) {
  return normalizeId(candidate, `event-${index + 1}`);
}

function extractNarrativeEventsFromText(storyText) {
  const source = cleanText(storyText);
  if (!source) return [];

  const sentences = source
    .split(/[\n\r]+|(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const events = [];

  sentences.forEach((sentence, index) => {
    const normalizedSentence = sentence.replace(/[.!?]+$/g, "").trim();
    const timedMatch = normalizedSentence.match(
      /^(?<actor>.+?)(?:은|는|이|가)\s*(?<timeExpr>(?:오전|오후)?\s*\d{1,2}시(?:\s*\d{1,2}분?)?)에\s*(?<action>.+)$/
    );

    if (timedMatch?.groups) {
      const actor = cleanText(timedMatch.groups.actor);
      const action = cleanText(timedMatch.groups.action);
      const sequence = parseClockLikeValue(timedMatch.groups.timeExpr);
      if (actor && action && sequence !== null) {
        events.push({
          eventId: normalizeEventId(`${actor}-${index + 1}`, index),
          eventType: "beat",
          title: action,
          summary: normalizedSentence,
          actorNames: [actor],
          sequence,
          revealRank: index + 1,
          tags: [],
          preconditions: [],
          effects: [],
        });
      }
      return;
    }

    const simpleMatch = normalizedSentence.match(
      /^(?<actor>.+?)(?:은|는|이|가)\s*(?<action>.+)$/
    );
    if (simpleMatch?.groups) {
      const actor = cleanText(simpleMatch.groups.actor);
      const action = cleanText(simpleMatch.groups.action);
      if (actor && action) {
        events.push({
          eventId: normalizeEventId(`${actor}-${index + 1}`, index),
          eventType: "beat",
          title: action,
          summary: normalizedSentence,
          actorNames: [actor],
          sequence: index + 1,
          revealRank: index + 1,
          tags: [],
          preconditions: [],
          effects: [],
        });
      }
    }
  });

  if (events.length === 0) {
    throw new Error(
      "storyText 에서 사건을 추출하지 못했습니다. events 배열을 직접 주거나 `인물은 10시에 행동했다` 형태로 입력해 주세요."
    );
  }

  return events;
}

function resolveActorsAndEvents(input = {}) {
  const rawEvents =
    Array.isArray(input.events) && input.events.length > 0
      ? input.events
      : extractNarrativeEventsFromText(input.storyText);

  const providedActors = Array.isArray(input.actors) ? input.actors : [];
  const actorById = new Map();
  const actorByName = new Map();

  for (const actor of providedActors) {
    const actorId = normalizeId(actor.actorId ?? actor.name, "actor");
    const record = {
      actorId,
      name: cleanText(actor.name, actorId),
      laneIndex: actor.laneIndex ?? null,
      color: ensureHex(actor.color),
      description: cleanText(actor.description),
    };
    actorById.set(actorId, record);
    actorByName.set(record.name, record);
  }

  const events = rawEvents.map((event, index) => {
    const actorNames = uniqueStrings(event.actorNames);
    const actorIds = uniqueStrings(event.actorIds).map((value) =>
      normalizeId(value, value)
    );

    const resolvedActors = [];

    for (const actorId of actorIds) {
      const actor = actorById.get(actorId);
      if (actor) resolvedActors.push(actor.name);
    }

    for (const actorName of actorNames) {
      const actor = actorByName.get(actorName);
      resolvedActors.push(actor?.name ?? actorName);
    }

    const normalizedActorNames = uniqueStrings(resolvedActors);
    if (normalizedActorNames.length === 0) {
      throw new Error(
        `event ${event.eventId ?? index + 1} 에 actorNames 또는 actorIds 가 최소 1개 필요합니다.`
      );
    }

    for (const actorName of normalizedActorNames) {
      if (!actorByName.has(actorName)) {
        const actorId = normalizeId(actorName, `actor-${actorByName.size + 1}`);
        const record = {
          actorId,
          name: actorName,
          laneIndex: null,
          color: null,
          description: "",
        };
        actorById.set(actorId, record);
        actorByName.set(actorName, record);
      }
    }

    return {
      eventId: normalizeEventId(event.eventId, index),
      eventType: cleanText(event.eventType, "beat"),
      title: cleanText(event.title, `사건 ${index + 1}`),
      summary: cleanText(event.summary),
      actorNames: normalizedActorNames,
      targetIds: uniqueStrings(event.targetIds),
      sequence:
        toFiniteNumber(event.sequence) ??
        parseClockLikeValue(event.sequence) ??
        index + 1,
      revealRank:
        toFiniteNumber(event.revealRank) ??
        parseClockLikeValue(event.revealRank) ??
        index + 1,
      blockHeight:
        toFiniteNumber(event.blockHeight) ??
        Math.min(
          2.1,
          0.95 +
            (event.preconditions?.length ?? 0) * 0.08 +
            (event.effects?.length ?? 0) * 0.08 +
            (event.tags?.length ?? 0) * 0.05
        ),
      tags: uniqueStrings(event.tags),
      preconditions: uniqueStrings(event.preconditions),
      effects: uniqueStrings(event.effects),
      originalIndex: index,
    };
  });

  const orderedActorNames = providedActors
    .sort((left, right) => (left.laneIndex ?? 999) - (right.laneIndex ?? 999))
    .map((actor) => cleanText(actor.name))
    .filter(Boolean);

  for (const event of events) {
    for (const actorName of event.actorNames) {
      if (!orderedActorNames.includes(actorName)) {
        orderedActorNames.push(actorName);
      }
    }
  }

  const actors = orderedActorNames.map((actorName, index) => {
    const source = actorByName.get(actorName);
    return {
      actorId: source?.actorId ?? normalizeId(actorName, `actor-${index + 1}`),
      name: actorName,
      laneIndex: index + 1,
      color: source?.color ?? ACTOR_PALETTE[index % ACTOR_PALETTE.length],
      description: source?.description ?? "",
    };
  });

  const laneByActorName = new Map(actors.map((actor) => [actor.name, actor.laneIndex]));
  const colorByActorName = new Map(actors.map((actor) => [actor.name, actor.color]));

  const sortedEvents = [...events].sort(
    (left, right) =>
      left.sequence - right.sequence ||
      left.revealRank - right.revealRank ||
      left.originalIndex - right.originalIndex
  );

  const normalizedEvents = sortedEvents.map((event) => ({
    ...event,
    primaryActor: event.actorNames[0],
    laneIndex: laneByActorName.get(event.actorNames[0]) ?? 1,
    color: colorByActorName.get(event.actorNames[0]) ?? ACTOR_PALETTE[0],
  }));

  return {
    actors,
    events: normalizedEvents,
  };
}

function buildNarrativeScene(input = {}, options = { persist: true }) {
  const { actors, events } = resolveActorsAndEvents(input);
  const causalLinks = Array.isArray(input.causalLinks) ? input.causalLinks : [];

  if (events.length === 0) {
    throw new Error("서사 그래프를 만들 사건이 없습니다.");
  }

  const eventById = new Map(events.map((event) => [event.eventId, event]));
  const laneGap = 2.2;
  const sequenceGap = 2.7;
  const revealGap = 1.55;
  const minSequence = Math.min(...events.map((event) => event.sequence));
  const minReveal = Math.min(...events.map((event) => event.revealRank));

  const blocks = events.map((event, index) => {
    const x = (event.sequence - minSequence) * sequenceGap;
    const y = (event.laneIndex - 1) * laneGap;
    const z = (event.revealRank - minReveal) * revealGap;
    return {
      blockId: `block-${String(index + 1).padStart(2, "0")}`,
      eventId: event.eventId,
      eventType: event.eventType,
      title: event.title,
      summary: event.summary,
      actorNames: event.actorNames,
      primaryActor: event.primaryActor,
      sequence: event.sequence,
      revealRank: event.revealRank,
      width: 1.42,
      depth: 1.08,
      height: event.blockHeight,
      x,
      y,
      z,
      color: event.color,
      tags: event.tags,
      preconditions: event.preconditions,
      effects: event.effects,
    };
  });

  const blockByEventId = new Map(blocks.map((block) => [block.eventId, block]));

  const trails = [];
  if (input.showActorTrails ?? true) {
    for (const actor of actors) {
      const actorBlocks = blocks
        .filter((block) => block.primaryActor === actor.name)
        .sort((left, right) => left.sequence - right.sequence);

      for (let index = 0; index < actorBlocks.length - 1; index += 1) {
        trails.push({
          trailId: `trail-${actor.actorId}-${index + 1}`,
          fromBlockId: actorBlocks[index].blockId,
          toBlockId: actorBlocks[index + 1].blockId,
          relation: "continuation",
          color: actor.color,
          label: actor.name,
        });
      }
    }
  }

  const links = [];
  if (input.showCausalLinks ?? true) {
    causalLinks.forEach((link, index) => {
      const causeEventId = normalizeId(link.causeEventId, "");
      const effectEventId = normalizeId(link.effectEventId, "");
      const causeBlock = blockByEventId.get(causeEventId);
      const effectBlock = blockByEventId.get(effectEventId);
      if (!causeBlock || !effectBlock) {
        throw new Error(
          `causalLinks[${index}] 가 참조하는 사건을 찾지 못했습니다: ${link.causeEventId} -> ${link.effectEventId}`
        );
      }
      const relation = link.relation ?? "causes";
      links.push({
        linkId: normalizeLinkId(link.linkId, index),
        fromBlockId: causeBlock.blockId,
        toBlockId: effectBlock.blockId,
        relation,
        label: cleanText(link.label, relation),
        color: RELATION_COLORS[relation],
      });
    });
  }

  const maxX = Math.max(...blocks.map((block) => block.x + block.width), 1);
  const maxY = Math.max(...blocks.map((block) => block.y + block.depth), 1);
  const maxZ = Math.max(...blocks.map((block) => block.z + block.height), 1);
  const bounds = {
    minX: -1.8,
    minY: -1.2,
    minZ: -0.6,
    maxX: maxX + 1.6,
    maxY: maxY + 1.4,
    maxZ: maxZ + 1.8,
  };
  bounds.center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2,
  };

  const title = cleanText(input.title, "서사 블록 3D 그래프");
  const xAxisLabel = cleanText(input.xAxisLabel, "시간 순서");
  const yAxisLabel = cleanText(input.yAxisLabel, "행동 주체");
  const zAxisLabel = cleanText(input.zAxisLabel, "서사 노출/인과 우선도");
  const synopsis = cleanText(
    input.synopsis,
    "logic3d 식 사건/행동/인과 구조를 블록 단위로 시각화한 서사창작 전용 3D 그래프입니다."
  );

  const scene = {
    sceneId: randomUUID(),
    title,
    caption: synopsis,
    axes: {
      x: xAxisLabel,
      y: yAxisLabel,
      z: zAxisLabel,
    },
    camera: DEFAULT_CAMERA,
    bounds,
    actors,
    blocks,
    links,
    trails,
    guides: {
      showAxes: input.showAxisGuides ?? true,
      showActorTrails: input.showActorTrails ?? true,
      showCausalLinks: input.showCausalLinks ?? true,
    },
    generatedAt: new Date().toISOString(),
  };

  if (options.persist !== false) {
    sceneStore.set(scene.sceneId, scene);
  }

  return {
    scene,
    storyModel: {
      actors,
      events: events.map((event) => ({
        eventId: event.eventId,
        eventType: event.eventType,
        title: event.title,
        actorNames: event.actorNames,
        sequence: event.sequence,
        revealRank: event.revealRank,
        preconditions: event.preconditions,
        effects: event.effects,
      })),
      causalLinks: links.map((link) => ({
        linkId: link.linkId,
        relation: link.relation,
        label: link.label,
      })),
    },
  };
}

function sceneSummary(result) {
  return `${result.scene.title} 을 블록식 서사 3D 그래프로 렌더링합니다. 사건 ${result.scene.blocks.length}개, 인물 ${result.scene.actors.length}명, 인과 링크 ${result.scene.links.length}개입니다.`;
}

function buildPreviewScene() {
  return buildNarrativeScene(
    {
      title: "미리보기: 추적과 폭로",
      synopsis:
        "logic3d 스타일의 사건 블록, 인물 레인, 인과 링크를 보여 주는 샘플 장면입니다.",
      actors: [
        { name: "서윤", color: "#1677ff" },
        { name: "민재", color: "#f97316" },
        { name: "기록관", color: "#00a86b" },
      ],
      events: [
        {
          eventId: "clue-hidden",
          eventType: "setup",
          title: "단서를 봉인한다",
          actorNames: ["기록관"],
          sequence: 1,
          revealRank: 1,
          effects: ["archive sealed"],
        },
        {
          eventId: "search-night",
          eventType: "search",
          title: "서윤이 야간 추적을 시작한다",
          actorNames: ["서윤"],
          sequence: 2,
          revealRank: 2,
          preconditions: ["clue missing"],
        },
        {
          eventId: "pressure",
          eventType: "pressure",
          title: "민재가 협상을 압박한다",
          actorNames: ["민재"],
          sequence: 3,
          revealRank: 3,
          effects: ["time pressure"],
        },
        {
          eventId: "reveal-ledger",
          eventType: "reveal",
          title: "장부의 진짜 주인이 드러난다",
          actorNames: ["서윤", "기록관"],
          sequence: 4,
          revealRank: 5,
          tags: ["reveal", "twist"],
        },
      ],
      causalLinks: [
        {
          causeEventId: "clue-hidden",
          effectEventId: "search-night",
          relation: "causes",
        },
        {
          causeEventId: "pressure",
          effectEventId: "reveal-ledger",
          relation: "motivates",
        },
      ],
      showActorTrails: true,
      showCausalLinks: true,
      showAxisGuides: true,
    },
    { persist: false }
  ).scene;
}

const PREVIEW_SCENE = buildPreviewScene();

function createMcpAppServer() {
  const server = new McpServer({
    name: "logic3d-narrative-app",
    version: "0.1.0",
  });

  registerAppResource(
    server,
    "Logic3D Narrative Widget",
    WIDGET_URI,
    {
      description:
        "Interactive block-based 3D narrative graph rendered inside ChatGPT.",
      _meta: widgetMeta,
    },
    async () => ({
      contents: [
        {
          uri: WIDGET_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: buildWidgetHtml(null),
          _meta: widgetMeta,
        },
      ],
    })
  );

  registerAppTool(
    server,
    "render_narrative_3d_graph",
    {
      title: "Render Narrative 3D Graph",
      description:
        "Render a block-based narrative 3D graph inspired by logic3d. Accepts either structured events/actors/causalLinks or raw storyText.",
      inputSchema: renderNarrativeGraphSchema,
      _meta: {
        ui: { resourceUri: WIDGET_URI },
        "openai/outputTemplate": WIDGET_URI,
      },
    },
    async (args) => {
      try {
        const result = buildNarrativeScene(args);
        return {
          content: [{ type: "text", text: sceneSummary(result) }],
          structuredContent: {
            scene: result.scene,
            storyModel: result.storyModel,
          },
          _meta: {
            previewUrl: `http://${HOST}:${PORT}/preview?sceneId=${result.scene.sceneId}`,
          },
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                error instanceof Error
                  ? error.message
                  : "서사 3D 그래프를 렌더링하지 못했습니다.",
            },
          ],
        };
      }
    }
  );

  return server;
}

function createPreviewPage(url) {
  if (url.searchParams.get("empty") === "1") {
    return buildWidgetHtml(null);
  }

  const sceneId = url.searchParams.get("sceneId");
  const scene = (sceneId && sceneStore.get(sceneId)) || PREVIEW_SCENE;
  return buildWidgetHtml(scene);
}

const httpServer = createServer(async (req, res) => {
  if (!req.url) {
    sendText(res, 400, "Missing URL");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? `${HOST}:${PORT}`}`);
  const isMcpPath = url.pathname === MCP_PATH || url.pathname.startsWith(`${MCP_PATH}/`);

  if (req.method === "OPTIONS" && isMcpPath) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/") {
    sendText(
      res,
      200,
      [
        "Logic3D Narrative MCP server",
        `MCP endpoint: http://${HOST}:${PORT}${MCP_PATH}`,
        `Preview page: http://${HOST}:${PORT}/preview`,
      ].join("\n")
    );
    return;
  }

  if (req.method === "GET" && url.pathname === "/preview") {
    sendText(res, 200, createPreviewPage(url), "text/html; charset=utf-8");
    return;
  }

  if (req.method === "GET" && url.pathname === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === MCP_PATH && (req.method === "GET" || req.method === "DELETE")) {
    res.writeHead(405, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
      "content-type": "application/json",
    });
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      })
    );
    return;
  }

  if (url.pathname === MCP_PATH && req.method === "POST") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

    const server = createMcpAppServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        sendText(res, 500, "Internal server error");
      }
    }
    return;
  }

  sendText(res, 404, "Not Found");
});

httpServer.listen(PORT, HOST, () => {
  console.log(
    `Logic3D Narrative MCP server listening on http://${HOST}:${PORT}${MCP_PATH}`
  );
});

process.on("SIGINT", () => {
  httpServer.close(() => process.exit(0));
});
