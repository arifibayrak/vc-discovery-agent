import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function setup() {
  const { data, error } = await db.storage.createBucket("submission-files", {
    public: false,
    fileSizeLimit: 50 * 1024 * 1024, // 50MB
  });

  if (error) {
    if (error.message?.includes("already exists")) {
      console.log("Bucket 'submission-files' already exists.");
    } else {
      console.error("Failed to create bucket:", error);
      process.exit(1);
    }
  } else {
    console.log("Created bucket:", data.name);
  }
}

setup();
