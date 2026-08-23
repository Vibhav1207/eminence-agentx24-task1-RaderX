import { InvestigationModel, SourceType } from '@/lib/types';

export interface InvestigationContext {
  objective: string;
  entities: string[];
  domain: string;
  subtopics: string[];
  comparisonTargets: string[];
  requiredEvidenceTypes: SourceType[];
  excludedTopics: string[];
  timeRange: string;
}

export class InvestigationContextBuilder {
  /**
   * Requirement 1: Build structured investigation context from objective and title
   */
  buildContext(investigation: InvestigationModel): InvestigationContext {
    const objective = investigation.objective || investigation.title;
    const text = `${investigation.title} ${objective} ${investigation.strategicQuestion || ''}`.toLowerCase();

    // 1. Extract Entities
    const entities: string[] = [];
    if (investigation.primaryEntities && investigation.primaryEntities.length > 0) {
      entities.push(...investigation.primaryEntities);
    } else {
      if (investigation.organization) entities.push(investigation.organization);
      if (investigation.technology) entities.push(investigation.technology);
    }

    // Fallback entity parsing from title e.g. "Riot Games vs Valve" or "Spotify and YouTube Music"
    if (entities.length < 2) {
      const match = objective.match(/([a-zA-Z0-9\s]+) (?:vs|versus|and|×) ([a-zA-Z0-9\s]+)/i);
      if (match) {
        if (!entities.includes(match[1].trim())) entities.push(match[1].trim());
        if (!entities.includes(match[2].trim())) entities.push(match[2].trim());
      }
    }

    if (entities.length === 0) {
      entities.push('Target Entity');
    }

    // 2. Identify Domain
    let domain = 'Technology & Strategy';
    if (/\b(gaming|esports|pc game|publisher|steam|league of legends|game platform)\b/.test(text)) {
      domain = 'PC Gaming & Esports';
    } else if (/\b(music|streaming|spotify|youtube music|audio|tracks|playlist)\b/.test(text)) {
      domain = 'Music Streaming & Audio';
    } else if (/\b(ai|llm|model|machine learning|gpu|semiconductor|chip)\b/.test(text)) {
      domain = 'Artificial Intelligence & Compute';
    } else if (/\b(cloud|saas|enterprise|aws|azure|gcp)\b/.test(text)) {
      domain = 'Cloud Computing & Enterprise Software';
    } else if (/\b(automotive|ev|tesla|byd|battery|electric vehicle)\b/.test(text)) {
      domain = 'Electric Vehicles & Mobility';
    }

    // 3. Subtopics
    const subtopics: string[] = [
      'competitive strategy',
      'market positioning',
      'product architecture',
      'monetization and growth',
    ];

    if (domain.includes('Gaming')) {
      subtopics.push('esports ecosystem', 'digital distribution platform', 'game portfolio', 'user retention');
    } else if (domain.includes('Music')) {
      subtopics.push('creator ecosystem', 'subscription pricing', 'catalog rights', 'user engagement');
    }

    // 4. Excluded Generic Topics
    const excludedTopics = [
      'general history of video games',
      'unrelated political news',
      'generic wikipedia stubs',
      'sports clubs unrelated to gaming',
    ];

    return {
      objective,
      entities,
      domain,
      subtopics,
      comparisonTargets: entities.length >= 2 ? entities : [],
      requiredEvidenceTypes: ['RESEARCH', 'PATENT', 'NEWS', 'WEB'],
      excludedTopics,
      timeRange: investigation.timeHorizon || 'Last 30 days',
    };
  }

  /**
   * Requirement 1: Generate targeted search queries for providers using structured context
   */
  generateSearchQueries(context: InvestigationContext): Array<{
    category: SourceType;
    query: string;
    entity?: string;
  }> {
    const queries: Array<{ category: SourceType; query: string; entity?: string }> = [];

    const entityA = context.entities[0] || 'Target';
    const entityB = context.entities[1] || '';

    if (entityB) {
      // Comparison query
      queries.push({
        category: 'RESEARCH',
        query: `"${entityA}" "${entityB}" ${context.domain}`,
        entity: entityA,
      });
      queries.push({
        category: 'PATENT',
        query: `"${entityA}" OR "${entityB}"`,
        entity: entityA,
      });
      queries.push({
        category: 'NEWS',
        query: `"${entityA}" "${entityB}" strategy`,
        entity: entityA,
      });
      queries.push({
        category: 'WEB',
        query: `"${entityA}" vs "${entityB}" competitive analysis`,
        entity: entityA,
      });
    } else {
      // Single entity query
      queries.push({
        category: 'RESEARCH',
        query: `"${entityA}" ${context.domain}`,
        entity: entityA,
      });
      queries.push({
        category: 'PATENT',
        query: `"${entityA}"`,
        entity: entityA,
      });
      queries.push({
        category: 'NEWS',
        query: `"${entityA}" business strategy`,
        entity: entityA,
      });
      queries.push({
        category: 'WEB',
        query: `"${entityA}" platform market analysis`,
        entity: entityA,
      });
    }

    return queries;
  }
}

export const defaultInvestigationContextBuilder = new InvestigationContextBuilder();
