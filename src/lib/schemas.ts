import { z } from 'zod';

export const PrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const TimeRangeSchema = z.enum([
  'last_7_days',
  'last_30_days',
  'last_90_days',
  'last_6_months',
  'last_year',
]);

export const EvidenceTypeSchema = z.enum([
  'research',
  'patent',
  'news',
  'competitor',
  'web',
]);

export const ClassificationSchema = z.enum([
  'threat',
  'opportunity',
  'neutral',
]);

export const ImpactSchema = z.enum(['high', 'medium', 'low']);

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

export const InvestigationStatusSchema = z.enum([
  'DRAFT',
  'QUEUED',
  'RUNNING',
  'SYNTHESIZING',
  'COMPLETED',
  'FAILED',
  'PAUSED',
]);

export const InvestigationSchema = z.object({
  id: z.string(),
  organization: z.string().min(1),
  technology: z.string().min(1),
  competitors: z.array(z.string()),
  timeRange: TimeRangeSchema,
  strategicQuestion: z.string().min(1),
  status: z.string(),
  report: InvestigationReportSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateInvestigationSchema = z.object({
  organization: z.string().min(1, 'Organization is required'),
  technology: z.string().min(1, 'Technology / Research Area is required'),
  competitors: z.string().optional(),
  timeRange: z.string().optional(),
  strategicQuestion: z.string().min(1, 'Strategic question is required'),
});

export const CreateInvestigationApiSchema = z.object({
  title: z.string().optional(),
  organization: z.string().min(1, 'Organization / Primary Entity is required'),
  technology: z.string().min(1, 'Technology / Area is required'),
  strategicQuestion: z
    .string()
    .min(10, 'Strategic question must be at least 10 characters long')
    .max(1000, 'Strategic question is too long'),
  priority: PrioritySchema.default('HIGH'),
  timeHorizon: z.string().default('Last 30 days'),
  primaryEntities: z.array(z.string()).default([]),
});

export const PatchInvestigationApiSchema = z.object({
  status: InvestigationStatusSchema.optional(),
  progress: z.number().min(0).max(100).optional(),
  confidence: z.number().min(0).max(100).optional(),
  threatScore: z.number().optional(),
  opportunityScore: z.number().optional(),
  executiveSummary: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const WatchConfigSchema = z.object({
  id: z.string(),
  organization: z.string(),
  technology: z.string(),
  competitors: z.array(z.string()),
  timeRange: TimeRangeSchema,
  strategicQuestion: z.string(),
  frequency: z.enum(['daily', 'weekly']),
  status: z.enum(['active', 'paused']),
  lastScan: z.string().optional(),
  createdAt: z.string(),
});

export const CreateWatchlistApiSchema = z.object({
  name: z.string().min(2, 'Watchlist name is required'),
  organization: z.string().optional(),
  technology: z.string().optional(),
  objective: z.string().optional(),
  investigationId: z.string().optional(),
  monitoringMode: z.enum(['AUTO', 'QUIET', 'BALANCED', 'HIGH_SENSITIVITY']).default('AUTO'),
});

export const PatchWatchlistApiSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'QUIET', 'INVESTIGATING']).optional(),
  monitoringMode: z.enum(['AUTO', 'QUIET', 'BALANCED', 'HIGH_SENSITIVITY']).optional(),
  alertThreshold: z.number().optional(),
});

export const PatchAlertApiSchema = z.object({
  read: z.boolean().optional(),
});

export type Investigation = z.infer<typeof InvestigationSchema>;
export type CreateInvestigation = z.infer<typeof CreateInvestigationSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type StrategicSignal = z.infer<typeof StrategicSignalSchema>;
export type InvestigationReport = z.infer<typeof InvestigationReportSchema>;
export type WatchConfig = z.infer<typeof WatchConfigSchema>;

export type CreateInvestigationInput = z.infer<typeof CreateInvestigationApiSchema>;
export type PatchInvestigationInput = z.infer<typeof PatchInvestigationApiSchema>;
export type CreateWatchlistInput = z.infer<typeof CreateWatchlistApiSchema>;
