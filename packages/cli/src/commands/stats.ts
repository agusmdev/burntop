/**
 * Stats command - show detailed AI usage statistics
 *
 * Displays comprehensive statistics about AI tool usage including:
 * - Total tokens (input, output, cache)
 * - Estimated cost breakdown
 * - Model usage distribution
 * - Time-based trends (today, this week, this month)
 * - Active days and sessions
 */

import {
  AiderParser,
  ClaudeCodeParser,
  ClineParser,
  CodexParser,
  ContinueParser,
  CursorParser,
  DroidParser,
  GeminiCliParser,
  KiloCodeParser,
  OpenCodeParser,
  RooCodeParser,
  type ParseResult,
} from '../parsers/index.js';

/**
 * Format a number with commas for readability
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Format token count in a human-readable way (e.g., 1.2M, 45.3K)
 */
function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return formatNumber(tokens);
}

/**
 * Format cost in USD
 */
function formatCost(cost: number): string {
  if (cost < 0.01) {
    return '<$0.01';
  }
  return `$${cost.toFixed(2)}`;
}

/**
 * Estimate cost based on token usage
 * Using approximate Claude 3.5 Sonnet pricing:
 * - Input: $3 per 1M tokens
 * - Output: $15 per 1M tokens
 * - Cache creation: $3.75 per 1M tokens
 * - Cache read: $0.30 per 1M tokens
 */
function estimateCost(
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens: number,
  cacheReadTokens: number
): number {
  const inputCost = (inputTokens / 1_000_000) * 3;
  const outputCost = (outputTokens / 1_000_000) * 15;
  const cacheCreationCost = (cacheCreationTokens / 1_000_000) * 3.75;
  const cacheReadCost = (cacheReadTokens / 1_000_000) * 0.3;
  return inputCost + outputCost + cacheCreationCost + cacheReadCost;
}

/**
 * Get dates for filtering
 */
function getDateRanges(): { today: string; weekAgo: string; monthAgo: string } {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  return {
    today: today.toISOString().split('T')[0]!,
    weekAgo: weekAgo.toISOString().split('T')[0]!,
    monthAgo: monthAgo.toISOString().split('T')[0]!,
  };
}

/**
 * Filter stats by date range
 */
function filterByDateRange(
  byDate: ParseResult['stats']['byDate'],
  startDate: string
): {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  messageCount: number;
  sessionCount: number;
  activeDays: number;
} {
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheCreationTokens = 0;
  let cacheReadTokens = 0;
  let messageCount = 0;
  let sessionCount = 0;
  let activeDays = 0;

  for (const [date, stats] of Object.entries(byDate)) {
    if (date >= startDate) {
      inputTokens += stats.inputTokens;
      outputTokens += stats.outputTokens;
      cacheCreationTokens += stats.cacheCreationTokens;
      cacheReadTokens += stats.cacheReadTokens;
      messageCount += stats.messageCount;
      sessionCount += stats.sessionCount;
      activeDays++;
    }
  }

  return {
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    messageCount,
    sessionCount,
    activeDays,
  };
}

/**
 * Print a horizontal divider
 */
function divider(char = '-', length = 50): void {
  console.log(char.repeat(length));
}

/**
 * Print a section header
 */
function sectionHeader(title: string): void {
  console.log('');
  console.log(`\x1b[1m${title}\x1b[0m`); // Bold text
  divider();
}

/**
 * Print a stat row with label and value
 */
function statRow(label: string, value: string, indent = 0): void {
  const padding = ' '.repeat(indent);
  const labelWidth = 20 - indent;
  console.log(`${padding}${label.padEnd(labelWidth)} ${value}`);
}

/**
 * Clear the current line and print progress
 */
function printProgress(processed: number, total: number): void {
  process.stdout.write(
    `\r  Processing: ${formatNumber(processed)}/${formatNumber(total)} files...`
  );
}

interface StatsOptions {
  verbose?: boolean;
  source?: string;
  period?: string;
}

