import { EntityModel, EntityType } from '@/lib/types';

export interface CanonicalEntity {
  id: string;
  canonicalName: string;
  type: EntityType;
  aliases: string[];
}

export class EntityResolver {
  private knownEntities: Map<string, CanonicalEntity> = new Map();

  constructor() {
    // Register default canonical entities & aliases
    this.registerEntity({
      id: 'ent-nvda',
      canonicalName: 'NVIDIA',
      type: 'COMPANY',
      aliases: ['NVIDIA', 'Nvidia Corporation', 'NVIDIA Corp.', 'Nvidia Inc.', 'NVDA'],
    });

    this.registerEntity({
      id: 'ent-tsmc',
      canonicalName: 'TSMC',
      type: 'COMPANY',
      aliases: ['TSMC', 'Taiwan Semiconductor Manufacturing Co.', 'Taiwan Semi'],
    });

    this.registerEntity({
      id: 'ent-cerebras',
      canonicalName: 'Cerebras',
      type: 'COMPANY',
      aliases: ['Cerebras', 'Cerebras Systems', 'Cerebras Systems Inc.'],
    });

    this.registerEntity({
      id: 'ent-fp4',
      canonicalName: 'FP4 Quantization',
      type: 'TECHNOLOGY',
      aliases: ['FP4 Quantization', 'FP4', 'INT4/FP4', 'Sub-byte FP4'],
    });

    this.registerEntity({
      id: 'ent-cuda',
      canonicalName: 'CUDA',
      type: 'TECHNOLOGY',
      aliases: ['CUDA', 'CUDA Architecture', 'cuBLAS', 'NVLink'],
    });
  }

  registerEntity(entity: CanonicalEntity) {
    this.knownEntities.set(entity.id, entity);
  }

  resolveEntity(inputName: string, defaultType: EntityType = 'TECHNOLOGY'): CanonicalEntity {
    const normalizedInput = inputName.trim().toLowerCase();

    // Check alias match across registered entities
    for (const entity of Array.from(this.knownEntities.values())) {
      if (entity.aliases.some((alias) => alias.toLowerCase() === normalizedInput)) {
        return entity;
      }
    }

    // Fuzzy matching for company suffix variants
    for (const entity of Array.from(this.knownEntities.values())) {
      if (
        normalizedInput.includes(entity.canonicalName.toLowerCase()) ||
        entity.aliases.some((alias) => normalizedInput.includes(alias.toLowerCase()))
      ) {
        return entity;
      }
    }

    // If no match found, create new canonical entity entry dynamically
    const newId = `ent-dyn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newEntity: CanonicalEntity = {
      id: newId,
      canonicalName: inputName.trim(),
      type: defaultType,
      aliases: [inputName.trim()],
    };
    this.registerEntity(newEntity);
    return newEntity;
  }

  toEntityModel(canonical: CanonicalEntity): EntityModel {
    return {
      id: canonical.id,
      name: canonical.canonicalName,
      type: canonical.type,
      description: `Resolved canonical entity for ${canonical.canonicalName} (${canonical.aliases.join(', ')})`,
      confidence: 94,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export const defaultEntityResolver = new EntityResolver();
