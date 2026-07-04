import "server-only";
import { type Duration, Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

export interface RateLimitRule {
  name: string;
  limit: number;
  window: Duration;
}

// ログイン不要サービスのため IP ベースで作成・回答系 Action を制限する。
export const CREATE_EVENT_LIMIT: RateLimitRule = {
  name: "create-event",
  limit: 5,
  window: "10 m",
};
export const ANSWER_LIMIT: RateLimitRule = {
  name: "answer",
  limit: 30,
  window: "10 m",
};

let cachedRedis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (cachedRedis !== undefined) {
    return cachedRedis;
  }
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  cachedRedis = url && token ? new Redis({ url, token }) : null;
  return cachedRedis;
}

const limiters = new Map<string, Ratelimit>();

function getLimiter(rule: RateLimitRule): Ratelimit | null {
  const redis = getRedis();
  if (!redis) {
    return null;
  }
  let limiter = limiters.get(rule.name);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(rule.limit, rule.window),
      prefix: `chosei:ratelimit:${rule.name}`,
      analytics: false,
    });
    limiters.set(rule.name, limiter);
  }
  return limiter;
}

/**
 * リクエスト元 IP を取得する。プロキシ配下(Vercel)では x-forwarded-for の先頭。
 * 取得できない場合は "unknown" にフォールバックする。
 */
export async function clientIdentifier(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return headerList.get("x-real-ip") ?? "unknown";
}

/**
 * レート制限を判定する。Upstash 未設定(ローカル/CI)なら常に許可する。
 * @returns 許可なら true、超過なら false
 */
export async function checkRateLimit(
  rule: RateLimitRule,
  identifier: string,
): Promise<boolean> {
  const limiter = getLimiter(rule);
  if (!limiter) {
    return true;
  }
  const { success } = await limiter.limit(identifier);
  return success;
}
