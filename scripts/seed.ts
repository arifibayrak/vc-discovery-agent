/**
 * Seed script for VC Discovery Agent.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * environment variables to be set (or loaded from .env.local).
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

async function seed() {
  console.log("Seeding database...\n");

  // --- Submission 1: Complete flow ---
  const { data: sub1, error: sub1Err } = await db
    .from("submissions")
    .insert({
      company_name: "DataFlow AI",
      contact_email: "alex@dataflow.ai",
      contact_name: "Alex Chen",
      status: "completed",
    })
    .select()
    .single();

  if (sub1Err) throw sub1Err;
  console.log(`Created submission: ${sub1.company_name} (${sub1.id})`);

  // File metadata (no actual storage file)
  const { data: file1 } = await db
    .from("uploaded_files")
    .insert({
      submission_id: sub1.id,
      file_type: "pitch_deck",
      file_name: "DataFlow_AI_Pitch_Deck.pdf",
      mime_type: "application/pdf",
      size_bytes: 2_400_000,
      storage_path: `${sub1.id}/pitch-deck.pdf`,
    })
    .select()
    .single();

  console.log(`  Added file: ${file1!.file_name}`);

  // Extracted data
  const { data: ext1 } = await db
    .from("extracted_data")
    .insert({
      submission_id: sub1.id,
      file_id: file1!.id,
      status: "completed",
      industry: "SaaS / Enterprise Software",
      stage: "Series A",
      funding_ask_usd: 5_000_000,
      revenue_annual_usd: 1_200_000,
      burn_rate_monthly_usd: 150_000,
      team_size: 18,
      founded_year: 2022,
      location: "San Francisco, CA",
      problem_statement:
        "Mid-market companies waste 30% of engineering time on manual data pipeline maintenance.",
      solution_description:
        "AI-powered data pipeline orchestration that auto-heals broken pipelines in real-time.",
      target_market: "Mid-market SaaS companies with 50-500 employees, TAM $8B.",
      business_model: "Usage-based SaaS with platform fee. ACV $48K/year.",
      traction_summary:
        "42 paying customers, 180% NRR, 3 Fortune 500 logos.",
      competitive_landscape:
        "Fivetran, Airbyte, dbt. Differentiated by AI auto-healing.",
      use_of_funds: "40% engineering, 30% sales, 20% infra, 10% ops.",
      raw_extraction: { source: "seed" },
      extracted_at: new Date().toISOString(),
    })
    .select()
    .single();

  console.log(`  Added extraction (status: completed)`);

  // Validation results
  const validationRows = [
    { field_name: "industry", rule_name: "required", passed: true, message: "Industry is provided.", severity: "error" },
    { field_name: "stage", rule_name: "required", passed: true, message: "Stage is provided.", severity: "error" },
    { field_name: "funding_ask_usd", rule_name: "required", passed: true, message: "Funding ask is provided.", severity: "error" },
    { field_name: "funding_ask_usd", rule_name: "reasonable_range", passed: true, message: "Funding ask of $5.0M is within a reasonable range.", severity: "warning" },
    { field_name: "funding_ask_usd", rule_name: "runway_check", passed: true, message: "Funding provides ~33 months of runway at current burn.", severity: "info" },
    { field_name: "stage", rule_name: "recognized_stage", passed: true, message: 'Stage "Series A" is recognized.', severity: "warning" },
  ].map((r) => ({
    ...r,
    submission_id: sub1.id,
    extracted_data_id: ext1!.id,
  }));

  await db.from("validation_results").insert(validationRows);
  console.log(`  Added ${validationRows.length} validation results`);

  // Summary
  await db.from("investor_summaries").insert({
    submission_id: sub1.id,
    executive_summary:
      "Series A SaaS / enterprise software company based in San Francisco, CA seeking $5.0M in funding. " +
      "Mid-market companies waste 30% of engineering time on manual data pipeline maintenance. " +
      "AI-powered data pipeline orchestration that auto-heals broken pipelines in real-time. " +
      "Traction: 42 paying customers, 180% NRR, 3 Fortune 500 logos.",
    strengths: [
      "Comprehensive data provided across key dimensions.",
      "All critical validation checks passed.",
      "Generating $1.2M in annual revenue.",
      "Strong runway of ~33 months at current burn rate.",
      "Demonstrates measurable traction with supporting data.",
    ],
    risks: [],
    key_metrics: {
      data_completeness: "100%",
      validation_errors: 0,
      validation_warnings: 0,
      annual_revenue: "$1.2M",
      projected_runway_months: 33,
      funding_ask: "$5.0M",
      monthly_burn: "$150K",
      team_size: 18,
      overall_score: 85,
      stage: "Series A",
      industry: "SaaS / Enterprise Software",
      location: "San Francisco, CA",
    },
    recommendation:
      "STRONG INTEREST - This submission demonstrates strong fundamentals across key dimensions. Recommend scheduling a partner meeting.",
    score: 85,
  });
  console.log(`  Added investor summary (score: 85)`);

  // --- Submission 2: Pending follow-ups ---
  const { data: sub2, error: sub2Err } = await db
    .from("submissions")
    .insert({
      company_name: "GreenLeaf Health",
      contact_email: "priya@greenleaf.health",
      contact_name: "Priya Sharma",
      status: "follow_up_pending",
    })
    .select()
    .single();

  if (sub2Err) throw sub2Err;
  console.log(`\nCreated submission: ${sub2.company_name} (${sub2.id})`);

  await db.from("uploaded_files").insert({
    submission_id: sub2.id,
    file_type: "pitch_deck",
    file_name: "GreenLeaf_Seed_Deck.pptx",
    mime_type:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    size_bytes: 5_100_000,
    storage_path: `${sub2.id}/seed-deck.pptx`,
  });

  const { data: ext2 } = await db
    .from("extracted_data")
    .insert({
      submission_id: sub2.id,
      status: "completed",
      industry: "HealthTech",
      stage: "Seed",
      funding_ask_usd: 2_000_000,
      revenue_annual_usd: null,
      burn_rate_monthly_usd: 80_000,
      team_size: 6,
      founded_year: 2024,
      location: "Boston, MA",
      problem_statement:
        "Chronic disease patients struggle with medication adherence, leading to $300B in avoidable healthcare costs.",
      solution_description: null,
      target_market: null,
      business_model: null,
      traction_summary: null,
      competitive_landscape: null,
      use_of_funds: null,
      raw_extraction: { source: "seed" },
      extracted_at: new Date().toISOString(),
    })
    .select()
    .single();

  console.log(`  Added extraction with gaps`);

  // Follow-up questions
  await db.from("follow_up_questions").insert([
    {
      submission_id: sub2.id,
      question:
        "How does your product or service solve this problem? What makes your approach unique?",
      context:
        "The solution description helps investors understand your value proposition and differentiation.",
      field_name: "solution_description",
      status: "pending",
    },
    {
      submission_id: sub2.id,
      question:
        "Who is your target customer? Please describe your TAM, SAM, and SOM if available.",
      context: "Market sizing validates the revenue potential and growth ceiling.",
      field_name: "target_market",
      status: "pending",
    },
    {
      submission_id: sub2.id,
      question:
        "How does your company generate revenue? Describe your pricing model and unit economics.",
      context:
        "Business model clarity is essential for projecting path to profitability.",
      field_name: "business_model",
      status: "pending",
    },
  ]);
  console.log(`  Added 3 follow-up questions`);

  // --- Submission 3: Draft ---
  const { data: sub3 } = await db
    .from("submissions")
    .insert({
      company_name: "NeuralShip Logistics",
      contact_email: "jordan@neuralship.io",
      contact_name: "Jordan Williams",
      status: "draft",
    })
    .select()
    .single();

  console.log(`\nCreated submission: ${sub3!.company_name} (${sub3!.id})`);

  console.log("\nSeed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
