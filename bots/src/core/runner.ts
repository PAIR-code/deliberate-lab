import process from 'node:process';
import type {PRReviewBot} from './types.js';
import {loadPRContext} from './pr-context.js';
import {postOrUpdateComment} from './comment-manager.js';
import {HelloWorldBot} from '../bots/hello-world/bot.js';
import {ExperimentTestPlanBot} from '../bots/experiment-test-plan/bot.js';

// Registry of available review bots
const AVAILABLE_BOTS: PRReviewBot[] = [
  new HelloWorldBot(),
  new ExperimentTestPlanBot(),
];

interface CliArgs {
  botId?: string;
  prNumber?: number;
  owner?: string;
  repo?: string;
  dryRun: boolean;
}

function parseArgs(args: string[]): CliArgs {
  const parsed: CliArgs = {dryRun: false};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--bot' && args[i + 1]) {
      parsed.botId = args[++i];
    } else if (arg === '--pr' && args[i + 1]) {
      parsed.prNumber = parseInt(args[++i], 10);
    } else if (arg === '--owner' && args[i + 1]) {
      parsed.owner = args[++i];
    } else if (arg === '--repo' && args[i + 1]) {
      parsed.repo = args[++i];
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    }
  }

  return parsed;
}

export async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  console.log('🤖 Deliberate Lab PR Review Bot Runner');
  console.log('----------------------------------------');

  const context = await loadPRContext({
    owner: args.owner,
    repo: args.repo,
    prNumber: args.prNumber,
  });

  console.log(`Repository: ${context.owner}/${context.repo}`);
  console.log(`Pull Request: #${context.prNumber} ("${context.title}")`);
  console.log(`Author: @${context.author}`);
  console.log(`Head SHA: ${context.headSha}`);
  console.log(`Files Changed: ${context.files.length}`);
  console.log('----------------------------------------');

  const botsToRun =
    args.botId && args.botId !== 'all'
      ? AVAILABLE_BOTS.filter((b) => b.id === args.botId)
      : AVAILABLE_BOTS;

  if (botsToRun.length === 0) {
    console.error(`[ERROR] No bot found matching ID "${args.botId}".`);
    console.error(
      `Available bots: ${AVAILABLE_BOTS.map((b) => b.id).join(', ')}`,
    );
    process.exit(1);
  }

  for (const bot of botsToRun) {
    console.log(`\n▶ Running Bot: ${bot.name} (id: ${bot.id})`);

    if (!bot.shouldRun(context)) {
      console.log(`  [SKIP] Bot indicated shouldRun = false.`);
      continue;
    }

    console.log('  Evaluating PR...');
    const evaluation = await bot.evaluate(context);
    console.log(
      `  Evaluation result: [${evaluation.status.toUpperCase()}] ${evaluation.summary}`,
    );

    const commentBody = bot.renderComment(context, evaluation);
    const result = await postOrUpdateComment(context, {
      botId: bot.id,
      markdownBody: commentBody,
      dryRun: args.dryRun,
    });

    if (result.action === 'skipped_dry_run') {
      console.log('  [DRY RUN] Completed without updating GitHub.');
    } else {
      console.log(
        `  [OK] Comment ${result.action}: ${result.url || result.commentId}`,
      );
    }
  }

  console.log('\n✅ All bot evaluations finished successfully.');
}

// Execute if run directly
if (
  import.meta.url.endsWith(process.argv[1]) ||
  process.argv[1]?.includes('runner')
) {
  main().catch((err) => {
    console.error('\n❌ Fatal error in bot runner:');
    console.error(err);
    process.exit(1);
  });
}
