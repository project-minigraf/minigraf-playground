export interface MinigrafResult {
  variables?: string[];
  results?: string[][];
  transacted?: number;
  retracted?: number;
  ok?: boolean;
}

export interface UseMinigrafReturn {
  db: BrowserDb | null;
  isLoading: boolean;
  error: Error | null;
  execute: (datalog: string) => Promise<MinigrafResult>;
}

export interface BrowserDb {
  free(): void;
  checkpoint(): Promise<void>;
  execute(datalog: string): Promise<string>;
  exportGraph(): Uint8Array;
  importGraph(data: Uint8Array): Promise<void>;
}