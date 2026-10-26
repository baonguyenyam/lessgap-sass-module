# 0007. pgvector in the main database for the chatbot

**Status:** proposed
**Date:** 2026-10-26

## Context
Each tenant's knowledge base is small (a few pages, an FAQ, a menu, a few
documents): thousands of chunks per tenant at most. Isolation rules must apply
to embeddings exactly as to other data. Neon supports pgvector.

## Decision
Store chunks and embeddings in a tenant-owned table with a `vector` column
in the main database, with RLS, an index on `tenantId` and a vector index.
Structured facts (prices, hours, availability) are served by tools reading
the database, not by embeddings.

## Consequences
- One database, one backup, one isolation model.
- Deleting a tenant deletes its embeddings with everything else.
- At much larger volumes, revisit (partitioning by tenant, or a vector service).

## Options considered
- **Hosted vector database (Pinecone, Turbopuffer):** another provider, another
  isolation model (namespaces) to keep in step, for volumes we do not have.
- **No retrieval, whole knowledge in the prompt:** works for tiny tenants, cost grows per message, breaks with documents.
