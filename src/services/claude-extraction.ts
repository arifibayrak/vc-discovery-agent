import type { ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { getClaudeClient } from "@/lib/claude-client";
import { parseDocument } from "@/lib/document-parser";
import { ExtractedFieldsSchema, type ExtractedFields } from "@/schemas/extraction";
import type { ExtractionService } from "./extraction";

const SYSTEM_PROMPT = `You are an expert VC analyst specializing in pitch deck analysis. Your job is to:

1. CLASSIFY whether a document is a real startup pitch deck or not
2. DETECT which standard pitch deck sections are present
3. EXTRACT structured data from the content

You must respond with ONLY valid JSON (no markdown fences, no commentary). The JSON must match this exact schema:

{
  "is_pitch_deck": boolean,
  "pitch_deck_confidence": number (0.0 to 1.0),
  "sections_found": string[] (from: "problem", "solution", "market", "business_model", "traction", "competition", "team", "financials", "use_of_funds", "ask"),
  "industry": string | null,
  "stage": string | null (one of: "Pre-Seed", "Seed", "Series A", "Series B", "Series C", "Series D", "Series E", "Growth", "Late Stage", "Pre-IPO"),
  "funding_ask_usd": integer | null (in USD, convert if needed),
  "revenue_annual_usd": integer | null (annualized, in USD),
  "burn_rate_monthly_usd": integer | null (monthly, in USD),
  "team_size": integer | null,
  "founded_year": integer | null,
  "location": string | null (city, state/country),
  "problem_statement": string | null (2-4 sentences summarizing the problem),
  "solution_description": string | null (2-4 sentences summarizing the solution),
  "target_market": string | null (TAM/SAM/SOM or market description),
  "business_model": string | null (how the company makes money),
  "traction_summary": string | null (key metrics, customers, growth),
  "competitive_landscape": string | null (competitors and differentiation),
  "use_of_funds": string | null (allocation breakdown),
  "website_url": string | null (company website if mentioned)
}

Rules:
- Set is_pitch_deck=false if the document is clearly not a pitch deck (e.g., a resume, invoice, academic paper, random document). Set confidence accordingly.
- For sections_found, only include sections that are meaningfully present (not just mentioned in passing).
- Use null for any field you cannot determine from the content. Do NOT guess or fabricate data.
- Normalize monetary values to USD integers (e.g., "$5M" → 5000000, "€2M" → approximate USD equivalent).
- Use standard stage names exactly as listed above.
- For website_url, extract the company's own website URL if it appears anywhere in the document.
- Summarize narrative fields (problem, solution, etc.) in your own words based on the content — do not copy verbatim.`;

export class ClaudeExtractionService implements ExtractionService {
  async extract(
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string
  ): Promise<ExtractedFields> {
    const parsed = await parseDocument(fileBuffer, mimeType);

    if (!parsed.text && parsed.images.length === 0) {
      throw new Error(
        `Unable to extract any content from "${fileName}". The file may be empty, corrupted, or password-protected.`
      );
    }

    const userContent = this.buildUserContent(parsed, fileName);
    const client = getClaudeClient();

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude returned no text response");
    }

    const raw = this.parseJsonResponse(textBlock.text);

    // Validate against schema
    const result = ExtractedFieldsSchema.safeParse(raw);
    if (!result.success) {
      console.error("Schema validation failed:", result.error);
      // Fall back to manual mapping from raw response
      return this.manualMap(raw);
    }

    return result.data;
  }

  private buildUserContent(
    parsed: { text: string | null; images: Array<{ data: string; mediaType: string }> },
    fileName: string
  ): ContentBlockParam[] {
    const content: ContentBlockParam[] = [];

    content.push({
      type: "text",
      text: `Analyze the following document and extract pitch deck data.\n\nFile name: ${fileName}`,
    });

    // Add images for vision analysis
    for (const img of parsed.images) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: img.mediaType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
          data: img.data,
        },
      });
    }

    // Add text content
    if (parsed.text) {
      // Truncate to ~100K chars to stay within context limits
      const text = parsed.text.length > 100_000
        ? parsed.text.slice(0, 100_000) + "\n\n[Document truncated at 100,000 characters]"
        : parsed.text;

      content.push({
        type: "text",
        text: `\nDocument content:\n\n${text}`,
      });
    }

    return content;
  }

  private parseJsonResponse(text: string): Record<string, unknown> {
    // Strip markdown code fences if present
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    try {
      return JSON.parse(cleaned);
    } catch {
      // Try to find JSON object in the response
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          // Fall through
        }
      }
      throw new Error(
        `Failed to parse Claude response as JSON. Raw response: ${cleaned.slice(0, 500)}`
      );
    }
  }

  private manualMap(raw: Record<string, unknown>): ExtractedFields {
    return {
      industry: typeof raw.industry === "string" ? raw.industry : null,
      stage: typeof raw.stage === "string" ? raw.stage : null,
      funding_ask_usd: typeof raw.funding_ask_usd === "number" ? Math.round(raw.funding_ask_usd) : null,
      revenue_annual_usd: typeof raw.revenue_annual_usd === "number" ? Math.round(raw.revenue_annual_usd) : null,
      burn_rate_monthly_usd: typeof raw.burn_rate_monthly_usd === "number" ? Math.round(raw.burn_rate_monthly_usd) : null,
      team_size: typeof raw.team_size === "number" ? Math.round(raw.team_size) : null,
      founded_year: typeof raw.founded_year === "number" ? Math.round(raw.founded_year) : null,
      location: typeof raw.location === "string" ? raw.location : null,
      problem_statement: typeof raw.problem_statement === "string" ? raw.problem_statement : null,
      solution_description: typeof raw.solution_description === "string" ? raw.solution_description : null,
      target_market: typeof raw.target_market === "string" ? raw.target_market : null,
      business_model: typeof raw.business_model === "string" ? raw.business_model : null,
      traction_summary: typeof raw.traction_summary === "string" ? raw.traction_summary : null,
      competitive_landscape: typeof raw.competitive_landscape === "string" ? raw.competitive_landscape : null,
      use_of_funds: typeof raw.use_of_funds === "string" ? raw.use_of_funds : null,
      website_url: typeof raw.website_url === "string" ? raw.website_url : null,
      is_pitch_deck: typeof raw.is_pitch_deck === "boolean" ? raw.is_pitch_deck : null,
      pitch_deck_confidence: typeof raw.pitch_deck_confidence === "number" ? raw.pitch_deck_confidence : null,
      sections_found: Array.isArray(raw.sections_found) ? raw.sections_found.filter((s): s is string => typeof s === "string") : null,
    };
  }
}
