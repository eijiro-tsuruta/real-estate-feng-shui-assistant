ALTER TABLE "line_menu_sessions" DROP CONSTRAINT "line_menu_sessions_step_check";--> statement-breakpoint
ALTER TABLE "line_menu_sessions" ADD COLUMN "room_type" text;--> statement-breakpoint
UPDATE "line_menu_sessions" SET "step" = 'awaiting_room_type' WHERE "selection" = 'room_feng_shui';--> statement-breakpoint
ALTER TABLE "line_menu_sessions" ADD CONSTRAINT "line_menu_sessions_room_type_check" CHECK ("line_menu_sessions"."room_type" is null or "line_menu_sessions"."room_type" in ('living_room', 'bedroom', 'home_office', 'child_room', 'other'));--> statement-breakpoint
ALTER TABLE "line_menu_sessions" ADD CONSTRAINT "line_menu_sessions_step_check" CHECK ("line_menu_sessions"."step" in ('awaiting_floorplan', 'awaiting_room_type', 'awaiting_room_photo', 'awaiting_wall_photo', 'awaiting_wall_style', 'complete'));
