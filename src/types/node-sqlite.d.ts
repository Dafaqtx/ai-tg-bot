declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string, options?: { open?: boolean });

    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    isOpen: boolean;
    open(): void;
    backup(destination: string): void;
  }

  export class StatementSync {
    all(...params: any[]): any[];
    get(...params: any[]): any;
    run(...params: any[]): { changes: number; lastInsertRowid: number };
    iterate(...params: any[]): IterableIterator<any>;
    columns(): { name: string; type: string }[];
  }

  export function backup(source: DatabaseSync, destination: string): void;
}
