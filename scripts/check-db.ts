import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const SID = "dab16eff-f5c4-46ae-a5fd-e55457341181";
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  const { data, error } = await db
    .from("extracted_data")
    .select()
    .eq("submission_id", SID);

  if (error) { console.log("DB ERROR:", error.message); return; }
  if (!data || data.length === 0) { console.log("NO RECORDS - extraction may have failed"); return; }

  const r = data[0];
  const has = (k: string) => Object.prototype.hasOwnProperty.call(r, k);
  console.log("status:", r.status);
  console.log("industry:", r.industry);
  console.log("stage:", r.stage);
  console.log("is_pitch_deck:", has("is_pitch_deck") ? r.is_pitch_deck : "⚠️  COLUMN MISSING - run migration!");
  console.log("website_url:", has("website_url") ? r.website_url : "⚠️  COLUMN MISSING - run migration!");
  console.log("sections_found:", has("sections_found") ? JSON.stringify(r.sections_found) : "⚠️  COLUMN MISSING - run migration!");
  console.log("\nAll DB columns:", Object.keys(r).join(", "));
}

main();
