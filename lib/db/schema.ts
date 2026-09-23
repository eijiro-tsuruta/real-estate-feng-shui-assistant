import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  Offering,
  PhotoDirection,
  ProfessionalCase,
} from "../professional-case";

type DiagnosisTheme = ProfessionalCase["themes"][number];
type FloorPlanPolicy = ProfessionalCase["floorPlanPolicy"];
type CaseStatus = ProfessionalCase["status"];

export const professionals = pgTable("professionals", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  brandName: text("brand_name"),
  lineChannelId: text("line_channel_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const customers = pgTable(
  "customers",
  {
    id: text("id").primaryKey(),
    lineUserId: text("line_user_id").notNull(),
    displayName: text("display_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("customers_line_user_id_unique").on(table.lineUserId)],
);

export const lineMenuSessions = pgTable(
  "line_menu_sessions",
  {
    customerId: text("customer_id")
      .primaryKey()
      .references(() => customers.id, { onDelete: "cascade" }),
    selection: text("selection").notNull(),
    step: text("step").notNull(),
    wallStyle: text("wall_style"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "line_menu_sessions_selection_check",
      sql`${table.selection} in ('building_feng_shui', 'room_feng_shui', 'wall_image')`,
    ),
    check(
      "line_menu_sessions_step_check",
      sql`${table.step} in ('awaiting_floorplan', 'awaiting_room_photo', 'awaiting_wall_photo', 'awaiting_wall_style', 'complete')`,
    ),
  ],
);

export const lineIntakeAssets = pgTable(
  "line_intake_assets",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    objectKey: text("object_key").notNull(),
    mediaType: text("media_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    sha256: text("sha256").notNull(),
    retainedUntil: timestamp("retained_until", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("line_intake_assets_customer_kind_unique").on(
      table.customerId,
      table.kind,
    ),
    uniqueIndex("line_intake_assets_object_key_unique").on(table.objectKey),
    index("line_intake_assets_retention_idx").on(table.retainedUntil),
    check(
      "line_intake_assets_kind_check",
      sql`${table.kind} in ('floorplan', 'wall', 'wallpaper')`,
    ),
    check("line_intake_assets_byte_size_check", sql`${table.byteSize} > 0`),
    check(
      "line_intake_assets_sha256_check",
      sql`length(${table.sha256}) = 64`,
    ),
  ],
);

export const cases = pgTable(
  "cases",
  {
    id: text("id").primaryKey(),
    professionalId: text("professional_id")
      .notNull()
      .references(() => professionals.id),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    offering: text("offering").$type<Offering>().notNull(),
    floorPlanPolicy: text("floor_plan_policy")
      .$type<FloorPlanPolicy>()
      .notNull(),
    themes: jsonb("themes").$type<DiagnosisTheme[]>().notNull(),
    status: text("status").$type<CaseStatus>().notNull(),
    pendingDirection: text("pending_direction").$type<PhotoDirection>(),
    pendingQuestionIds: jsonb("pending_question_ids")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  },
  (table) => [
    index("cases_professional_status_idx").on(
      table.professionalId,
      table.status,
    ),
    index("cases_customer_created_idx").on(table.customerId, table.createdAt),
    check(
      "cases_offering_check",
      sql`${table.offering} in ('real_estate', 'custom_home', 'renovation', 'professional_reading')`,
    ),
    check(
      "cases_floor_plan_policy_check",
      sql`${table.floorPlanPolicy} in ('required', 'optional')`,
    ),
    check(
      "cases_status_check",
      sql`${table.status} in ('awaiting_floorplan', 'floorplan_review', 'awaiting_north_photo', 'awaiting_east_photo', 'awaiting_south_photo', 'awaiting_west_photo', 'awaiting_answers', 'professional_review', 'delivered')`,
    ),
    check(
      "cases_pending_direction_check",
      sql`${table.pendingDirection} is null or ${table.pendingDirection} in ('north', 'east', 'south', 'west')`,
    ),
    check(
      "cases_pending_answer_state_check",
      sql`(${table.status} = 'awaiting_answers' and ${table.pendingDirection} is not null and jsonb_array_length(${table.pendingQuestionIds}) > 0) or (${table.status} <> 'awaiting_answers' and ${table.pendingDirection} is null and jsonb_array_length(${table.pendingQuestionIds}) = 0)`,
    ),
    check(
      "cases_themes_check",
      sql`jsonb_typeof(${table.themes}) = 'array' and jsonb_array_length(${table.themes}) between 1 and 3`,
    ),
  ],
);

export const caseAssets = pgTable(
  "case_assets",
  {
    id: text("id").primaryKey(),
    caseId: text("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    objectKey: text("object_key").notNull(),
    mediaType: text("media_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    sha256: text("sha256").notNull(),
    retainedUntil: timestamp("retained_until", { withTimezone: true }).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("case_assets_case_kind_unique").on(table.caseId, table.kind),
    uniqueIndex("case_assets_object_key_unique").on(table.objectKey),
    index("case_assets_retention_idx").on(table.retainedUntil),
    check(
      "case_assets_kind_check",
      sql`${table.kind} in ('floorplan', 'north', 'east', 'south', 'west')`,
    ),
    check("case_assets_byte_size_check", sql`${table.byteSize} > 0`),
    check("case_assets_sha256_check", sql`length(${table.sha256}) = 64`),
  ],
);

export const aiGenerations = pgTable(
  "ai_generations",
  {
    id: text("id").primaryKey(),
    caseId: text("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    assetId: text("asset_id").references(() => caseAssets.id, {
      onDelete: "set null",
    }),
    kind: text("kind").notNull(),
    direction: text("direction").$type<PhotoDirection>(),
    phase: text("phase"),
    status: text("status").notNull().default("pending"),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    inputHash: text("input_hash").notNull(),
    result: jsonb("result").$type<Record<string, unknown>>(),
    tokenUsage: jsonb("token_usage").$type<{
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    }>(),
    estimatedCostMicrousd: bigint("estimated_cost_microusd", {
      mode: "number",
    }),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("ai_generations_case_created_idx").on(table.caseId, table.createdAt),
    index("ai_generations_input_hash_idx").on(table.inputHash),
    check(
      "ai_generations_kind_check",
      sql`${table.kind} in ('floorplan_analysis', 'photo_analysis', 'report')`,
    ),
    check(
      "ai_generations_direction_check",
      sql`${table.direction} is null or ${table.direction} in ('north', 'east', 'south', 'west')`,
    ),
    check(
      "ai_generations_phase_check",
      sql`${table.phase} is null or ${table.phase} in ('draft', 'final')`,
    ),
    check(
      "ai_generations_status_check",
      sql`${table.status} in ('pending', 'complete', 'error')`,
    ),
  ],
);

export const confirmationQuestions = pgTable(
  "confirmation_questions",
  {
    id: text("id").primaryKey(),
    generationId: text("generation_id")
      .notNull()
      .references(() => aiGenerations.id, { onDelete: "cascade" }),
    observationId: text("observation_id").notNull(),
    question: text("question").notNull(),
    reason: text("reason").notNull(),
    answerType: text("answer_type").notNull(),
    choices: jsonb("choices").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    blocksAdvice: boolean("blocks_advice").notNull().default(true),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("confirmation_questions_generation_idx").on(
      table.generationId,
      table.position,
    ),
    check(
      "confirmation_questions_answer_type_check",
      sql`${table.answerType} in ('yes_no', 'single_choice', 'free_text')`,
    ),
    check("confirmation_questions_position_check", sql`${table.position} >= 0`),
  ],
);

export const confirmationAnswers = pgTable(
  "confirmation_answers",
  {
    id: text("id").primaryKey(),
    questionId: text("question_id")
      .notNull()
      .references(() => confirmationQuestions.id, { onDelete: "cascade" }),
    answer: text("answer").notNull(),
    answeredBy: text("answered_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("confirmation_answers_question_unique").on(table.questionId),
    check(
      "confirmation_answers_answered_by_check",
      sql`${table.answeredBy} in ('customer', 'professional')`,
    ),
  ],
);

export const reports = pgTable(
  "reports",
  {
    id: text("id").primaryKey(),
    caseId: text("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    generationId: text("generation_id").references(() => aiGenerations.id, {
      onDelete: "set null",
    }),
    version: integer("version").notNull(),
    content: jsonb("content").$type<Record<string, unknown>>().notNull(),
    approvedByProfessionalId: text("approved_by_professional_id").references(
      () => professionals.id,
    ),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("reports_case_version_unique").on(table.caseId, table.version),
    index("reports_case_created_idx").on(table.caseId, table.createdAt),
    check("reports_version_check", sql`${table.version} > 0`),
  ],
);

export const lineEvents = pgTable(
  "line_events",
  {
    eventId: text("event_id").primaryKey(),
    caseId: text("case_id").references(() => cases.id, {
      onDelete: "set null",
    }),
    lineUserId: text("line_user_id"),
    messageId: text("message_id"),
    eventType: text("event_type").notNull(),
    payloadSha256: text("payload_sha256").notNull(),
    status: text("status").notNull().default("received"),
    errorCode: text("error_code"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    index("line_events_case_received_idx").on(table.caseId, table.receivedAt),
    check(
      "line_events_status_check",
      sql`${table.status} in ('received', 'processing', 'processed', 'ignored', 'error')`,
    ),
    check("line_events_payload_sha256_check", sql`length(${table.payloadSha256}) = 64`),
  ],
);
