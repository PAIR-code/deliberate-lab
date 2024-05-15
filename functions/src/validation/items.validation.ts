import { ITEM_NAMES } from '@llm-mediation-experiments/utils';
import { Type } from '@sinclair/typebox';

export const ItemData = Type.Union(ITEM_NAMES.map((item) => Type.Literal(item)));
