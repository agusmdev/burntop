/**
 * Parser types for burntop CLI
 *
 * These types define the common interface for all AI tool parsers.
 */

import type { SourceCheckpoint } from '../config/sync-checkpoint';

/**
 * A single usage record from an AI tool
 */
export interface UsageRecord {
  /** Unique identifier for this record (usually message UUID) */
  id: string;
  /** Session ID this record belongs to */
  sessionId: string;
  /** Source tool (e.g., 'claude-code', 'cursor', 'gemini-cli') */
  source: string;
  /** Model used (e.g., 'claude-sonnet-4-20250514', 'gpt-4o') */
  model: string;
  /** ISO timestamp of the interaction */
  timestamp: string;
  /** Number of input tokens */
  inputTokens: number;
  /** Number of output tokens */
  outputTokens: number;
  /** Number of cache creation tokens */
  cacheCreationTokens: number;
  /** Number of cache read tokens */
  cacheReadTokens: number;
  /** Working directory (project path) */
  cwd?: string;
}

/**
 * Aggregated stats for a time period
 */
export interface UsageStats {
  /** Total input tokens */
  totalInputTokens: number;
  /** Total output tokens */
  totalOutputTokens: number;
  /** Total cache creation tokens */
  totalCacheCreationTokens: number;
  /** Total cache read tokens */
  totalCacheReadTokens: number;
  /** Number of sessions */
  sessionCount: number;
  /** Number of messages/interactions */
  messageCount: number;
  /** Breakdown by model */
  byModel: Record<
    string,
    {
      inputTokens: number;
      outputTokens: number;
      cacheCreationTokens: number;
      cacheReadTokens: number;
      messageCount: number;
    }
  >;
  /** Breakdown by date (YYYY-MM-DD) */
  byDate: Record<
    string,
    {
      inputTokens: number;
      outputTokens: number;
      cacheCreationTokens: number;
      cacheReadTokens: number;
      messageCount: number;
      sessionCount: number;
    }
  >;
}

/**
 * Result from parsing an AI tool's data
 */
export interface ParseResult {
  /** Source tool identifier */
  source: string;
  /** Individual usage records */
  records: UsageRecord[];
  /** Aggregated stats */
  stats: UsageStats;
  /** Number of files/sessions processed */
  filesProcessed: number;
  /** Errors encountered during parsing */
  errors: Array<{ file: string; error: string }>;
}

/**
 * Options for parsing
 */
export interface ParseOptions {
  /** Maximum number of files to process (0 = unlimited) */
  limit?: number;
  /** Progress callback called every N files */
  onProgress?: (processed: number, total: number) => void;
}

/**
 * Result from incremental parsing (extends ParseResult)
 */
export interface IncrementalParseResult extends ParseResult {
  /** Checkpoint to save for next incremental sync */
  checkpoint: SourceCheckpoint;
  /** Whether this was an incremental sync (true) or full sync (false) */
  isIncremental: boolean;
  /** Number of files/sessions that were skipped (unchanged since last sync) */
  skippedFiles: number;
}

/**
 * Interface that all parsers must implement
 */
export interface Parser {
  /** Unique identifier for this parser */
  readonly name: string;
  /** Human-readable display name */
  readonly displayName: string;
  /** Default paths to scan for data */
  readonly defaultPaths: string[];
  /** Check if this parser's data exists on the system */
  exists(): Promise<boolean>;
  /** Parse all available data (full sync) */
  parse(options?: ParseOptions): Promise<ParseResult>;
  /**
   * Parse only new data since last checkpoint (incremental sync).
   * Optional - if not implemented, full sync will be used.
   *
   * @param checkpoint Previous checkpoint for this source, or undefined for first sync
   * @param options Parse options
   * @returns IncrementalParseResult with new records and updated checkpoint
   */
  parseIncremental?(
    checkpoint: SourceCheckpoint | undefined,
    options?: ParseOptions
  ): Promise<IncrementalParseResult>;
}
