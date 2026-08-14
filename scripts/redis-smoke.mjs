import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
if (!url || !token) throw new Error("Redis credentials were not injected.");

const redis = new Redis({ url, token, enableTelemetry: false });
const key = `swedle:v1:smoke:${randomUUID()}`;

try {
  await redis.multi().set(key, { count: 0 }, { ex: 60 }).exec();
  const result = await redis.eval(
    "local value = cjson.decode(redis.call('GET', KEYS[1])); value.count = value.count + 1; redis.call('SET', KEYS[1], cjson.encode(value), 'EX', 60); return cjson.encode(value)",
    [key],
    [],
  );
  const parsed = typeof result === "string" ? JSON.parse(result) : result;
  if (parsed.count !== 1) throw new Error("Atomic Redis smoke test returned an unexpected result.");
  console.log("Upstash namespaced transaction smoke test passed");
} finally {
  await redis.del(key);
}
