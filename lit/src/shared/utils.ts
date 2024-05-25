/**
 * Shared utils functions.
 */

import { v4 as uuidv4 } from "uuid";
import { ChatStage, InfoStage, Profile, StageType } from "./types";

/** Generate unique id. */
export function generateId(): string {
  return uuidv4();
}

/** Generate blank chat stage. */
export function createBlankChatStage(): ChatStage {
  return {
    type: StageType.CHAT,
    id: generateId(),
    name: "Untitled chat",
    profiles: [],
    messages: []
  };
}

/** Generate blank profile. */
export function createBlankProfile(): Profile {
  return { id: generateId(), name: "", pronouns: "", avatar: "" };
}

/** Generate blank info stage. */
export function createBlankInfoStage(): InfoStage {
  return {
    type: StageType.INFO,
    id: generateId(),
    name: "Untitled info",
    content: "",
    acknowledgment: false
  };
}