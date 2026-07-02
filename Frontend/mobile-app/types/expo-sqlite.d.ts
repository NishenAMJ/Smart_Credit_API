declare module 'expo-sqlite' {
  interface SQLResultSetRowList {
    getAllSync(): any[];
  }

  interface SQLStatement {
    executeSync(params?: Record<string, any>): {
      getAllSync(): any[];
    };
  }

  interface SQLiteDatabase {
    execSync(sql: string): void;
    runSync(sql: string, params?: any[]): void;
    prepareSync(sql: string): SQLStatement;
  }

  export function openDatabaseSync(name: string): SQLiteDatabase;

  // Legacy API support
  export function openDatabase(
    name: string,
    successCallback?: (db: SQLiteDatabase) => void,
    errorCallback?: (error: Error) => void,
  ): { transaction: (callback: (tx: any) => void) => void };
}