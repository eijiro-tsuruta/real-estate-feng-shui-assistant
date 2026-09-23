import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { recordLineEvent } from "@/lib/db/line-event-repository";
import {
  clearLineMenuSelection,
  getLineMenuSession,
  saveLineIntakeAsset,
  selectLineMenu,
  updateLineMenuStep,
} from "@/lib/db/line-menu-repository";
import {
  getLinePhotoChangeOptions,
  getOrCreateLinePhotoCase,
  retractLinePhotoDirection,
  retractLatestLinePhoto,
  saveLinePhotoAsset,
  updateLineEventStatus,
} from "@/lib/db/line-photo-repository";
import {
  fetchLineImage,
  replyLineMenu,
  replyLinePhotoChangeMenu,
  replyLinePhotoCompletion,
  replyLineRoomTypeMenu,
  replyLineText,
} from "@/lib/line/client";
import {
  formatLineBuildingAdvice,
  generateLineBuildingAdvice,
} from "@/lib/line/building-advice";
import {
  buildLineIntakeObjectKey,
  buildMenuSelectionMessage,
  isLineMenuOpenPostback,
  isLineMenuCommand,
  isRoomAdvicePostback,
  parsePhotoChangePostback,
  parseLineMenuPostback,
  parseRoomTypePostback,
  roomTypeLabel,
  type LineIntakeAssetKind,
} from "@/lib/line/menu";
import {
  buildLinePhotoObjectKey,
  buildPhotoReceiptMessage,
  buildPhotoRetakeMessage,
  directionFromCaseStatus,
  isPhotoRetakeCommand,
} from "@/lib/line/photo-flow";
import {
  formatLineRoomAdvice,
  generateLineRoomAdvice,
} from "@/lib/line/room-advice";
import {
  getLineEventMetadata,
  isLineImageUploadMessage,
  MAX_LINE_WEBHOOK_BYTES,
  parseLineWebhookBody,
  sha256Text,
  verifyLineWebhookSignature,
} from "@/lib/line/webhook";
import { deletePrivateObject, putPrivateObject } from "@/lib/object-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function jsonResponse(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

const directionLabels = {
  north: "北側",
  east: "東側",
  south: "南側",
  west: "西側",
} as const;

