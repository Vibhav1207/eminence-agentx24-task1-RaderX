import { EntityModel, EntityProfileModel, EntityType } from '@/lib/types';
import { dbRepository } from '@/lib/db/repository';

export class EntityResolver {
  private aliasMap: Map<string, string> = new Map([
    ['openai inc.', 'OpenAI'],
    ['openai, inc.', 'OpenAI'],
    ['openai corporation', 'OpenAI'],
    ['cursor ai', 'Cursor'],
    ['anysphere inc.', 'Cursor'],
    ['anysphere', 'Cursor'],
    ['anthropic pbc', 'Anthropic'],
    ['anthropic ai', 'Anthropic'],
    ['github copilot', 'GitHub Copilot'],
    ['copilot', 'GitHub Copilot'],
  ]);

  canonicalizeName(rawName: string): string {
    const clean = rawName.trim().toLowerCase();
    return this.aliasMap.get(clean) || rawName.trim();
  }

  async resolveAndSyncEntities(entities: EntityModel[]): Promise<EntityProfileModel[]> {
    const profiles: EntityProfileModel[] = [];

    for (const ent of entities) {
      const canonicalName = this.canonicalizeName(ent.name);
      const existingProfiles = await dbRepository.getEntityProfiles();
      const match = existingProfiles.find(
        (p) => p.name.toLowerCase() === canonicalName.toLowerCase() || p.aliases.some((a) => a.toLowerCase() === ent.name.toLowerCase())
      );

      if (match) {
        if (!match.aliases.includes(ent.name) && ent.name !== match.name) {
          match.aliases.push(ent.name);
        }
        match.evidenceCount += 1;
        match.lastSeen = new Date().toISOString();
        const updated = await dbRepository.saveEntityProfile(match);
        profiles.push(updated);
      } else {
        const newProfile = await dbRepository.saveEntityProfile({
          name: canonicalName,
          type: ent.type,
          aliases: ent.name !== canonicalName ? [ent.name] : [],
          description: ent.description || `${canonicalName} tracked entity profile.`,
          relatedEntityIds: [],
          evidenceCount: 1,
          signalCount: 0,
          importance: 75,
          confidence: ent.confidence || 85,
        });
        profiles.push(newProfile);
      }
    }

    return profiles;
  }
}

export const defaultEntityResolver = new EntityResolver();
