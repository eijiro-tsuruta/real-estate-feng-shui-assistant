import { NextResponse } from "next/server";
import { getLineIntakeAssetById } from "@/lib/db/line-menu-repository";
import { getPrivateObject } from "@/lib/object-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new NextResponse(null, { status: 404 });
  }
  const asset = await getLineIntakeAssetById(id);
  if (!asset) return new NextResponse(null, { status: 404 });
  const object = await getPrivateObject(asset.objectKey);
  return new NextResponse(Buffer.from(object.bytes), {
    headers: {
      "Content-Type": asset.mediaType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
