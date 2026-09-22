CREATE TABLE "ai_generations" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"asset_id" text,
	"kind" text NOT NULL,
	"direction" text,
	"phase" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"input_hash" text NOT NULL,
	"result" jsonb,
	"token_usage" jsonb,
	"estimated_cost_microusd" bigint,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "ai_generations_kind_check" CHECK ("ai_generations"."kind" in ('floorplan_analysis', 'photo_analysis', 'report')),
	CONSTRAINT "ai_generations_direction_check" CHECK ("ai_generations"."direction" is null or "ai_generations"."direction" in ('north', 'east', 'south', 'west')),
	CONSTRAINT "ai_generations_phase_check" CHECK ("ai_generations"."phase" is null or "ai_generations"."phase" in ('draft', 'final')),
	CONSTRAINT "ai_generations_status_check" CHECK ("ai_generations"."status" in ('pending', 'complete', 'error'))
);
--> statement-breakpoint
CREATE TABLE "case_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"kind" text NOT NULL,
	"object_key" text NOT NULL,
	"media_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"sha256" text NOT NULL,
	"retained_until" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "case_assets_kind_check" CHECK ("case_assets"."kind" in ('floorplan', 'north', 'east', 'south', 'west')),
	CONSTRAINT "case_assets_byte_size_check" CHECK ("case_assets"."byte_size" > 0),
	CONSTRAINT "case_assets_sha256_check" CHECK (length("case_assets"."sha256") = 64)
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" text PRIMARY KEY NOT NULL,
	"professional_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"offering" text NOT NULL,
	"floor_plan_policy" text NOT NULL,
	"themes" jsonb NOT NULL,
	"status" text NOT NULL,
	"pending_direction" text,
	"pending_question_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	CONSTRAINT "cases_offering_check" CHECK ("cases"."offering" in ('real_estate', 'custom_home', 'renovation', 'professional_reading')),
	CONSTRAINT "cases_floor_plan_policy_check" CHECK ("cases"."floor_plan_policy" in ('required', 'optional')),
	CONSTRAINT "cases_status_check" CHECK ("cases"."status" in ('awaiting_floorplan', 'floorplan_review', 'awaiting_north_photo', 'awaiting_east_photo', 'awaiting_south_photo', 'awaiting_west_photo', 'awaiting_answers', 'professional_review', 'delivered')),
	CONSTRAINT "cases_pending_direction_check" CHECK ("cases"."pending_direction" is null or "cases"."pending_direction" in ('north', 'east', 'south', 'west')),
	CONSTRAINT "cases_pending_answer_state_check" CHECK (("cases"."status" = 'awaiting_answers' and "cases"."pending_direction" is not null and jsonb_array_length("cases"."pending_question_ids") > 0) or ("cases"."status" <> 'awaiting_answers' and "cases"."pending_direction" is null and jsonb_array_length("cases"."pending_question_ids") = 0)),
	CONSTRAINT "cases_themes_check" CHECK (jsonb_typeof("cases"."themes") = 'array' and jsonb_array_length("cases"."themes") between 1 and 3)
);
--> statement-breakpoint
CREATE TABLE "confirmation_answers" (
	"id" text PRIMARY KEY NOT NULL,
	"question_id" text NOT NULL,
	"answer" text NOT NULL,
	"answered_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "confirmation_answers_answered_by_check" CHECK ("confirmation_answers"."answered_by" in ('customer', 'professional'))
);
--> statement-breakpoint
CREATE TABLE "confirmation_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"generation_id" text NOT NULL,
	"observation_id" text NOT NULL,
	"question" text NOT NULL,
	"reason" text NOT NULL,
	"answer_type" text NOT NULL,
	"choices" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"blocks_advice" boolean DEFAULT true NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "confirmation_questions_answer_type_check" CHECK ("confirmation_questions"."answer_type" in ('yes_no', 'single_choice', 'free_text')),
	CONSTRAINT "confirmation_questions_position_check" CHECK ("confirmation_questions"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"line_user_id" text NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "line_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"case_id" text,
	"line_user_id" text,
	"message_id" text,
	"event_type" text NOT NULL,
	"payload_sha256" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"error_code" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "line_events_status_check" CHECK ("line_events"."status" in ('received', 'processing', 'processed', 'ignored', 'error')),
	CONSTRAINT "line_events_payload_sha256_check" CHECK (length("line_events"."payload_sha256") = 64)
);
--> statement-breakpoint
CREATE TABLE "professionals" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand_name" text,
	"line_channel_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"generation_id" text,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"approved_by_professional_id" text,
	"approved_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_version_check" CHECK ("reports"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_asset_id_case_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."case_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_assets" ADD CONSTRAINT "case_assets_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirmation_answers" ADD CONSTRAINT "confirmation_answers_question_id_confirmation_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."confirmation_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirmation_questions" ADD CONSTRAINT "confirmation_questions_generation_id_ai_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."ai_generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_events" ADD CONSTRAINT "line_events_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_generation_id_ai_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."ai_generations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_approved_by_professional_id_professionals_id_fk" FOREIGN KEY ("approved_by_professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_generations_case_created_idx" ON "ai_generations" USING btree ("case_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_generations_input_hash_idx" ON "ai_generations" USING btree ("input_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "case_assets_case_kind_unique" ON "case_assets" USING btree ("case_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "case_assets_object_key_unique" ON "case_assets" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "case_assets_retention_idx" ON "case_assets" USING btree ("retained_until");--> statement-breakpoint
CREATE INDEX "cases_professional_status_idx" ON "cases" USING btree ("professional_id","status");--> statement-breakpoint
CREATE INDEX "cases_customer_created_idx" ON "cases" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "confirmation_answers_question_unique" ON "confirmation_answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "confirmation_questions_generation_idx" ON "confirmation_questions" USING btree ("generation_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_line_user_id_unique" ON "customers" USING btree ("line_user_id");--> statement-breakpoint
CREATE INDEX "line_events_case_received_idx" ON "line_events" USING btree ("case_id","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_case_version_unique" ON "reports" USING btree ("case_id","version");--> statement-breakpoint
CREATE INDEX "reports_case_created_idx" ON "reports" USING btree ("case_id","created_at");