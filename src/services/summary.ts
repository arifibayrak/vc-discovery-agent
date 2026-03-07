import type { ExtractedData } from "@/schemas/extraction";
import type { ValidationRuleResult } from "@/schemas/validation";
import type { FollowUpQuestion } from "@/schemas/follow-up";

export interface GeneratedSummary {
  executive_summary: string;
  strengths: string[];
  risks: string[];
  key_metrics: Record<string, unknown>;
  recommendation: string;
  score: number;
}

/**
 * Interface for generating investor summaries.
 */
export interface SummaryService {
  generate(
    extractedData: ExtractedData,
    validationResults: ValidationRuleResult[],
    followUpAnswers: FollowUpQuestion[]
  ): GeneratedSummary;
}

/**
 * Deterministic summary generator.
 * In production, replace with LLM-based generation for richer narratives.
 */
export class DeterministicSummaryService implements SummaryService {
  generate(
    data: ExtractedData,
    validationResults: ValidationRuleResult[],
    followUpAnswers: FollowUpQuestion[]
  ): GeneratedSummary {
    const strengths: string[] = [];
    const risks: string[] = [];
    const keyMetrics: Record<string, unknown> = {};

    // --- Compute score components ---
    let score = 50; // baseline

    // Data completeness
    const extractedFields = [
      "industry", "stage", "funding_ask_usd", "revenue_annual_usd",
      "burn_rate_monthly_usd", "team_size", "founded_year", "location",
      "problem_statement", "solution_description", "target_market",
      "business_model", "traction_summary", "competitive_landscape", "use_of_funds",
    ] as const;

    let filledCount = 0;
    for (const field of extractedFields) {
      if (data[field] != null && data[field] !== "") filledCount++;
    }
    const completeness = filledCount / extractedFields.length;
    keyMetrics["data_completeness"] = `${(completeness * 100).toFixed(0)}%`;

    if (completeness >= 0.8) {
      strengths.push("Comprehensive data provided across key dimensions.");
      score += 10;
    } else if (completeness < 0.5) {
      risks.push("Significant data gaps may limit investor assessment.");
      score -= 10;
    }

    // Validation health
    const failedErrors = validationResults.filter((r) => !r.passed && r.severity === "error");
    const failedWarnings = validationResults.filter((r) => !r.passed && r.severity === "warning");
    keyMetrics["validation_errors"] = failedErrors.length;
    keyMetrics["validation_warnings"] = failedWarnings.length;

    if (failedErrors.length === 0) {
      strengths.push("All critical validation checks passed.");
      score += 10;
    } else {
      risks.push(`${failedErrors.length} critical validation issue(s) detected.`);
      score -= failedErrors.length * 5;
    }

    // Revenue and traction
    if (data.revenue_annual_usd != null && data.revenue_annual_usd > 0) {
      keyMetrics["annual_revenue"] = `$${(data.revenue_annual_usd / 1_000_000).toFixed(1)}M`;
      if (data.revenue_annual_usd >= 1_000_000) {
        strengths.push(`Generating $${(data.revenue_annual_usd / 1_000_000).toFixed(1)}M in annual revenue.`);
        score += 10;
      }
    } else {
      risks.push("No revenue data provided or pre-revenue stage.");
      score -= 5;
    }

    // Runway
    if (data.funding_ask_usd != null && data.burn_rate_monthly_usd != null && data.burn_rate_monthly_usd > 0) {
      const runwayMonths = data.funding_ask_usd / data.burn_rate_monthly_usd;
      keyMetrics["projected_runway_months"] = Math.round(runwayMonths);
      keyMetrics["funding_ask"] = `$${(data.funding_ask_usd / 1_000_000).toFixed(1)}M`;
      keyMetrics["monthly_burn"] = `$${(data.burn_rate_monthly_usd / 1_000).toFixed(0)}K`;

      if (runwayMonths >= 18) {
        strengths.push(`Strong runway of ~${Math.round(runwayMonths)} months at current burn rate.`);
        score += 5;
      } else if (runwayMonths < 12) {
        risks.push(`Limited runway of ~${Math.round(runwayMonths)} months. May need to fundraise again soon.`);
        score -= 5;
      }
    }

    // Team
    if (data.team_size != null) {
      keyMetrics["team_size"] = data.team_size;
      if (data.stage === "Seed" && data.team_size >= 5) {
        strengths.push(`Team of ${data.team_size} is well-sized for ${data.stage} stage.`);
      }
    }

    // Traction
    if (data.traction_summary != null && data.traction_summary.length > 20) {
      strengths.push("Demonstrates measurable traction with supporting data.");
      score += 5;
    }

    // Follow-up responsiveness
    const answeredCount = followUpAnswers.filter((q) => q.status === "answered").length;
    const totalQuestions = followUpAnswers.length;
    if (totalQuestions > 0) {
      keyMetrics["follow_up_response_rate"] = `${answeredCount}/${totalQuestions}`;
      if (answeredCount === totalQuestions) {
        strengths.push("Responded to all follow-up questions, demonstrating transparency.");
        score += 5;
      } else if (answeredCount < totalQuestions / 2) {
        risks.push("Many follow-up questions left unanswered.");
        score -= 5;
      }
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));
    keyMetrics["overall_score"] = score;

    // Stage info
    if (data.stage) keyMetrics["stage"] = data.stage;
    if (data.industry) keyMetrics["industry"] = data.industry;
    if (data.location) keyMetrics["location"] = data.location;

    // Generate executive summary
    const parts: string[] = [];

    if (data.industry && data.stage) {
      parts.push(
        `${data.stage} ${data.industry.toLowerCase()} company` +
        (data.location ? ` based in ${data.location}` : "") +
        (data.funding_ask_usd ? ` seeking $${(data.funding_ask_usd / 1_000_000).toFixed(1)}M in funding` : "") +
        "."
      );
    }

    if (data.problem_statement) {
      parts.push(data.problem_statement.length > 200
        ? data.problem_statement.substring(0, 200) + "..."
        : data.problem_statement);
    }

    if (data.solution_description) {
      parts.push(data.solution_description.length > 200
        ? data.solution_description.substring(0, 200) + "..."
        : data.solution_description);
    }

    if (data.traction_summary) {
      parts.push(`Traction: ${data.traction_summary.length > 150 ? data.traction_summary.substring(0, 150) + "..." : data.traction_summary}`);
    }

    const executiveSummary = parts.length > 0
      ? parts.join(" ")
      : "Insufficient data to generate a comprehensive executive summary. Key fields are missing from the submission.";

    // Recommendation
    let recommendation: string;
    if (score >= 75) {
      recommendation = "STRONG INTEREST - This submission demonstrates strong fundamentals across key dimensions. Recommend scheduling a partner meeting.";
    } else if (score >= 55) {
      recommendation = "MODERATE INTEREST - Submission shows promise but has gaps that should be addressed. Recommend a follow-up call to clarify outstanding items.";
    } else if (score >= 35) {
      recommendation = "LOW INTEREST - Significant gaps in data or concerning metrics. Consider requesting additional materials before proceeding.";
    } else {
      recommendation = "PASS - Submission lacks critical information or has fundamental issues. May reconsider if gaps are addressed in a future round.";
    }

    return {
      executive_summary: executiveSummary,
      strengths,
      risks,
      key_metrics: keyMetrics,
      recommendation,
      score,
    };
  }
}

let _service: SummaryService = new DeterministicSummaryService();

export function getSummaryService(): SummaryService {
  return _service;
}

export function setSummaryService(service: SummaryService): void {
  _service = service;
}
