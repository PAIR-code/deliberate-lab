/** LLM config for chat mediation */

export interface MediatorConfig {
  id: string;
  kind: MediatorKind;
  name: string; // Name of mediator
  avatar: string; // Emoji used for mediator
  model: string; // Name of Gemini API model
  prompt: string;
  chatContext: ChatContext;
  filterMediatorMessages: boolean; // Don't send MediatorMessages to LLM
}

export enum MediatorKind {
  Automatic = 'automatic', // Automatically sends in response to group chat
  Manual = 'manual',  // Experimenters send mediation messages on click
}

export enum ChatContext {
  Message = 'message', // Only send last message
  Discussion = 'discussion', // Only include chats after last discussion
  All = 'all',  // Include entire chat history
}