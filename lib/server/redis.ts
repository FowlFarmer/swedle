import "server-only";

import { Redis } from "@upstash/redis";

let client: Redis | undefined;

export function getRedis() {
  if (client) return client;

  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error("Redis is not configured. Connect an Upstash resource or set KV_REST_API_URL and KV_REST_API_TOKEN.");
  }

  client = new Redis({
    url,
    token,
    enableTelemetry: false,
    enableAutoPipelining: true,
  });
  return client;
}

export const REDIS_PREFIX = "swedle:v1";
