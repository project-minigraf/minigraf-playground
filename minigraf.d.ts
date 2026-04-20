declare module '/wasm/pkg/minigraf.js' {
  const init: () => Promise<void>;

  class BrowserDb {
    free(): void;
    checkpoint(): Promise<void>;
    execute(datalog: string): Promise<string>;
    exportGraph(): Uint8Array;
    importGraph(data: Uint8Array): Promise<void>;
    static open(dbName: string): Promise<BrowserDb>;
    static openInMemory(): BrowserDb;
  }

  export default init;
  export { BrowserDb };
}