-- RadarX production persistence.
-- The application stores each logical collection as a JSONB document while
-- preserving collection and document keys for isolated, durable records.
create table if not exists public.radarx_documents (
  collection_name text not null,
  document_id text not null,
  document jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (collection_name, document_id)
);

create index if not exists radarx_documents_collection_idx
  on public.radarx_documents (collection_name);

create index if not exists radarx_documents_document_gin_idx
  on public.radarx_documents using gin (document);
