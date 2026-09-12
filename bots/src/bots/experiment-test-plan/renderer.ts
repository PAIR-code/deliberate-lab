import type {ExperimentTestPlanEvaluation} from './types.js';
import type {BotEvaluation, PRContext} from '../../core/types.js';

export interface RenderOptions {
  missingApiKey?: boolean;
  context?: PRContext;
}

/**
 * Generate a pre-populated GitHub issue URL for filing bug reports against the bot.
 */
export function buildBugReportUrl(
  context: PRContext | undefined,
  reason: string,
  details?: string,
): string {
  const owner = context?.owner || 'PAIR-code';
  const repo = context?.repo || 'deliberate-lab';
  const prTag = context?.prNumber ? ` on PR #${context.prNumber}` : '';
  const title = `bug(bots): Experiment Test Plan Assistant failure${prTag}`;

  const bodyLines = [
    '### Bot Failure Report',
    `- **PR**: #${context?.prNumber || 'unknown'} (${context?.title || 'unknown'})`,
    `- **Author**: @${context?.author || 'unknown'}`,
    `- **Head SHA**: \`${context?.headSha ? context.headSha.slice(0, 8) : 'unknown'}\``,
    `- **Reason**: ${reason}`,
    '',
  ];

  if (details) {
    bodyLines.push(
      '### Error Details',
      '```',
      details.slice(0, 1500),
      '```',
      '',
    );
  }

  bodyLines.push(
    '### Context',
    'Encountered persistent failure during Experiment Test Plan Assistant evaluation in GitHub Actions.',
  );

  const params = new URLSearchParams({
    title,
    body: bodyLines.join('\n'),
    labels: 'area:ci-deploy',
  });

  return `https://github.com/${owner}/${repo}/issues/new?${params.toString()}`;
}

/**
 * Render unexpected evaluation errors into a clean, actionable GitHub comment.
 */
export function renderErrorComment(
  context: PRContext,
  evaluation: BotEvaluation,
): string {
  const header = '### 🧪 Deliberate Lab • Experiment Test Plan Assistant\n\n';
  const bugUrl = buildBugReportUrl(
    context,
    evaluation.summary,
    evaluation.details,
  );

  return (
    header +
    `⚠️ **Evaluation Blocked: Upstream Service Error**\n\n` +
    `The assistant could not complete its evaluation because an upstream service error occurred:\n` +
    `> ${evaluation.summary}\n\n` +
    `*This check failed closed cleanly (blocking merge until resolved).* \n\n` +
    (evaluation.details
      ? `<details>\n<summary>Technical Error Details</summary>\n\n\`\`\`\n${evaluation.details.slice(0, 2000)}\n\`\`\`\n</details>\n\n`
      : '') +
    `---\n\n` +
    `#### 🔄 How to Re-run\n` +
    `- **Re-run Check**: In the PR's **Checks** tab, select **PR Review Bots** and click **Re-run all jobs**.\n` +
    `- **Trigger via Commit**: Push a new commit or close and reopen this PR to re-trigger once upstream services recover.\n` +
    `- **Persistent Failure**: If this issue persists across retries, please [file a bug report](${bugUrl}).`
  );
}

/**
 * Render ExperimentTestPlanEvaluation into GitHub-flavored Markdown.
 */
