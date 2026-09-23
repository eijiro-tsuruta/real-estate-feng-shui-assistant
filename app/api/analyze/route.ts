import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  MAX_REQUEST_BYTES,
  validateImage,
} from "@/lib/file-validation";
import { generateFloorPlanReport } from "@/lib/floorplan-report";
import { calculateKua, type Gender } from "@/lib/kua";
import { isLiveAnalysisEnabled } from "@/lib/live-analysis";
import {
  OpenAIRequestError,
} from "@/lib/openai-json";
import { northOverrideSchema } from "@/lib/north-direction";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const formSchema = z.object({
  propertyName: z.string().trim().max(100).default(""),
  birthYear: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}$/.test(value), "生年を確認してください。"),
  gender: z.enum(["", "male", "female"]),
  northOverride: northOverrideSchema,
});

function errorResponse(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...headers,
      },
    },
  );
}

function isSameOrigin(request: NextRequest): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && !["same-origin", "same-site", "none"].includes(site)) return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host");
    const expectedHost = forwardedHost ?? request.nextUrl.host;
    return originUrl.host === expectedHost;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return errorResponse("不正な送信元からのリクエストです。", 403);
  }

  if (
    !isLiveAnalysisEnabled(
      process.env.NODE_ENV,
      process.env.ENABLE_LIVE_ANALYSIS,
      process.env.NEXT_PUBLIC_ENABLE_LIVE_ANALYSIS,
    )
  ) {
    return errorResponse(
      "公開デモではAI解析を停止しています。サンプルレポートをご覧ください。",
      503,
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data")) {
    return errorResponse("送信形式が正しくありません。", 415);
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_REQUEST_BYTES
  ) {
    return errorResponse("送信データが大きすぎます。画像は4MB以下にしてください。", 413);
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local";
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return errorResponse("短時間の利用回数が上限に達しました。しばらくしてからお試しください。", 429, {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return errorResponse("AI接続がまだ設定されていません。管理者にお問い合わせください。", 503);
  }

  try {
    const formData = await request.formData();
    const image = formData.get("image");
    if (!(image instanceof File)) {
      return errorResponse("間取り図の画像を選択してください。", 400);
    }

    const parsed = formSchema.safeParse({
      propertyName: formData.get("propertyName") ?? "",
      birthYear: formData.get("birthYear") ?? "",
      gender: formData.get("gender") ?? "",
      northOverride: formData.get("northOverride") ?? "auto",
    });
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "入力内容を確認してください。", 400);
    }

    const { bytes, mediaType } = await validateImage(image);
    const { propertyName, birthYear, gender, northOverride } = parsed.data;
    const kua =
      birthYear && gender
        ? calculateKua(Number(birthYear), gender as Gender)
        : null;

    const personalization = kua
      ? `顧客の簡易本命卦: ${kua.number}・${kua.trigram}（${kua.group}）。吉方位の傾向: ${kua.favorableDirections.join("、")}。注意方位の傾向: ${kua.unfavorableDirections.join("、")}。${kua.note}`
      : "生年・性別が揃っていないため、個人化は行わず一般的な住環境の説明に限定する。";

    const report = await generateFloorPlanReport({
      bytes,
      mediaType,
      propertyName,
      personalization,
      northOverride,
    });

    return NextResponse.json(
      {
        report,
        kua,
        northSource: northOverride === "auto" ? "ai" : "manual",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof Error && /画像|生年/.test(error.message)) {
      return errorResponse(error.message, 400);
    }
    if (error instanceof OpenAIRequestError) {
      console.error("OpenAI API error", {
        status: error.status,
      });
      return errorResponse("AIによる解析を完了できませんでした。時間をおいて再度お試しください。", 502);
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      console.error("Invalid AI response shape");
      return errorResponse("解析結果の形式を確認できませんでした。もう一度お試しください。", 502);
    }

    console.error("Unexpected analysis error", error instanceof Error ? error.name : "unknown");
    return errorResponse("予期しないエラーが発生しました。時間をおいて再度お試しください。", 500);
  }
}
