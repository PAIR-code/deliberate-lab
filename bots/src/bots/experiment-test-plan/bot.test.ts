import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {ExperimentTestPlanBot} from './bot.js';
import {renderTestPlanComment} from './renderer.js';
import type {ExperimentTestPlanEvaluation} from './types.js';
import type {PRContext} from '../../core/types.js';

const mockContext: PRContext = {
  owner: 'PAIR-code',
  repo: 'deliberate-lab',
  prNumber: 999,
  title: 'feat(stage): add new QuizStage component',
  body: 'Implements the QuizStage for participants.',
  author: 'contributor',
  baseRef: 'main',
  headRef: 'feature/quiz-stage',
  headSha: '1234567890abcdef',
  isDraft: false,
  labels: ['feature'],
  files: [
    {
      filename: 'frontend/src/stages/quiz_stage.ts',
      status: 'added',
      additions: 120,
      deletions: 0,
      changes: 120,
      patch: '+export class QuizStage extends BaseStage {}',
    },
  ],
};

describe('ExperimentTestPlanBot', () => {
  const bot = new ExperimentTestPlanBot();

  it('has correct id and name', () => {
    assert.equal(bot.id, 'experiment-test-plan');
    assert.match(bot.name, /Experiment Test Plan Assistant/);
  });

  it('skips draft PRs and runs on ready PRs', () => {
    assert.equal(bot.shouldRun({...mockContext, isDraft: true}), false);
    assert.equal(bot.shouldRun({...mockContext, isDraft: false}), true);
  });

  it('fails closed when GEMINI_API_KEY is not set', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const evaluation = await bot.evaluate(mockContext);
      assert.equal(evaluation.status, 'warn');
      assert.match(evaluation.summary, /GEMINI_API_KEY/);
      assert.equal(evaluation.metadata?.missingApiKey, true);

      const comment = bot.renderComment(mockContext, evaluation);
      assert.match(comment, /Missing `GEMINI_API_KEY`/);
      assert.match(comment, /failed closed cleanly/);
    } finally {
      if (originalKey) {
        process.env.GEMINI_API_KEY = originalKey;
      }
    }
  });

  it('renders non-runtime change comment correctly', () => {
    const nonRuntimeEval: ExperimentTestPlanEvaluation = {
      isRuntimeBehaviorChange: false,
      classificationRationale:
        'Only documentation and CI workflow changes were detected.',
      hasManualTestPlan: false,
      missingElements: [],
    };

    const comment = renderTestPlanComment(nonRuntimeEval);
    assert.match(comment, /Non-Runtime Change Detected/);
    assert.match(comment, /Manual experiment verification is not required/);
  });

  it('renders verified plan comment correctly', () => {
    const verifiedEval: ExperimentTestPlanEvaluation = {
      isRuntimeBehaviorChange: true,
      classificationRationale: 'Adds new quiz stage.',
      hasManualTestPlan: true,
      manualPlanDetails: {
        experimentTemplate: 'Chat and Quiz Template',
        stagesSequence: 'Profile -> Quiz -> Chat -> Survey',
        humanParticipants: '2',
        agentMediator: 'None',
        agentParticipants: '1 agent persona',
        participantActions: 'Complete quiz and observe score persistence',
        successCriteria: 'Score saves to participant variables cleanly',
      },
      missingElements: [],
    };

    const comment = renderTestPlanComment(verifiedEval);
    assert.match(comment, /Manual Experiment Test Plan Verified/);
    assert.match(comment, /Chat and Quiz Template/);
    assert.match(comment, /Score saves to participant variables/);
  });

  it('renders suggested tentative plan when manual plan is missing', () => {
    const missingEval: ExperimentTestPlanEvaluation = {
      isRuntimeBehaviorChange: true,
      classificationRationale:
        'Introduces new QuizStage runtime component without test plan.',
      hasManualTestPlan: false,
      missingElements: ['stagesSequence', 'participantActions'],
      suggestedTentativePlan: {
        experimentTemplate: 'Default Experiment',
        stagesSequence: 'QuizStage -> SurveyStage',
        humanParticipants: '1 Human',
        agentMediator: 'None',
        agentParticipants: 'None',
        participantActions: 'Submit answers in QuizStage',
        successCriteria: 'Survey stage unlocks upon submission',
      },
    };

    const comment = renderTestPlanComment(missingEval);
    assert.match(comment, /Manual Experiment Test Plan Needed/);
    assert.match(comment, /Suggested Tentative Test Plan/);
    assert.match(comment, /QuizStage -> SurveyStage/);
    assert.match(comment, /Survey stage unlocks upon submission/);
  });
});