export function renderTestPlanComment(
  evaluation: ExperimentTestPlanEvaluation,
  options: RenderOptions = {},
): string {
  const header = '### 🧪 Deliberate Lab • Experiment Test Plan Assistant\n\n';

  if (options.missingApiKey) {
    const bugUrl = buildBugReportUrl(
      options.context,
      'Missing GEMINI_API_KEY secret in repository Actions secrets',
    );
    return (
      header +
      `⚠️ **Evaluation Blocked: Missing \`GEMINI_API_KEY\`**\n\n` +
      `The \`GEMINI_API_KEY\` secret is not configured in this environment. To enable automatic experiment test plan evaluation and tentative plan drafting, please configure the \`GEMINI_API_KEY\` secret in repository Actions secrets.\n\n` +
      `*This check failed closed cleanly (blocking merge until resolved).*\n\n` +
      `---\n\n` +
      `#### 🔄 How to Resolve\n` +
      `- **Maintainers**: Configure \`GEMINI_API_KEY\` in [Repository Settings > Secrets > Actions](https://github.com/PAIR-code/deliberate-lab/settings/secrets/actions).\n` +
      `- **Re-run Check**: Once the secret is configured, go to the PR's **Checks** tab and click **Re-run all jobs**.\n` +
      `- **Persistent Issues**: [File a bug report](${bugUrl})`
    );
  }

  // Non-runtime change scenario
  if (!evaluation.isRuntimeBehaviorChange) {
    return (
      header +
      `ℹ️ **Non-Runtime Change Detected**\n\n` +
      `${evaluation.classificationRationale}\n\n` +
      `*Manual experiment verification is not required for non-runtime pull requests (documentation, CI/CD workflows, developer tooling, or chores).*`
    );
  }

  // Runtime change with complete manual plan
  if (evaluation.hasManualTestPlan) {
    const details = evaluation.manualPlanDetails || {};
    return (
      header +
      `✅ **Manual Experiment Test Plan Verified**\n\n` +
      `This PR modifies runtime behavior and provides manual test verification steps covering Deliberate Lab's experiment topology:\n\n` +
      `| Topology Component | Verified Details |\n` +
      `| :--- | :--- |\n` +
      `| **Experiment Template** | ${details.experimentTemplate || 'Specified'} |\n` +
      `| **Stage Sequence** | ${details.stagesSequence || 'Specified'} |\n` +
      `| **Human Cohort** | ${details.humanParticipants || 'Specified'} |\n` +
      `| **Agent Mediator** | ${details.agentMediator || 'None / Default'} |\n` +
      `| **Agent Participants** | ${details.agentParticipants || 'None / Default'} |\n` +
      `| **Participant Actions** | ${details.participantActions || 'Specified'} |\n` +
      `| **Success Criteria** | ${details.successCriteria || 'Specified'} |\n\n` +
      `*Test plan verified. Reviewers can use these steps to evaluate the experiment.*`
    );
  }

  // Tier 4: Runtime change missing test plan, but confidently deduced by Gemini (CI Passes)
  const hasDeducedPlan =
    evaluation.canDeducePlan !== false &&
    Boolean(evaluation.suggestedTentativePlan);

  if (hasDeducedPlan && evaluation.suggestedTentativePlan) {
    const plan = evaluation.suggestedTentativePlan;
    return (
      header +
      `💡 **Draft Manual Experiment Test Plan (Ready for Review)**\n\n` +
      `This pull request alters runtime application behavior. While manual verification steps were not provided in the PR description, a tentative 7-step test plan was synthesized from the code changes:\n\n` +
      `**Classification Rationale**: ${evaluation.classificationRationale}\n\n` +
      `#### 📋 Suggested Test Plan\n` +
      `1. **Experiment Template**: ${plan.experimentTemplate}\n` +
      `2. **Stages Sequence**: ${plan.stagesSequence}\n` +
      `3. **Human Cohort**: ${plan.humanParticipants}\n` +
      `4. **Agent Mediator**: ${plan.agentMediator}\n` +
      `5. **Agent Participants**: ${plan.agentParticipants}\n` +
      `6. **Tester Actions**: ${plan.participantActions}\n` +
      `7. **Expected Behavior**: ${plan.successCriteria}\n\n` +
      `---\n\n` +
      `*✅ **CI Status: Passed** — Reviewers and maintainers can use this draft test plan to verify the PR locally. Authors are encouraged to adopt or refine these steps in their PR description.*`
    );
  }

  // Tier 5: Runtime change missing test plan, and cannot be deduced (CI Fails Closed)
  const bugUrl = buildBugReportUrl(
    options.context,
    'Potential misclassification or test plan synthesis failure',
    `Rationale: ${evaluation.classificationRationale}\nMissing: ${evaluation.missingElements.join(', ')}\nGuidance Needed: ${evaluation.guidanceNeededReason || 'Opaque diff'}`,
  );

  return (
    header +
    `⚠️ **Manual Experiment Test Plan Guidance Required**\n\n` +
    `This pull request alters runtime application behavior, but complete manual verification steps were not provided and could not be confidently deduced from the code changes.\n\n` +
    `**Classification Rationale**: ${evaluation.classificationRationale}\n\n` +
    `**Why Author Guidance Is Needed**:\n` +
    `${evaluation.guidanceNeededReason || 'The changes to runtime behavior are too complex or opaque to deduce a realistic 7-step test plan automatically.'}\n\n` +
    (evaluation.missingElements.length > 0
      ? `**Missing Topology Elements**: ${evaluation.missingElements.join(', ')}\n\n`
      : '') +
    `---\n\n` +
    `#### 🔄 How to Resolve\n` +
    `1. Update your PR description to include step-by-step manual test instructions addressing the 7-part experiment topology (Template, Stages, Human Cohort, Agent Mediator, Agent Participants, Actions, Expected Behavior).\n` +
    `2. Re-run this check by clicking **Re-run all jobs** under the **Checks** tab (or push an update to your PR).\n` +
    `3. If you believe this PR was misclassified or if this check is failing persistently, please [file a bug report](${bugUrl}).\n\n` +
    `*❌ **CI Status: Blocked** — Manual experiment verification instructions are required from the author before this PR can be merged.*`
  );
}
