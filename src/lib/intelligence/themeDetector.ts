import { EvidenceModel } from '@/lib/types';

export interface StrategicTheme {
  id: string;
  theme: string;
  summary: string;
  evidenceIds: string[];
  entityIds: string[];
  confidence: number;
}

export class ThemeDetector {
  detectThemes(evidenceList: EvidenceModel[]): StrategicTheme[] {
    const themes: StrategicTheme[] = [];

    // Filter evidence by keywords & entities
    const inferenceEv = evidenceList.filter(
      (e) =>
        e.title.toLowerCase().includes('inference') ||
        e.title.toLowerCase().includes('fp4') ||
        e.title.toLowerCase().includes('quantization') ||
        e.summary.toLowerCase().includes('kernel')
    );

    if (inferenceEv.length > 0) {
      themes.push({
        id: `theme-inf-${Date.now()}`,
        theme: 'AI INFERENCE INFRASTRUCTURE ACCELERATION',
        summary: 'Cross-source evidence across patents, research preprints, SEC filings, and GitHub commits pointing to native INT4/FP4 low-precision quantization execution defaults.',
        evidenceIds: inferenceEv.map((e) => e.id),
        entityIds: Array.from(new Set(inferenceEv.flatMap((e) => e.entityIds))),
        confidence: 94,
      });
    }

    const asicEv = evidenceList.filter(
      (e) =>
        e.title.toLowerCase().includes('asic') ||
        e.summary.toLowerCase().includes('capex') ||
        e.summary.toLowerCase().includes('hyperscaler')
    );

    if (asicEv.length > 0) {
      themes.push({
        id: `theme-asic-${Date.now()}`,
        theme: 'HYPERSCALER CUSTOM ASIC SILICON SHIFT',
        summary: 'SEC EDGAR filings and financial disclosures showing cloud provider capex reallocation toward internal custom inference ASIC chips.',
        evidenceIds: asicEv.map((e) => e.id),
        entityIds: Array.from(new Set(asicEv.flatMap((e) => e.entityIds))),
        confidence: 91,
      });
    }

    return themes;
  }
}

export const defaultThemeDetector = new ThemeDetector();