export async function statsCommand(options: StatsOptions): Promise<void> {
  // Show header
  console.log('');
  console.log('\x1b[1m\x1b[38;5;208mburntop\x1b[0m - AI Usage Statistics');
  console.log('');

  const parsers = [
    new AiderParser(),
    new ClaudeCodeParser(),
    new ClineParser(),
    new CodexParser(),
    new ContinueParser(),
    new CursorParser(),
    new DroidParser(),
    new GeminiCliParser(),
    new KiloCodeParser(),
    new OpenCodeParser(),
    new RooCodeParser(),
  ];

  // Aggregate results from all parsers
  const aggregatedStats = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheCreationTokens: 0,
    totalCacheReadTokens: 0,
    sessionCount: 0,
    messageCount: 0,
    byModel: {} as ParseResult['stats']['byModel'],
    byDate: {} as ParseResult['stats']['byDate'],
  };

  let hasData = false;
  const sourceResults: Array<{ name: string; displayName: string; stats: ParseResult['stats'] }> =
    [];

  for (const parser of parsers) {
    // Skip if source filter is specified and doesn't match
    if (options.source && parser.name !== options.source) {
      continue;
    }

    const exists = await parser.exists();
    if (!exists) {
      continue;
    }

    process.stdout.write(`Scanning ${parser.displayName}...`);

    const result = await parser.parse({
      onProgress: printProgress,
    });

    // Clear progress line
    process.stdout.write('\r' + ' '.repeat(60) + '\r');

    if (result.records.length > 0) {
      hasData = true;
      sourceResults.push({
        name: parser.name,
        displayName: parser.displayName,
        stats: result.stats,
      });

      // Aggregate stats
      aggregatedStats.totalInputTokens += result.stats.totalInputTokens;
      aggregatedStats.totalOutputTokens += result.stats.totalOutputTokens;
      aggregatedStats.totalCacheCreationTokens += result.stats.totalCacheCreationTokens;
      aggregatedStats.totalCacheReadTokens += result.stats.totalCacheReadTokens;
      aggregatedStats.sessionCount += result.stats.sessionCount;
      aggregatedStats.messageCount += result.stats.messageCount;

      // Merge model stats
      for (const [model, stats] of Object.entries(result.stats.byModel)) {
        const existing = aggregatedStats.byModel[model];
        if (existing) {
          existing.inputTokens += stats.inputTokens;
          existing.outputTokens += stats.outputTokens;
          existing.cacheCreationTokens += stats.cacheCreationTokens;
          existing.cacheReadTokens += stats.cacheReadTokens;
          existing.messageCount += stats.messageCount;
        } else {
          aggregatedStats.byModel[model] = { ...stats };
        }
      }

      // Merge date stats
      for (const [date, stats] of Object.entries(result.stats.byDate)) {
        const existing = aggregatedStats.byDate[date];
        if (existing) {
          existing.inputTokens += stats.inputTokens;
          existing.outputTokens += stats.outputTokens;
          existing.cacheCreationTokens += stats.cacheCreationTokens;
          existing.cacheReadTokens += stats.cacheReadTokens;
          existing.messageCount += stats.messageCount;
          existing.sessionCount += stats.sessionCount;
        } else {
          aggregatedStats.byDate[date] = { ...stats };
        }
      }
    }
  }

  if (!hasData) {
    console.log('No AI usage data found.\n');
    console.log('Supported tools:');
    console.log('  - Aider (~/.aider/*.jsonl via --analytics-log)');
    console.log('  - Claude Code (~/.claude/projects/**/*.jsonl)');
    console.log('  - Cline (VS Code globalStorage/saoudrizwan.claude-dev/)');
    console.log('  - Continue (~/.continue/sessions/*.json)');
    console.log('  - Cursor (~/Library/Application Support/Cursor/User/globalStorage/state.vscdb)');
    console.log('  - Droid (~/.factory/sessions/*.settings.json)');
    console.log('  - Gemini CLI (~/.gemini/tmp/*/chats/session-*.json)');
    console.log('  - Kilo Code (VS Code globalStorage/kilocode.kilo-code/)');
    console.log('  - OpenCode (~/.local/share/opencode/storage/message/)');
    console.log('  - Roo Code (VS Code globalStorage/rooveterinaryinc.roo-cline/)\n');
    console.log('Get started by using one of these AI tools, then run `burntop stats` again.');
    return;
  }

  // Calculate totals
  const totalTokens =
    aggregatedStats.totalInputTokens +
    aggregatedStats.totalOutputTokens +
    aggregatedStats.totalCacheCreationTokens;

  const totalCost = estimateCost(
    aggregatedStats.totalInputTokens,
    aggregatedStats.totalOutputTokens,
    aggregatedStats.totalCacheCreationTokens,
    aggregatedStats.totalCacheReadTokens
  );

  // Get date ranges for time-based stats
  const dateRanges = getDateRanges();
  const todayStats = filterByDateRange(aggregatedStats.byDate, dateRanges.today);
  const weekStats = filterByDateRange(aggregatedStats.byDate, dateRanges.weekAgo);
  const monthStats = filterByDateRange(aggregatedStats.byDate, dateRanges.monthAgo);

  // Calculate all-time active days
  const allTimeDays = Object.keys(aggregatedStats.byDate).length;

  // === Overview Section ===
  sectionHeader('Overview');
  statRow('Total Tokens:', formatTokens(totalTokens));
  statRow('Est. Cost:', formatCost(totalCost));
  statRow('Sessions:', formatNumber(aggregatedStats.sessionCount));
  statRow('Messages:', formatNumber(aggregatedStats.messageCount));
  statRow('Active Days:', formatNumber(allTimeDays));

  // === Time Period Breakdown ===
  sectionHeader('Activity');
  const todayTokens =
    todayStats.inputTokens + todayStats.outputTokens + todayStats.cacheCreationTokens;
  const weekTokens = weekStats.inputTokens + weekStats.outputTokens + weekStats.cacheCreationTokens;
  const monthTokens =
    monthStats.inputTokens + monthStats.outputTokens + monthStats.cacheCreationTokens;

  const todayCost = estimateCost(
    todayStats.inputTokens,
    todayStats.outputTokens,
    todayStats.cacheCreationTokens,
    todayStats.cacheReadTokens
  );
  const weekCost = estimateCost(
    weekStats.inputTokens,
    weekStats.outputTokens,
    weekStats.cacheCreationTokens,
    weekStats.cacheReadTokens
  );
  const monthCost = estimateCost(
    monthStats.inputTokens,
    monthStats.outputTokens,
    monthStats.cacheCreationTokens,
    monthStats.cacheReadTokens
  );

  console.log('  Period          Tokens       Cost     Sessions');
  console.log('  ' + '-'.repeat(46));
  console.log(
    `  Today           ${formatTokens(todayTokens).padStart(8)}   ${formatCost(todayCost).padStart(8)}   ${formatNumber(todayStats.sessionCount).padStart(8)}`
  );
  console.log(
    `  Last 7 days     ${formatTokens(weekTokens).padStart(8)}   ${formatCost(weekCost).padStart(8)}   ${formatNumber(weekStats.sessionCount).padStart(8)}`
  );
  console.log(
    `  Last 30 days    ${formatTokens(monthTokens).padStart(8)}   ${formatCost(monthCost).padStart(8)}   ${formatNumber(monthStats.sessionCount).padStart(8)}`
  );

  // === Token Breakdown ===
  sectionHeader('Token Breakdown');
  const inputPct =
    totalTokens > 0 ? ((aggregatedStats.totalInputTokens / totalTokens) * 100).toFixed(1) : '0';
  const outputPct =
    totalTokens > 0 ? ((aggregatedStats.totalOutputTokens / totalTokens) * 100).toFixed(1) : '0';
  const cachePct =
    totalTokens > 0
      ? ((aggregatedStats.totalCacheCreationTokens / totalTokens) * 100).toFixed(1)
      : '0';

  statRow('Input:', `${formatTokens(aggregatedStats.totalInputTokens)} (${inputPct}%)`);
  statRow('Output:', `${formatTokens(aggregatedStats.totalOutputTokens)} (${outputPct}%)`);
  statRow(
    'Cache Creation:',
    `${formatTokens(aggregatedStats.totalCacheCreationTokens)} (${cachePct}%)`
  );
  statRow('Cache Read:', formatTokens(aggregatedStats.totalCacheReadTokens));

  // === Model Breakdown ===
  const models = Object.entries(aggregatedStats.byModel);
  if (models.length > 0) {
    sectionHeader('Top Models');
    // Sort by total tokens descending
    models.sort((a, b) => {
      const totalA = a[1].inputTokens + a[1].outputTokens + a[1].cacheCreationTokens;
      const totalB = b[1].inputTokens + b[1].outputTokens + b[1].cacheCreationTokens;
      return totalB - totalA;
    });

    const displayLimit = options.verbose ? 10 : 5;
    for (const [model, stats] of models.slice(0, displayLimit)) {
      const modelTotal = stats.inputTokens + stats.outputTokens + stats.cacheCreationTokens;
      const modelPct = totalTokens > 0 ? ((modelTotal / totalTokens) * 100).toFixed(1) : '0';
      const shortModel = model.length > 30 ? model.slice(0, 27) + '...' : model;
      console.log(
        `  ${shortModel.padEnd(32)} ${formatTokens(modelTotal).padStart(8)} (${modelPct}%)`
      );
    }
    if (models.length > displayLimit) {
      console.log(`  ... and ${models.length - displayLimit} more models`);
    }
  }

  // === Source Breakdown (if multiple sources) ===
  if (sourceResults.length > 1) {
    sectionHeader('By Source');
    for (const source of sourceResults) {
      const sourceTotal =
        source.stats.totalInputTokens +
        source.stats.totalOutputTokens +
        source.stats.totalCacheCreationTokens;
      const sourcePct = totalTokens > 0 ? ((sourceTotal / totalTokens) * 100).toFixed(1) : '0';
      console.log(
        `  ${source.displayName.padEnd(20)} ${formatTokens(sourceTotal).padStart(8)} (${sourcePct}%)`
      );
    }
  }

  // === Verbose: Date Range ===
  if (options.verbose) {
    const dates = Object.keys(aggregatedStats.byDate).sort();
    if (dates.length > 0) {
      sectionHeader('Date Range');
      statRow('First Activity:', dates[0]!);
      statRow('Last Activity:', dates[dates.length - 1]!);
      statRow('Total Days:', formatNumber(dates.length));
    }
  }

  // Footer
  console.log('');
  divider('=');
  console.log('Run `burntop sync` to upload stats to burntop.dev');
  console.log('');
}
