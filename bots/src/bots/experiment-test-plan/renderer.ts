import type {ExperimentTestPlanEvaluation} from './types.js';

export interface RenderOptions {
  missingApiKey?: boolean;
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
    return (
      header +
      `⚠️ **Evaluation Paused: Missing \`GEMINI_API_KEY\`**\n\n` +
      `The \`GEMINI_API_KEY\` secret is not configured in this environment. To enable automatic experiment test plan evaluation and tentative plan drafting, please configure the \`GEMINI_API_KEY\` secret in repository Actions secrets.\n\n` +
      `*This check failed closed cleanly without interrupting CI.*`
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

  // Runtime change missing test plan: Proactive co-author drafting
  const plan = evaluation.suggestedTentativePlan;
  let suggestionSection = '';

  if (plan) {
    suggestionSection =
      `#### 💡 Suggested Tentative Test Plan\n` +
      `*Deduced from your code changes. Please review, adopt, or refine this in your PR description:*\n\n` +
      `1. **Experiment Template**: ${plan.experimentTemplate}\n` +
      `2. **Stages Sequence**: ${plan.stagesSequence}\n` +
      `3. **Human Cohort**: ${plan.humanParticipants}\n` +
      `4. **Agent Mediator**: ${plan.agentMediator}\n` +
      `5. **Agent Participants**: ${plan.agentParticipants}\n` +
      `6. **Tester Actions**: ${plan.participantActions}\n` +
      `7. **Expected Behavior**: ${plan.successCriteria}\n\n`;
  }

  return (
    header +
    `⚠️ **Manual Experiment Test Plan Needed**\n\n` +
    `This pull request alters runtime application behavior, but complete manual verification steps were not provided.\n\n` +
    `**Classification Rationale**: ${evaluation.classificationRationale}\n\n` +
    (evaluation.missingElements.length > 0
      ? `**Missing Elements**: ${evaluation.missingElements.join(', ')}\n\n`
      : '') +
    suggestionSection +
    `---\n` +
    `*To resolve this check, please add the manual test steps to your PR description.*`
  );
}
