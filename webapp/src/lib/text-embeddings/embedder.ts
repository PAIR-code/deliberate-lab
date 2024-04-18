import { SimpleError } from "../simple-errors/simple-errors";

export interface Embedding {
  embedding: number[];
}

export interface EmbedError {
  error: string;
}

export abstract class Embedder<Params extends {}> {
  public abstract name: string;

  abstract embed(prompt: string, params?: Params): Promise<Embedding | SimpleError>;
}
