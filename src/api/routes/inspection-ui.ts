import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import fastifyStatic from "@fastify/static";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface InspectionUiRouteOptions {
  uiDistDir: string;
}

async function sendInspectionIndex(
  indexHtmlPath: string,
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const indexHtml = await readFile(indexHtmlPath, "utf8");
  return reply.type("text/html; charset=utf-8").send(indexHtml);
}

export function registerInspectionUiRoutes(
  app: FastifyInstance,
  options: InspectionUiRouteOptions
): void {
  const uiDistDir = resolve(options.uiDistDir);
  const assetsDir = join(uiDistDir, "assets");
  const indexHtmlPath = join(uiDistDir, "index.html");

  app.register(fastifyStatic, {
    root: assetsDir,
    prefix: "/inspection/assets/",
    decorateReply: false
  });

  app.get("/inspection", (request, reply) =>
    sendInspectionIndex(indexHtmlPath, request, reply)
  );
  app.get("/inspection/", (request, reply) =>
    sendInspectionIndex(indexHtmlPath, request, reply)
  );
  app.get("/inspection/runs/:runId", (request, reply) =>
    sendInspectionIndex(indexHtmlPath, request, reply)
  );
}
