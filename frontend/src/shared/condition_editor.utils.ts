import {html, nothing} from 'lit';
import {Condition, ConditionTarget} from '@deliberation-lab/utils';

// Ensure condition-editor component is registered
import '../components/stages/condition_editor';

export interface RenderConditionEditorOptions {
  condition: Condition | undefined;
  targets: ConditionTarget[];
  canEdit: boolean;
  onConditionChange: (condition: Condition | undefined) => void;
  /** Whether to allow aggregation conditions (defaults to true) */
  allowAggregation?: boolean;
}

/**
 * Render a condition editor with standard checks.
 * Returns nothing if there are no valid targets.
 */
export function renderConditionEditor(options: RenderConditionEditorOptions) {
  const {
    condition,
    targets,
    canEdit,
    onConditionChange,
    allowAggregation = true,
  } = options;

  if (targets.length === 0) return nothing;

  return html`
    <condition-editor
      .condition=${condition}
      .targets=${targets}
      .disabled=${!canEdit}
      .allowAggregation=${allowAggregation}
      .onConditionChange=${onConditionChange}
    ></condition-editor>
  `;
}
