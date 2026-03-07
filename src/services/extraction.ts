import type { ExtractedFields } from "@/schemas/extraction";
import { ClaudeExtractionService } from "./claude-extraction";

/**
 * Interface for document data extraction.
 * Implementations can use OCR, LLM parsing, or other techniques.
 */
export interface ExtractionService {
  /**
   * Extract structured fields from a document buffer.
   * @param fileBuffer - The raw file content
   * @param mimeType - The MIME type of the file
   * @param fileName - Original file name (for context)
   * @returns Extracted fields
   */
  extract(
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string
  ): Promise<ExtractedFields>;
}

/**
 * Mock implementation that returns plausible fake data.
 * Replace with real LLM/OCR-based extraction in production.
 */
export class MockExtractionService implements ExtractionService {
  async extract(
    _fileBuffer: Buffer,
    _mimeType: string,
    fileName: string
  ): Promise<ExtractedFields> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    const isPitchDeck = fileName.toLowerCase().includes("pitch") ||
      fileName.toLowerCase().includes("deck");
    const isFinancial = fileName.toLowerCase().includes("financial") ||
      fileName.toLowerCase().includes("model");

    if (isPitchDeck) {
      return {
        industry: "SaaS / Enterprise Software",
        stage: "Series A",
        funding_ask_usd: 5_000_000,
        revenue_annual_usd: 1_200_000,
        burn_rate_monthly_usd: 150_000,
        team_size: 18,
        founded_year: 2022,
        location: "San Francisco, CA",
        problem_statement:
          "Mid-market companies waste 30% of engineering time on manual data pipeline maintenance, costing the industry $12B annually.",
        solution_description:
          "AI-powered data pipeline orchestration platform that auto-heals broken pipelines and optimizes data flow in real-time.",
        target_market:
          "Mid-market SaaS companies with 50-500 employees, TAM of $8B in North America.",
        business_model:
          "Usage-based SaaS pricing with platform fee. Average contract value of $48K/year.",
        traction_summary:
          "42 paying customers, 180% net revenue retention, 3 enterprise logos (Fortune 500).",
        competitive_landscape:
          "Competitors include Fivetran, Airbyte, and dbt. Differentiated by AI-driven auto-healing and 10x faster setup.",
        use_of_funds:
          "40% engineering (ML team expansion), 30% sales/marketing, 20% infrastructure, 10% operations.",
        website_url: "https://example-dataflow.com",
        is_pitch_deck: true,
        pitch_deck_confidence: 0.95,
        sections_found: ["problem", "solution", "market", "business_model", "traction", "competition", "use_of_funds", "ask"],
      };
    }

    if (isFinancial) {
      return {
        industry: null,
        stage: null,
        funding_ask_usd: 5_000_000,
        revenue_annual_usd: 1_200_000,
        burn_rate_monthly_usd: 150_000,
        team_size: null,
        founded_year: null,
        location: null,
        problem_statement: null,
        solution_description: null,
        target_market: null,
        business_model: null,
        traction_summary: "MRR: $100K, growing 15% MoM. Gross margin: 78%.",
        competitive_landscape: null,
        use_of_funds: null,
        website_url: null,
        is_pitch_deck: false,
        pitch_deck_confidence: 0.1,
        sections_found: ["financials"],
      };
    }

    // Generic extraction for unknown file types
    return {
      industry: "Technology",
      stage: "Seed",
      funding_ask_usd: 2_000_000,
      revenue_annual_usd: null,
      burn_rate_monthly_usd: 80_000,
      team_size: 6,
      founded_year: 2023,
      location: "New York, NY",
      problem_statement: null,
      solution_description: null,
      target_market: null,
      business_model: null,
      traction_summary: null,
      competitive_landscape: null,
      use_of_funds: null,
      website_url: null,
      is_pitch_deck: null,
      pitch_deck_confidence: null,
      sections_found: null,
    };
  }
}

// Singleton for the current extraction service.
// Defaults to Claude-powered extraction when ANTHROPIC_API_KEY is set,
// falls back to mock for local development without an API key.
let _service: ExtractionService = process.env.ANTHROPIC_API_KEY
  ? new ClaudeExtractionService()
  : new MockExtractionService();

export function getExtractionService(): ExtractionService {
  return _service;
}

export function setExtractionService(service: ExtractionService): void {
  _service = service;
}
