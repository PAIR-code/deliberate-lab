import { Type, type Static } from '@sinclair/typebox';
import { ITEM_NAMES } from '../types/lost_at_sea.types';

export const ItemData = Type.Union(ITEM_NAMES.map((item) => Type.Literal(item)));
export type ItemData = Static<typeof ItemData>;
