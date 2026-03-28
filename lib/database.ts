import * as SQLite from 'expo-sqlite';

export interface LocalTransaction {
  id?: number;
  localId: string; // UUID for local tracking
  amount: number;
  date: string;
  description?: string;
  categoryId: number;
  syncStatus: 'pending' | 'synced' | 'error';
  serverId?: number; // ID from server after sync
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface LocalCategory {
  id: number;
  name: string;
  type: string;
  icon: string;
  color: string;
  isDefault?: boolean;
  syncStatus: 'synced';
}

class Database {
  private db: SQLite.WebSQLDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;

  async init() {
    // If already initialized, return immediately
    if (this.isInitialized && this.db) return;
    
    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }
    
    // Start initialization
    this.initPromise = this._doInit();
    
    try {
      await this.initPromise;
      this.isInitialized = true;
    } finally {
      this.initPromise = null;
    }
  }

  private async _doInit() {
    if (this.db) return;
    
    this.db = SQLite.openDatabase('frugify.db');
    
    // Create tables using transaction
    return new Promise<void>((resolve, reject) => {
      this.db!.transaction(
        tx => {
          // Create transactions table
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS transactions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              localId TEXT UNIQUE NOT NULL,
              amount REAL NOT NULL,
              date TEXT NOT NULL,
              description TEXT,
              categoryId INTEGER NOT NULL,
              syncStatus TEXT NOT NULL DEFAULT 'pending',
              serverId INTEGER,
              errorMessage TEXT,
              createdAt INTEGER NOT NULL,
              updatedAt INTEGER NOT NULL
            );`
          );
          
          tx.executeSql(
            `CREATE INDEX IF NOT EXISTS idx_transactions_syncStatus ON transactions(syncStatus);`
          );
          tx.executeSql(
            `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);`
          );
          tx.executeSql(
            `CREATE INDEX IF NOT EXISTS idx_transactions_localId ON transactions(localId);`
          );

          // Create categories cache table
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS categories (
              id INTEGER PRIMARY KEY,
              name TEXT NOT NULL,
              type TEXT NOT NULL,
              icon TEXT NOT NULL,
              color TEXT NOT NULL,
              isDefault INTEGER DEFAULT 0,
              syncStatus TEXT NOT NULL DEFAULT 'synced'
            );`
          );
        },
        error => {
          console.error('Database initialization error:', error);
          this.db = null; // Reset db so it can be retried
          reject(error);
        },
        () => {
          console.log('Database initialized');
          resolve();
        }
      );
    });
  }

  // Transaction operations
  async addTransaction(transaction: Omit<LocalTransaction, 'id'>): Promise<LocalTransaction> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      this.db!.transaction(
        tx => {
          tx.executeSql(
            `INSERT INTO transactions (localId, amount, date, description, categoryId, syncStatus, serverId, errorMessage, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              transaction.localId,
              transaction.amount,
              transaction.date,
              transaction.description || null,
              transaction.categoryId,
              transaction.syncStatus,
              transaction.serverId || null,
              transaction.errorMessage || null,
              transaction.createdAt,
              transaction.updatedAt,
            ],
            (_, result) => {
              resolve({
                ...transaction,
                id: result.insertId,
              });
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  async updateTransaction(localId: string, updates: Partial<LocalTransaction>): Promise<void> {
    await this.init();
    
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'localId') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    values.push(Date.now());
    fields.push('updatedAt = ?');
    values.push(localId);

    return new Promise((resolve, reject) => {
      this.db!.transaction(
        tx => {
          tx.executeSql(
            `UPDATE transactions SET ${fields.join(', ')} WHERE localId = ?`,
            values,
            () => resolve(),
            (_, error) => {
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  async deleteTransaction(localId: string): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      this.db!.transaction(
        tx => {
          tx.executeSql(
            'DELETE FROM transactions WHERE localId = ?',
            [localId],
            () => resolve(),
            (_, error) => {
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  async getTransaction(localId: string): Promise<LocalTransaction | null> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      this.db!.transaction(
        tx => {
          tx.executeSql(
            'SELECT * FROM transactions WHERE localId = ?',
            [localId],
            (_, result) => {
              if (result.rows.length > 0) {
                resolve(result.rows.item(0) as LocalTransaction);
              } else {
                resolve(null);
              }
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  async getTransactionsByDateRange(startDate: string, endDate: string): Promise<LocalTransaction[]> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      this.db!.transaction(
        tx => {
          tx.executeSql(
            'SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date DESC, createdAt DESC',
            [startDate, endDate],
            (_, result) => {
              const transactions: LocalTransaction[] = [];
              for (let i = 0; i < result.rows.length; i++) {
                transactions.push(result.rows.item(i) as LocalTransaction);
              }
              resolve(transactions);
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  async getPendingTransactions(): Promise<LocalTransaction[]> {
    await this.init();
    
    // Return empty array if not initialized to prevent lock errors
    if (!this.isInitialized || !this.db) {
      return [];
    }
    
    return new Promise((resolve, reject) => {
      this.db!.transaction(
        tx => {
          tx.executeSql(
            "SELECT * FROM transactions WHERE syncStatus = 'pending' ORDER BY createdAt ASC",
            [],
            (_, result) => {
              const transactions: LocalTransaction[] = [];
              for (let i = 0; i < result.rows.length; i++) {
                transactions.push(result.rows.item(i) as LocalTransaction);
              }
              resolve(transactions);
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  async getErrorTransactions(): Promise<LocalTransaction[]> {
    await this.init();
    
    // Return empty array if not initialized to prevent lock errors
    if (!this.isInitialized || !this.db) {
      return [];
    }
    
    return new Promise((resolve, reject) => {
      this.db!.transaction(
        tx => {
          tx.executeSql(
            "SELECT * FROM transactions WHERE syncStatus = 'error' ORDER BY createdAt DESC",
            [],
            (_, result) => {
              const transactions: LocalTransaction[] = [];
              for (let i = 0; i < result.rows.length; i++) {
                transactions.push(result.rows.item(i) as LocalTransaction);
              }
              resolve(transactions);
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  // Category operations
  async upsertCategories(categories: LocalCategory[]): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      this.db!.transaction(
        tx => {
          for (const category of categories) {
            tx.executeSql(
              `INSERT OR REPLACE INTO categories (id, name, type, icon, color, isDefault, syncStatus)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                category.id,
                category.name,
                category.type,
                category.icon,
                category.color,
                category.isDefault ? 1 : 0,
                category.syncStatus,
              ]
            );
          }
        },
        error => reject(error),
        () => resolve()
      );
    });
  }

  async getCategories(type?: string): Promise<LocalCategory[]> {
    await this.init();
    
    const query = type
      ? 'SELECT * FROM categories WHERE type = ? ORDER BY name'
      : 'SELECT * FROM categories ORDER BY name';
    
    const params = type ? [type] : [];
    
    return new Promise((resolve, reject) => {
      this.db!.transaction(
        tx => {
          tx.executeSql(
            query,
            params,
            (_, result) => {
              const categories: LocalCategory[] = [];
              for (let i = 0; i < result.rows.length; i++) {
                const row = result.rows.item(i);
                categories.push({
                  ...row,
                  isDefault: row.isDefault === 1,
                });
              }
              resolve(categories);
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  async getCategory(id: number): Promise<LocalCategory | null> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      this.db!.transaction(
        tx => {
          tx.executeSql(
            'SELECT * FROM categories WHERE id = ?',
            [id],
            (_, result) => {
              if (result.rows.length > 0) {
                const row = result.rows.item(0);
                resolve({
                  ...row,
                  isDefault: row.isDefault === 1,
                });
              } else {
                resolve(null);
              }
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  // Clear all data (for logout)
  async clearAll(): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      this.db!.transaction(
        tx => {
          tx.executeSql('DELETE FROM transactions');
          tx.executeSql('DELETE FROM categories');
        },
        error => reject(error),
        () => resolve()
      );
    });
  }
}

// Use global to preserve database instance across hot reloads in development
const globalAny: any = global;
if (!globalAny.__frugifyDatabase) {
  globalAny.__frugifyDatabase = new Database();
}
export const database: Database = globalAny.__frugifyDatabase;
