CREATE TABLE "line_intake_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"kind" text NOT NULL,
	"object_key" text NOT NULL,
	"media_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"sha256" text NOT NULL,
	"retained_until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "line_intake_assets_kind_check" CHECK ("line_intake_assets"."kind" in ('floorplan', 'wall', 'wallpaper')),
	CONSTRAINT "line_intake_assets_byte_size_check" CHECK ("line_intake_assets"."byte_size" > 0),
	CONSTRAINT "line_intake_assets_sha256_check" CHECK (length("line_intake_assets"."sha256") = 64)
);
--> statement-breakpoint
CREATE TABLE "line_menu_sessions" (
	"customer_id" text PRIMARY KEY NOT NULL,
	"selection" text NOT NULL,
	"step" text NOT NULL,
	"wall_style" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "line_menu_sessions_selection_check" CHECK ("line_menu_sessions"."selection" in ('building_feng_shui', 'room_feng_shui', 'wall_image')),
	CONSTRAINT "line_menu_sessions_step_check" CHECK ("line_menu_sessions"."step" in ('awaiting_floorplan', 'awaiting_room_photo', 'awaiting_wall_photo', 'awaiting_wall_style', 'complete'))
);
--> statement-breakpoint
ALTER TABLE "line_intake_assets" ADD CONSTRAINT "line_intake_assets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_menu_sessions" ADD CONSTRAINT "line_menu_sessions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "line_intake_assets_customer_kind_unique" ON "line_intake_assets" USING btree ("customer_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "line_intake_assets_object_key_unique" ON "line_intake_assets" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "line_intake_assets_retention_idx" ON "line_intake_assets" USING btree ("retained_until");