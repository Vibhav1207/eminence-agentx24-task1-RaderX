import { z } from "zod";

export const InvestigationStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
]);

export const TimeRangeSchema = z.enum([
  "last_7_days",
  "last_30_days",
  "last_90_days",
  "last_6_months",
  "last_year",
]);

export const EvidenceTypeSchema = z.enum([
  "research",
  "patent",
  "news",
  "competitor",
  "web",
]);

export const ClassificationSchema = z.enum([
  "threat",
  "opportunity",
  "neutral",
]);

export const ImpactSchema = z.enum(["high", "medium", "low"]);

export const EvidenceSchema = z.object({
  source: z.string(),
  title: z.string(),
  url: z.string().optional(),
  date: z.string().optional(),
  summary: z.string(),
  relevance: z.number().min(0).max(1).optional(),
  entity: z.string().optional(),
  evidenceType: EvidenceTypeSchema,
});

export const StrategicSignalSchema = z.object({
  title: z.string(),
  classification: ClassificationSchema,
  impact: ImpactSchema,
  confidence: z.number().min(0).max(100),
  summary: z.string(),
  whyItMatters: z.string(),
  evidence: z.array(EvidenceSchema),
  recommendedActions: z.array(z.string()),
});

export const InvestigationReportSchema = z.object({
  executiveSummary: z.string(),
  signals: z.array(StrategicSignalSchema),
  threats: z.array(StrategicSignalSchema),
  opportunities: z.array(StrategicSignalSchema),
  emergingTrends: z.array(z.string()),
  recommendations: z.array(z.string()),
  evidence: z.array(EvidenceSchema),
  sources: z.array(z.string()),
  confidence: z.number().min(0).max(100),
});

export const InvestigationSchema = z.object({
  id: z.string(),
  organization: z.string().min(1),
  technology: z.string().min(1),
  competitors: z.array(z.string()),
  timeRange: TimeRangeSchema,
  strategicQuestion: z.string().min(1),
  status: InvestigationStatusSchema,
  report: InvestigationReportSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateInvestigationSchema = z.object({
  organization: z.string().min(1, "Organization is required"),
  technology: z.string().min(1, "Technology / Research Area is required"),
  competitors: z.string().min(1, "At least one competitor is required"),
  timeRange: TimeRangeSchema,
  strategicQuestion: z.string().min(1, "Strategic question is required"),
});

export type Investigation = z.infer<typeof InvestigationSchema>;
export type CreateInvestigation = z.infer<typeof CreateInvestigationSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type StrategicSignal = z.infer<typeof StrategicSignalSchema>;
export type InvestigationReport = z.infer<typeof InvestigationReportSchema>;
export type InvestigationStatus = z.infer<typeof InvestigationStatusSchema>;
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;
export type Classification = z.infer<typeof ClassificationSchema>;
export type Impact = z.infer<typeof ImpactSchema>;
