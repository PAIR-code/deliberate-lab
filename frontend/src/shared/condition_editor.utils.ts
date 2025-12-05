import {html, nothing} from 'lit';
import {Condition, ConditionTarget} from '@deliberation-lab/utils';

// Ensure condition-editor component is registered
import '../components/stages/condition_editor';

export interface RenderConditionEditorOptions {
  condition: Condition | undefined;
  targets: ConditionTarget[];
  showAlphaFeatures: boolean | undefined;
  canEdit: boolean;
  onConditionChange: (condition: Condition | undefined) => void;
}

/**
 * Render a condition editor with standard checks.
 * Returns nothing if alpha features are disabled or there are no valid targets.
 */
export function renderConditionEditor(options: RenderConditionEditorOptions) {
  const {condition, targets, showAlphaFeatures, canEdit, onConditionChange} =
    options;

  if (!showAlphaFeatures) return nothing; // Treats undefined as false
  if (targets.length === 0) return nothing;

  return html`
    <condition-editor
      .condition=${condition}
      .targets=${targets}
      .disabled=${!canEdit}
      .onConditionChange=${onConditionChange}
    ></condition-editor>
  `;
}
