CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"excerpt" text,
	"category" text NOT NULL,
	"image_url" text,
	"reading_time" integer DEFAULT 5,
	"featured" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stash_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text,
	"estimated_value" text,
	"condition" text,
	"tags" text[],
	"full_image_url" text,
	"label_image_url" text,
	"ai_analysis" jsonb,
	"seo_title" text,
	"seo_description" text,
	"seo_keywords" text[],
	"published_to_woocommerce" boolean DEFAULT false,
	"published_to_ebay" boolean DEFAULT false,
	"woocommerce_product_id" text,
	"ebay_listing_id" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"gemini_api_key" text,
	"huggingface_api_key" text,
	"preferred_gemini_model" text DEFAULT 'gemini-2.5-flash',
	"preferred_huggingface_model" text,
	"active_ai_provider" text DEFAULT 'gemini',
	"openai_api_key" text,
	"openai_model" text DEFAULT 'gpt-4o',
	"anthropic_api_key" text,
	"anthropic_model" text DEFAULT 'claude-sonnet-4-20250514',
	"custom_ai_endpoint" text,
	"custom_ai_api_key" text,
	"custom_ai_model_name" text,
	"woocommerce_url" text,
	"woocommerce_key" text,
	"woocommerce_secret" text,
	"ebay_token" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stash_items" ADD CONSTRAINT "stash_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;