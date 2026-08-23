import { SourceResult } from '@/lib/providers/sourceProvider';
import { InvestigationContext } from '@/lib/intelligence/investigationContext';

export interface RelevanceScoreResult {
  score: number;
  passed: boolean;
  entityMatchScore: number;
  topicMatchScore: number;
  objectiveMatchScore: number;
  sourceQualityScore: number;
  temporalScore: number;
  rejectionReason?: string;
}

export class RelevanceScorer {
  private readonly RELEVANCE_THRESHOLD = 0.70;

  /**
   * Requirement 2 & 3: Multi-Factor Relevance Scoring Gate
   */
  evaluateRelevance(result: SourceResult, context: InvestigationContext): RelevanceScoreResult {
    const text = `${result.title} ${result.summary || ''}`.toLowerCase();

    // 1. Check Explicit Non-Relevant Irrelevant Topics (Hard Rejection)
    const irrelevantPatterns = [
      /history of video games/i,
      /australian rugby league/i,
      /protesters clash with police/i,
      /dalai lama's comments/i,
      /generic wikipedia stub/i,
      /unrelated sports club/i,
      /patent foramen ovale/i,
      /patent ductus/i,
      /echocardiography/i,
      /pulmonary hypertension/i,
    ];

    for (const pattern of irrelevantPatterns) {
      if (pattern.test(text)) {
        return {
          score: 0.15,
          passed: false,
          entityMatchScore: 0,
          topicMatchScore: 0,
          objectiveMatchScore: 0,
          sourceQualityScore: 0.5,
          temporalScore: 0.5,
          rejectionReason: `Rejected: Item matches known irrelevant topic pattern ("${result.title}")`,
        };
      }
    }

    // 2. Entity Match Subscore (35%)
    let matchedEntitiesCount = 0;
    for (const entity of context.entities) {
      if (text.includes(entity.toLowerCase())) {
        matchedEntitiesCount++;
      }
    }

    let entityMatchScore = 0;
    if (context.entities.length >= 2) {
      if (matchedEntitiesCount >= 2) entityMatchScore = 1.0;
      else if (matchedEntitiesCount === 1) entityMatchScore = 0.75;
      else entityMatchScore = 0;
    } else {
      entityMatchScore = matchedEntitiesCount >= 1 ? 1.0 : 0;
    }

    // Hard Stop: If zero target entities match, REJECT
    if (entityMatchScore === 0) {
      return {
        score: 0.20,
        passed: false,
        entityMatchScore: 0,
        topicMatchScore: 0,
        objectiveMatchScore: 0,
        sourceQualityScore: 0.6,
        temporalScore: 0.5,
        rejectionReason: `Rejected: Entity match = 0. Neither ${context.entities.join(' nor ')} appeared in item.`,
      };
    }

    // 3. Topic Match Subscore (35%)
    const domainKeywords = this.getDomainKeywords(context.domain);
    let matchedTopicCount = 0;

    for (const kw of [...domainKeywords, ...context.subtopics]) {
      if (text.includes(kw.toLowerCase())) {
        matchedTopicCount++;
      }
    }

    const topicMatchScore = Math.min(1.0, matchedTopicCount / 2);

    // Hard Stop: If topic relevance is too low, REJECT
    if (topicMatchScore < 0.25) {
      return {
        score: 0.35,
        passed: false,
        entityMatchScore,
        topicMatchScore,
        objectiveMatchScore: 0.1,
        sourceQualityScore: 0.7,
        temporalScore: 0.5,
        rejectionReason: `Rejected: Topic relevance score (${topicMatchScore.toFixed(2)}) is below minimum domain threshold 0.25 for ${context.domain}.`,
      };
    }

    // 4. Objective Match Subscore (15%)
    const objWords = context.objective.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const matchedObjWords = objWords.filter((w) => text.includes(w)).length;
    const objectiveMatchScore = objWords.length > 0 ? Math.min(1.0, matchedObjWords / (objWords.length * 0.4)) : 0.5;

    // 5. Source Quality Subscore (10%)
    let sourceQualityScore = 0.8;
    if (result.sourceType === 'RESEARCH' && result.doi) sourceQualityScore = 1.0;
    else if (result.sourceType === 'PATENT') sourceQualityScore = 0.95;
    else if (result.sourceName?.includes('Wikipedia')) sourceQualityScore = 0.60;

    // 6. Temporal Score (5%)
    let temporalScore = 0.9;
    const pubYear = parseInt(result.publishedAt?.split('-')[0] || '2025', 10);
    if (pubYear < 2015) temporalScore = 0.5;

    // Weighted Overall Score
    const overallScore = Math.round(
      (entityMatchScore * 0.35 +
        topicMatchScore * 0.35 +
        objectiveMatchScore * 0.15 +
        sourceQualityScore * 0.10 +
        temporalScore * 0.05) *
        100
    ) / 100;

    const passed = overallScore >= this.RELEVANCE_THRESHOLD;
    const rejectionReason = passed
      ? undefined
      : `Rejected: Overall relevance score (${overallScore}) is below threshold ${this.RELEVANCE_THRESHOLD}.`;

    return {
      score: overallScore,
      passed,
      entityMatchScore,
      topicMatchScore,
      objectiveMatchScore,
      sourceQualityScore,
      temporalScore,
      rejectionReason,
    };
  }

  private getDomainKeywords(domain: string): string[] {
    if (domain.includes('Gaming')) {
      return ['gaming', 'esports', 'game', 'platform', 'distribution', 'steam', 'league of legends', 'portfolio', 'developer', 'monetization', 'pc'];
    }
    if (domain.includes('Music')) {
      return ['music', 'streaming', 'audio', 'spotify', 'youtube music', 'creator', 'catalog', 'track', 'playlist', 'subscription'];
    }
    if (domain.includes('AI')) {
      return ['ai', 'intelligence', 'model', 'llm', 'gpu', 'semiconductor', 'chip', 'architecture', 'training', 'inference'];
    }
    return ['strategy', 'market', 'competition', 'technology', 'growth', 'product'];
  }
}

export const defaultRelevanceScorer = new RelevanceScorer();
