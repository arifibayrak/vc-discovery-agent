import type { ExtractedData } from "@/schemas/extraction";
import type { ValidationRuleResult } from "@/schemas/validation";

export interface GeneratedQuestion {
  question: string;
  context: string;
  field_name: string;
}

/**
 * Interface for generating follow-up questions based on
 * extracted data gaps and validation failures.
 */
export interface FollowUpService {
  generate(
    extractedData: ExtractedData,
    validationResults: ValidationRuleResult[]
  ): GeneratedQuestion[];
}

/**
 * Deterministic follow-up question generator.
 * Produces questions based on missing fields and failed validations.
 */
export class DeterministicFollowUpService implements FollowUpService {
  private readonly questionTemplates: Record<string, {
    question: string;
    context: string;
  }> = {
    industry: {
      question: "What industry does your company operate in?",
      context: "Industry classification helps investors assess market dynamics and comparable companies.",
    },
    stage: {
      question: "What is your current funding stage (e.g., Pre-Seed, Seed, Series A)?",
      context: "The funding stage helps set appropriate expectations for traction and valuation.",
    },
    funding_ask_usd: {
      question: "How much funding are you seeking in this round (in USD)?",
      context: "The funding amount is critical for evaluating dilution, runway, and round structure.",
    },
    revenue_annual_usd: {
      question: "What is your current annual revenue (or ARR) in USD?",
      context: "Revenue data helps assess growth trajectory and business model viability.",
    },
    burn_rate_monthly_usd: {
      question: "What is your current monthly burn rate in USD?",
      context: "Burn rate is essential for calculating runway and capital efficiency.",
    },
    team_size: {
      question: "How many full-time team members do you currently have?",
      context: "Team size helps assess execution capacity and organizational maturity.",
    },
    founded_year: {
      question: "When was the company founded?",
      context: "Company age provides context for evaluating traction relative to maturity.",
    },
    location: {
      question: "Where is your company headquartered?",
      context: "Location affects talent access, regulatory environment, and market proximity.",
    },
    problem_statement: {
      question: "What specific problem does your company solve? Please describe the pain point and its impact.",
      context: "A clear problem statement is the foundation of a compelling investment thesis.",
    },
    solution_description: {
      question: "How does your product or service solve this problem? What makes your approach unique?",
      context: "The solution description helps investors understand your value proposition and differentiation.",
    },
    target_market: {
      question: "Who is your target customer? Please describe your TAM, SAM, and SOM if available.",
      context: "Market sizing validates the revenue potential and growth ceiling.",
    },
    business_model: {
      question: "How does your company generate revenue? Describe your pricing model and unit economics.",
      context: "Business model clarity is essential for projecting path to profitability.",
    },
    traction_summary: {
      question: "What traction have you achieved so far? Include metrics like users, revenue, growth rate, and key milestones.",
      context: "Traction data provides evidence of product-market fit and execution ability.",
    },
    competitive_landscape: {
      question: "Who are your main competitors, and how do you differentiate from them?",
      context: "Competitive analysis demonstrates market awareness and defensibility of your position.",
    },
    use_of_funds: {
      question: "How do you plan to allocate the funds raised in this round?",
      context: "Use of funds shows strategic priorities and capital allocation discipline.",
    },
    website_url: {
      question: "What is your company's website URL?",
      context: "A company website helps investors verify the business exists and learn more about your product.",
    },
  };

  generate(
    extractedData: ExtractedData,
    validationResults: ValidationRuleResult[]
  ): GeneratedQuestion[] {
    const questions: GeneratedQuestion[] = [];
    const askedFields = new Set<string>();

    // 0. Special case: document not recognized as a pitch deck
    if (extractedData.is_pitch_deck === false) {
      questions.push({
        question:
          "The uploaded document does not appear to be a startup pitch deck. Could you please upload your investor presentation or pitch deck? A pitch deck typically includes slides covering your problem, solution, market opportunity, business model, traction, team, and funding ask.",
        context:
          "A pitch deck is required for proper VC evaluation. The uploaded file was classified as a non-pitch-deck document.",
        field_name: "is_pitch_deck",
      });
      askedFields.add("is_pitch_deck");
    }

    // 1. Generate questions for missing required fields (failed 'required' validation)
    const failedRequired = validationResults.filter(
      (r) => r.rule_name === "required" && !r.passed
    );

    for (const result of failedRequired) {
      const template = this.questionTemplates[result.field_name];
      if (template && !askedFields.has(result.field_name)) {
        questions.push({
          question: template.question,
          context: template.context,
          field_name: result.field_name,
        });
        askedFields.add(result.field_name);
      }
    }

    // 2. Generate questions for fields that failed other validation rules
    const failedOther = validationResults.filter(
      (r) => r.rule_name !== "required" && !r.passed && r.severity !== "info"
    );

    for (const result of failedOther) {
      if (askedFields.has(result.field_name)) continue;

      const template = this.questionTemplates[result.field_name];
      if (template) {
        questions.push({
          question: `${template.question} (Current value may need correction: ${result.message})`,
          context: template.context,
          field_name: result.field_name,
        });
        askedFields.add(result.field_name);
      }
    }

    // 3. Check for fields that are null but not covered by required validation
    const optionalMissing: (keyof typeof this.questionTemplates)[] = [
      "revenue_annual_usd",
      "burn_rate_monthly_usd",
      "team_size",
      "founded_year",
      "location",
      "traction_summary",
      "competitive_landscape",
      "use_of_funds",
      "website_url",
    ];

    for (const field of optionalMissing) {
      if (askedFields.has(field)) continue;
      const value = extractedData[field as keyof ExtractedData];
      if (value == null || value === "") {
        const template = this.questionTemplates[field];
        if (template) {
          questions.push({
            question: template.question,
            context: `${template.context} (This field is recommended but not required.)`,
            field_name: field,
          });
          askedFields.add(field);
        }
      }
    }

    return questions;
  }
}

let _service: FollowUpService = new DeterministicFollowUpService();

export function getFollowUpService(): FollowUpService {
  return _service;
}

export function setFollowUpService(service: FollowUpService): void {
  _service = service;
}