export async function POST(request: Request) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    return jsonResponse({ error: "LINE webhook is not configured." }, 503);
  }

  const signature = request.headers.get("x-line-signature");
  if (!signature) {
    return jsonResponse({ error: "Missing LINE signature." }, 401);
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_LINE_WEBHOOK_BYTES
  ) {
    return jsonResponse({ error: "Webhook payload is too large." }, 413);
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_LINE_WEBHOOK_BYTES) {
    return jsonResponse({ error: "Webhook payload is too large." }, 413);
  }

  if (
    !verifyLineWebhookSignature({
      rawBody,
      channelSecret,
      signature,
    })
  ) {
    return jsonResponse({ error: "Invalid LINE signature." }, 401);
  }

  try {
    const webhook = parseLineWebhookBody(rawBody);
    const payloadSha256 = sha256Text(rawBody);

    for (const event of webhook.events) {
      const recorded = await recordLineEvent({
        ...getLineEventMetadata(event),
        payloadSha256,
      });
      if (recorded === "duplicate") continue;

      const text =
        event.type === "message" &&
        event.message?.type === "text" &&
        typeof event.message.text === "string"
          ? event.message.text
          : null;

      if (
        event.type === "follow" &&
        event.source?.userId &&
        event.replyToken
      ) {
        await updateLineEventStatus({
          eventId: event.webhookEventId,
          status: "processed",
        });
        try {
          await replyLineMenu(event.replyToken);
        } catch {
          console.error("Failed to send LINE menu after follow");
        }
        continue;
      }

      if (
        text &&
        isLineMenuCommand(text) &&
        event.replyToken &&
        event.source?.userId
      ) {
        await clearLineMenuSelection(event.source.userId);
        await updateLineEventStatus({
          eventId: event.webhookEventId,
          status: "processed",
        });
        try {
          await replyLineMenu(event.replyToken);
        } catch {
          console.error("Failed to send LINE menu");
        }
        continue;
      }

      if (
        event.type === "postback" &&
        isLineMenuOpenPostback(event.postback?.data) &&
        event.source?.userId &&
        event.replyToken
      ) {
        await clearLineMenuSelection(event.source.userId);
        await updateLineEventStatus({
          eventId: event.webhookEventId,
          status: "processed",
        });
        try {
          await replyLineMenu(event.replyToken);
        } catch {
          console.error("Failed to reopen LINE menu");
        }
        continue;
      }

      if (
        event.type === "postback" &&
        isRoomAdvicePostback(event.postback?.data) &&
        event.source?.userId &&
        event.replyToken
      ) {
        await updateLineEventStatus({
          eventId: event.webhookEventId,
          status: "processing",
        });
        try {
          const session = await getLineMenuSession(event.source.userId);
          if (
            session?.selection !== "room_feng_shui" ||
            session.step !== "complete" ||
            !session.roomType
          ) {
            throw new Error("Room advice session is incomplete.");
          }
          const generated = await generateLineRoomAdvice(event.source.userId);
          await updateLineEventStatus({
            eventId: event.webhookEventId,
            status: "processed",
            caseId: generated.caseId,
          });
          try {
            await replyLineText(
              event.replyToken,
              formatLineRoomAdvice(
                roomTypeLabel(session.roomType),
                generated.advice,
              ),
            );
          } catch {
            console.error("Failed to send LINE room advice");
          }
        } catch (error) {
          await updateLineEventStatus({
            eventId: event.webhookEventId,
            status: "error",
            errorCode: "room_advice_failed",
          });
          try {
            await replyLineText(
              event.replyToken,
              "お部屋のアドバイスを作成できませんでした。時間をおいて、もう一度お試しください。",
            );
          } catch {
            console.error("Failed to send LINE room advice error");
          }
          console.error("Failed to generate LINE room advice", {
            error: error instanceof Error ? error.name : "UnknownError",
          });
        }
        continue;
      }

      const photoChange = parsePhotoChangePostback(event.postback?.data);
      if (
        event.type === "postback" &&
        photoChange &&
        event.source?.userId &&
        event.replyToken
      ) {
        await updateLineEventStatus({
          eventId: event.webhookEventId,
          status: "processing",
        });
        try {
          if (photoChange === "start") {
            const directions = await getLinePhotoChangeOptions(
              event.source.userId,
            );
            await updateLineEventStatus({
              eventId: event.webhookEventId,
              status: "processed",
            });
            try {
              if (directions.length > 0) {
                await replyLinePhotoChangeMenu(event.replyToken, directions);
              } else {
                await replyLineText(
                  event.replyToken,
                  "変更できるお部屋の写真がありません。",
                );
              }
            } catch {
              console.error("Failed to send LINE photo change menu");
            }
          } else {
            const retracted = await retractLinePhotoDirection(
              event.source.userId,
              photoChange,
            );
            if (retracted) {
              const activeSession = await getLineMenuSession(
                event.source.userId,
              );
              if (activeSession?.selection === "room_feng_shui") {
                await updateLineMenuStep({
                  lineUserId: event.source.userId,
                  step: "awaiting_room_photo",
                });
              }
              try {
                await deletePrivateObject(retracted.objectKey);
              } catch {
                console.error("Failed to delete selected LINE image object");
              }
              await updateLineEventStatus({
                eventId: event.webhookEventId,
                status: "processed",
                caseId: retracted.caseId,
              });
              try {
                await replyLineText(
                  event.replyToken,
                  buildPhotoRetakeMessage(retracted.direction),
                );
              } catch {
                console.error("Failed to send selected LINE retake receipt");
              }
            } else {
              await updateLineEventStatus({
                eventId: event.webhookEventId,
                status: "processed",
              });
              try {
                await replyLineText(
                  event.replyToken,
                  "選択した写真は変更できません。もう一度メニューから選んでください。",
                );
              } catch {
                console.error("Failed to send unavailable photo reply");
              }
            }
          }
        } catch (error) {
          await updateLineEventStatus({
            eventId: event.webhookEventId,
            status: "error",
            errorCode: "photo_change_failed",
          });
          console.error("Failed to change selected LINE photo", {
            error: error instanceof Error ? error.name : "UnknownError",
          });
        }
        continue;
      }

      const menuSelection = parseLineMenuPostback(event.postback?.data);
      if (
        event.type === "postback" &&
        menuSelection &&
        event.source?.userId &&
        event.replyToken
      ) {
        await updateLineEventStatus({
          eventId: event.webhookEventId,
          status: "processing",
        });
        try {
          await selectLineMenu(event.source.userId, menuSelection);
          const reply = buildMenuSelectionMessage(menuSelection);
          if (menuSelection === "room_feng_shui") {
            await updateLineEventStatus({
              eventId: event.webhookEventId,
              status: "processed",
            });
            try {
              await replyLineRoomTypeMenu(event.replyToken);
            } catch {
              console.error("Failed to send LINE room type menu");
            }
            continue;
          }
          await updateLineEventStatus({
            eventId: event.webhookEventId,
            status: "processed",
          });
          try {
            await replyLineText(event.replyToken, reply);
          } catch {
            console.error("Failed to send LINE menu selection reply");
          }
        } catch (error) {
          await updateLineEventStatus({
            eventId: event.webhookEventId,
            status: "error",
            errorCode: "menu_selection_failed",
          });
          console.error("Failed to select LINE menu", {
            error: error instanceof Error ? error.name : "UnknownError",
          });
        }
        continue;
      }

      const session = event.source?.userId
        ? await getLineMenuSession(event.source.userId)
        : null;

      const selectedRoomType = parseRoomTypePostback(event.postback?.data);
      if (
        event.type === "postback" &&
        selectedRoomType &&
        session?.selection === "room_feng_shui" &&
        event.source?.userId &&
        event.replyToken
      ) {
        await updateLineEventStatus({
          eventId: event.webhookEventId,
          status: "processing",
        });
        try {
          await updateLineMenuStep({
            lineUserId: event.source.userId,
            step: "awaiting_room_photo",
            roomType: selectedRoomType,
          });
          const active = await getOrCreateLinePhotoCase(event.source.userId);
          await updateLineEventStatus({
            eventId: event.webhookEventId,
            status: "processed",
            caseId: active.professionalCase.id,
          });
          try {
            await replyLineText(
              event.replyToken,
              `${roomTypeLabel(selectedRoomType)}を診断します。\n部屋の中央付近から、${directionLabels[active.direction]}の壁・窓が入るように撮影してアップしてください。`,
            );
          } catch {
            console.error("Failed to send LINE room photo instructions");
          }
        } catch (error) {
          await updateLineEventStatus({
            eventId: event.webhookEventId,
            status: "error",
            errorCode: "room_type_failed",
          });
          console.error("Failed to select LINE room type", {
            error: error instanceof Error ? error.name : "UnknownError",
          });
        }
        continue;
      }

      if (text && !session && event.replyToken) {
        await updateLineEventStatus({
          eventId: event.webhookEventId,
          status: "processed",
        });
        try {
          await replyLineMenu(event.replyToken);
        } catch {
          console.error("Failed to send LINE initial menu");
        }
        continue;
      }

      if (
        text &&
        !isPhotoRetakeCommand(text) &&
        session?.selection === "wall_image" &&
        session.step === "awaiting_wall_style" &&
        event.replyToken &&
        event.source?.userId
      ) {
        await updateLineEventStatus({
          eventId: event.webhookEventId,
          status: "processing",
        });
        try {
          await updateLineMenuStep({
            lineUserId: event.source.userId,
            step: "complete",
            wallStyle: text.normalize("NFKC").trim().slice(0, 1000),
          });
          await updateLineEventStatus({
            eventId: event.webhookEventId,
            status: "processed",
          });
          try {
            await replyLineText(
              event.replyToken,
              "ご希望の色・雰囲気を受け付けました。壁のイメージ作成に使用します。",
            );
          } catch {
            console.error("Failed to send LINE wall style receipt");
          }
        } catch (error) {
          await updateLineEventStatus({
            eventId: event.webhookEventId,
            status: "error",
            errorCode: "wall_style_failed",
          });
          console.error("Failed to save LINE wall style", {
            error: error instanceof Error ? error.name : "UnknownError",
          });
        }
        continue;
      }

      const isRetake =
        text !== null && isPhotoRetakeCommand(text);

      if (
        isRetake &&
        session &&
        session.selection !== "room_feng_shui" &&
        event.source?.userId &&
        event.replyToken
      ) {
        const step =
          session.selection === "building_feng_shui"
            ? "awaiting_floorplan"
            : "awaiting_wall_photo";
        await updateLineEventStatus({
          eventId: event.webhookEventId,
          status: "processing",
        });
        try {
          await updateLineMenuStep({
            lineUserId: event.source.userId,
            step,
            wallStyle: null,
          });
          await updateLineEventStatus({
            eventId: event.webhookEventId,
            status: "processed",
          });
          try {
            await replyLineText(
              event.replyToken,
              session.selection === "building_feng_shui"
                ? "間取り図をもう一度アップしてください。"
                : "イメージを変更したい壁の写真をもう一度アップしてください。",
            );
          } catch {
            console.error("Failed to send LINE intake retake reply");
          }
        } catch (error) {
          await updateLineEventStatus({
            eventId: event.webhookEventId,
            status: "error",
            errorCode: "intake_retake_failed",
          });
          console.error("Failed to reset LINE intake", {
            error: error instanceof Error ? error.name : "UnknownError",
          });
        }
        continue;
      }

      if (
        isRetake &&
        event.source?.userId &&
        event.replyToken
      ) {
        await updateLineEventStatus({
          eventId: event.webhookEventId,
          status: "processing",
        });
        try {
          const retracted = await retractLatestLinePhoto(event.source.userId);
          if (retracted) {
            if (session?.selection === "room_feng_shui") {
              await updateLineMenuStep({
                lineUserId: event.source.userId,
                step: "awaiting_room_photo",
              });
            }
            try {
              await deletePrivateObject(retracted.objectKey);
            } catch {
              console.error("Failed to delete retracted LINE image object");
            }
            await updateLineEventStatus({
              eventId: event.webhookEventId,
              status: "processed",
              caseId: retracted.caseId,
            });
            try {
              await replyLineText(
                event.replyToken,
                buildPhotoRetakeMessage(retracted.direction),
              );
            } catch {
              console.error("Failed to send LINE retake receipt");
            }
          } else {
            await updateLineEventStatus({
              eventId: event.webhookEventId,
              status: "processed",
            });
            try {
              await replyLineText(
                event.replyToken,
                "撮り直せる写真がありません。案内されている方角の写真を送ってください。",
              );
            } catch {
              console.error("Failed to send LINE no-retake reply");
            }
          }
        } catch (error) {
          await updateLineEventStatus({
            eventId: event.webhookEventId,
            status: "error",
            errorCode: "photo_retake_failed",
          });
          try {
            await replyLineText(
              event.replyToken,
              "撮り直し処理を完了できませんでした。少し時間をおいて、もう一度「撮り直し」と送ってください。",
            );
          } catch {
            console.error("Failed to send LINE retake error reply");
          }
          console.error("Failed to retract LINE image", {
            error: error instanceof Error ? error.name : "UnknownError",
          });
        }
        continue;
      }

      const uploadMessage = event.message;
      if (
        event.type !== "message" ||
        !uploadMessage ||
        !isLineImageUploadMessage(uploadMessage.type) ||
        !uploadMessage.id ||
        !event.source?.userId ||
        !event.replyToken
      ) {
        await updateLineEventStatus({
          eventId: event.webhookEventId,
          status: "ignored",
        });
        continue;
      }

      if (!session) {
        await updateLineEventStatus({
          eventId: event.webhookEventId,
          status: "ignored",
        });
        try {
          await replyLineMenu(event.replyToken);
        } catch {
          console.error("Failed to send LINE menu before image intake");
        }
        continue;
      }

      if (
        session.selection === "room_feng_shui" &&
        session.step !== "awaiting_room_photo"
      ) {
        await updateLineEventStatus({
          eventId: event.webhookEventId,
          status: "processed",
        });
        try {
          await replyLineRoomTypeMenu(event.replyToken);
        } catch {
          console.error("Failed to request LINE room type before photos");
        }
        continue;
      }

      await updateLineEventStatus({
        eventId: event.webhookEventId,
        status: "processing",
      });

      let objectKey: string | undefined;
      let photoSaved = false;
      try {
        const image = await fetchLineImage(uploadMessage.id);
        if (
          session.selection === "building_feng_shui" ||
          session.selection === "wall_image"
        ) {
          const kind: LineIntakeAssetKind =
            session.selection === "building_feng_shui"
              ? "floorplan"
              : session.step === "awaiting_wall_style"
                ? "wallpaper"
                : "wall";
          const assetId = randomUUID();
          objectKey = buildLineIntakeObjectKey({
            lineUserId: event.source.userId,
            kind,
            assetId,
            mediaType: image.mediaType,
          });
          await putPrivateObject({
            key: objectKey,
            bytes: image.bytes,
            contentType: image.mediaType,
          });
          const { previousObjectKey } = await saveLineIntakeAsset({
            id: assetId,
            lineUserId: event.source.userId,
            kind,
            objectKey,
            mediaType: image.mediaType,
            byteSize: image.bytes.byteLength,
            sha256: createHash("sha256").update(image.bytes).digest("hex"),
          });
          photoSaved = true;
          if (previousObjectKey && previousObjectKey !== objectKey) {
            try {
              await deletePrivateObject(previousObjectKey);
            } catch {
              console.error("Failed to delete replaced LINE intake image");
            }
          }
          const nextStep =
            kind === "wall" ? "awaiting_wall_style" : "complete";
          await updateLineMenuStep({
            lineUserId: event.source.userId,
            step: nextStep,
          });
          if (kind === "floorplan") {
            try {
              const report = await generateLineBuildingAdvice(image);
              await updateLineEventStatus({
                eventId: event.webhookEventId,
                status: "processed",
              });
              try {
                await replyLineText(
                  event.replyToken,
                  formatLineBuildingAdvice(report),
                );
              } catch {
                console.error("Failed to send LINE building advice");
              }
            } catch (error) {
              await updateLineEventStatus({
                eventId: event.webhookEventId,
                status: "error",
                errorCode: "building_advice_failed",
              });
              try {
                await replyLineText(
                  event.replyToken,
                  "間取り図は保存しましたが、診断を完了できませんでした。同じ間取り図をもう一度送ってください。",
                );
              } catch {
                console.error("Failed to send LINE building advice error");
              }
              console.error("Failed to generate LINE building advice", {
                error: error instanceof Error ? error.name : "UnknownError",
              });
            }
            continue;
          }
          await updateLineEventStatus({
            eventId: event.webhookEventId,
            status: "processed",
          });
          const reply =
            kind === "wallpaper"
                ? "壁紙の画像を安全に保存しました。壁のイメージ作成に使用します。"
                : "壁の写真を安全に保存しました。\n使いたい壁紙があれば画像をアップしてください。壁紙がなければ、希望する色や雰囲気を文章で送ってください。";
          try {
            await replyLineText(event.replyToken, reply);
          } catch {
            console.error("Failed to send LINE intake receipt");
          }
          continue;
        }

        const { customerId, direction, professionalCase } =
          await getOrCreateLinePhotoCase(event.source.userId);
        const assetId = randomUUID();
        objectKey = buildLinePhotoObjectKey({
          lineUserId: event.source.userId,
          caseId: professionalCase.id,
          direction,
          assetId,
          mediaType: image.mediaType,
        });
        await putPrivateObject({
          key: objectKey,
          bytes: image.bytes,
          contentType: image.mediaType,
        });
        const nextCase = await saveLinePhotoAsset({
          assetId,
          objectKey,
          mediaType: image.mediaType,
          byteSize: image.bytes.byteLength,
          sha256: createHash("sha256").update(image.bytes).digest("hex"),
          customerId,
          direction,
          professionalCase,
        });
        if (nextCase.status === "professional_review") {
          await updateLineMenuStep({
            lineUserId: event.source.userId,
            step: "complete",
          });
        }
        await updateLineEventStatus({
          eventId: event.webhookEventId,
          status: "processed",
          caseId: professionalCase.id,
        });
        photoSaved = true;
        try {
          const nextDirection = directionFromCaseStatus(nextCase.status);
          const receipt = buildPhotoReceiptMessage(direction, nextDirection);
          if (nextCase.status === "professional_review") {
            await replyLinePhotoCompletion(event.replyToken, receipt);
          } else {
            await replyLineText(event.replyToken, receipt);
          }
        } catch (error) {
          console.error("Failed to send LINE photo receipt", {
            error: error instanceof Error ? error.name : "UnknownError",
          });
        }
      } catch (error) {
        if (objectKey && !photoSaved) {
          try {
            await deletePrivateObject(objectKey);
          } catch {
            console.error("Failed to roll back LINE image object");
          }
        }
        await updateLineEventStatus({
          eventId: event.webhookEventId,
          status: "error",
          errorCode:
            error instanceof Error && /4MB/.test(error.message)
              ? "image_too_large"
              : "image_processing_failed",
        });
        try {
          const reply =
            error instanceof Error && /4MB/.test(error.message)
              ? "画像サイズは4MB以下にしてください。"
              : error instanceof Error && /JPEG、PNG、WebP/.test(error.message)
                ? session.selection === "building_feng_shui"
                  ? "間取り図はJPEG、PNG、WebP形式で送ってください。PDFには現在対応していません。"
                  : "画像はJPEG、PNG、WebP形式で送ってください。PDFには現在対応していません。"
                : "画像を処理できませんでした。JPEG、PNG、WebP形式で、もう一度送ってください。";
          await replyLineText(event.replyToken, reply);
        } catch {
          console.error("Failed to send LINE image processing error reply");
        }
        console.error("Failed to process LINE image event", {
          error: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return jsonResponse({ error: "Invalid LINE webhook payload." }, 400);
    }

    console.error("Failed to persist LINE webhook event", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonResponse({ error: "Webhook processing failed." }, 500);
  }
}
