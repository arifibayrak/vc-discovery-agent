import type { ExtractedData } from "@/schemas/extraction";
import type { ValidationRuleResult } from "@/schemas/validation";

/**
 * Interface for data validation.
 */
export interface ValidationService {
  validate(data: ExtractedData): ValidationRuleResult[];
}

/**
 * Deterministic rule-based validation service.
 * Each rule checks a specific field or cross-field constraint.
 */
export class DeterministicValidationService implements ValidationService {
  validate(data: ExtractedData): ValidationRuleResult[] {
    const results: ValidationRuleResult[] = [];

    // --- Required field checks ---
    const requiredFields: { field: keyof ExtractedData; label: string }[] = [
      { field: "industry", label: "Industry" },
      { field: "stage", label: "Stage" },
      { field: "funding_ask_usd", label: "Funding ask" },
      { field: "problem_statement", label: "Problem statement" },
      { field: "solution_description", label: "Solution description" },
      { field: "target_market", label: "Target market" },
      { field: "business_model", label: "Business model" },
    ];

    for (const { field, label } of requiredFields) {
      const value = data[field];
      results.push({
        field_name: field,
        rule_name: "required",
        passed: value != null && value !== "",
        message: value != null && value !== ""
          ? `${label} is provided.`
          : `${label} is missing. This is a critical field for investor review.`,
        severity: "error",
      });
    }

    // --- Numeric range checks ---
    if (data.funding_ask_usd != null) {
      const reasonable = data.funding_ask_usd >= 100_000 && data.funding_ask_usd <= 500_000_000;
      results.push({
        field_name: "funding_ask_usd",
        rule_name: "reasonable_range",
        passed: reasonable,
        message: reasonable
          ? `Funding ask of $${(data.funding_ask_usd / 1_000_000).toFixed(1)}M is within a reasonable range.`
          : `Funding ask of $${data.funding_ask_usd.toLocaleString()} seems unusual. Typical range is $100K-$500M.`,
        severity: "warning",
      });
    }

    if (data.burn_rate_monthly_usd != null) {
      const positive = data.burn_rate_monthly_usd > 0;
      results.push({
        field_name: "burn_rate_monthly_usd",
        rule_name: "positive_value",
        passed: positive,
        message: positive
          ? `Monthly burn rate of $${data.burn_rate_monthly_usd.toLocaleString()} recorded.`
          : `Burn rate must be a positive number.`,
        severity: "error",
      });
    }

    if (data.team_size != null) {
      const valid = data.team_size >= 1 && data.team_size <= 10_000;
      results.push({
        field_name: "team_size",
        rule_name: "reasonable_range",
        passed: valid,
        message: valid
          ? `Team size of ${data.team_size} is within range.`
          : `Team size of ${data.team_size} seems unusual.`,
        severity: "warning",
      });
    }

    if (data.founded_year != null) {
      const currentYear = new Date().getFullYear();
      const valid = data.founded_year >= 1900 && data.founded_year <= currentYear;
      results.push({
        field_name: "founded_year",
        rule_name: "valid_year",
        passed: valid,
        message: valid
          ? `Founded year ${data.founded_year} is valid.`
          : `Founded year ${data.founded_year} is out of range (1900-${currentYear}).`,
        severity: "error",
      });
    }

    // --- Cross-field consistency ---
    if (data.revenue_annual_usd != null && data.burn_rate_monthly_usd != null) {
      const annualBurn = data.burn_rate_monthly_usd * 12;
      const profitable = data.revenue_annual_usd >= annualBurn;
      results.push({
        field_name: "revenue_annual_usd",
        rule_name: "revenue_vs_burn",
        passed: true, // informational, always passes
        message: profitable
          ? `Company appears revenue-positive (revenue $${(data.revenue_annual_usd / 1_000_000).toFixed(1)}M > annual burn $${(annualBurn / 1_000_000).toFixed(1)}M).`
          : `Company is burning more than revenue (revenue $${(data.revenue_annual_usd / 1_000_000).toFixed(1)}M < annual burn $${(annualBurn / 1_000_000).toFixed(1)}M).`,
        severity: "info",
      });
    }

    if (data.funding_ask_usd != null && data.burn_rate_monthly_usd != null && data.burn_rate_monthly_usd > 0) {
      const runway = data.funding_ask_usd / data.burn_rate_monthly_usd;
      const sufficient = runway >= 12;
      results.push({
        field_name: "funding_ask_usd",
        rule_name: "runway_check",
        passed: sufficient,
        message: sufficient
          ? `Funding provides ~${runway.toFixed(0)} months of runway at current burn.`
          : `Funding only provides ~${runway.toFixed(0)} months of runway. Typically 12-18 months is expected.`,
        severity: sufficient ? "info" : "warning",
      });
    }

    // --- Stage consistency ---
    const VALID_STAGES = [
      "Pre-Seed", "Seed", "Series A", "Series B", "Series C",
      "Series D", "Series E", "Growth", "Late Stage", "Pre-IPO",
    ];
    if (data.stage != null) {
      const recognized = VALID_STAGES.some(
        (s) => s.toLowerCase() === data.stage!.toLowerCase()
      );
      results.push({
        field_name: "stage",
        rule_name: "recognized_stage",
        passed: recognized,
        message: recognized
          ? `Stage "${data.stage}" is recognized.`
          : `Stage "${data.stage}" is not a standard funding stage. Expected one of: ${VALID_STAGES.join(", ")}.`,
        severity: "warning",
      });
    }

    // --- Pitch deck classification check ---
    if (data.is_pitch_deck != null) {
      results.push({
        field_name: "is_pitch_deck",
        rule_name: "pitch_deck_classification",
        passed: data.is_pitch_deck === true,
        message: data.is_pitch_deck === true
          ? `Document classified as a pitch deck (confidence: ${data.pitch_deck_confidence != null ? `${(data.pitch_deck_confidence * 100).toFixed(0)}%` : "n/a"}).`
          : "The uploaded document does not appear to be a pitch deck. Please upload an investor presentation or pitch deck.",
        severity: "error",
      });
    }

    // --- Pitch deck section completeness ---
    const REQUIRED_SECTIONS = ["problem", "solution", "market", "business_model"];
    const RECOMMENDED_SECTIONS = ["traction", "competition", "use_of_funds", "team", "ask"];

    if (data.sections_found != null) {
      for (const section of REQUIRED_SECTIONS) {
        const found = data.sections_found.includes(section);
        results.push({
          field_name: "sections_found",
          rule_name: `required_section_${section}`,
          passed: found,
          message: found
            ? `Required section "${section.replace(/_/g, " ")}" is present.`
            : `Missing required section: "${section.replace(/_/g, " ")}". Investors expect this in every pitch deck.`,
          severity: "error",
        });
      }

      for (const section of RECOMMENDED_SECTIONS) {
        const found = data.sections_found.includes(section);
        if (!found) {
          results.push({
            field_name: "sections_found",
            rule_name: `recommended_section_${section}`,
            passed: false,
            message: `Recommended section "${section.replace(/_/g, " ")}" is missing. Including it strengthens the pitch.`,
            severity: "warning",
          });
        }
      }
    }

    // --- Website URL validation ---
    if (data.website_url != null) {
      let validUrl = false;
      try {
        const parsed = new URL(
          /^https?:\/\//i.test(data.website_url)
            ? data.website_url
            : `https://${data.website_url}`
        );
        validUrl = parsed.hostname.includes(".");
      } catch {
        validUrl = false;
      }

      results.push({
        field_name: "website_url",
        rule_name: "valid_url_format",
        passed: validUrl,
        message: validUrl
          ? `Company website "${data.website_url}" has a valid URL format.`
          : `Website URL "${data.website_url}" is not a valid URL format.`,
        severity: "warning",
      });

      // Check website reachability from raw extraction results
      const websiteVal = (data.raw_extraction as Record<string, unknown> | null)
        ?.website_validation as Record<string, unknown> | null;

      if (websiteVal != null) {
        const reachable = websiteVal.is_reachable === true;
        const statusCode = websiteVal.status_code as number | null;
        const title = websiteVal.title as string | null;
        const errorMsg = websiteVal.error as string | null;

        results.push({
          field_name: "website_url",
          rule_name: "website_reachable",
          passed: reachable,
          message: reachable
            ? `Website is live${title ? ` — "${title}"` : ""}${statusCode ? ` (HTTP ${statusCode})` : ""}.`
            : `Website is not reachable${errorMsg ? `: ${errorMsg}` : ""}. Verify the URL is correct and the site is live.`,
          severity: "warning",
        });
      }
    }

    // --- Text length quality checks ---
    if (data.problem_statement != null && data.problem_statement.length < 20) {
      results.push({
        field_name: "problem_statement",
        rule_name: "sufficient_detail",
        passed: false,
        message: `Problem statement is too brief (${data.problem_statement.length} chars). A compelling problem statement should be at least 20 characters.`,
        severity: "warning",
      });
    }

    if (data.solution_description != null && data.solution_description.length < 20) {
      results.push({
        field_name: "solution_description",
        rule_name: "sufficient_detail",
        passed: false,
        message: `Solution description is too brief (${data.solution_description.length} chars). Provide more detail for investor review.`,
        severity: "warning",
      });
    }

    return results;
  }
}

let _service: ValidationService = new DeterministicValidationService();

export function getValidationService(): ValidationService {
  return _service;
}

export function setValidationService(service: ValidationService): void {
  _service = service;
}
