/**
 * History Manager with IP Address Tracking
 * Stores all cracking attempts and results
 */

export interface CrackHistory {
  id: string;
  timestamp: number;
  ipAddress: string;
  targetHash: string;
  hashType: string;
  attackMethod: string;
  costFactor?: number;
  success: boolean;
  password?: string;
  attempts: number;
  timeTaken: number;
  passwordsScanned: number;
  mode: 'normal' | 'ultra' | 'mega';
}

export class HistoryManager {
  private static STORAGE_KEY = 'hashCrackerHistory';
  private static MAX_HISTORY = 100;

  /**
   * Get user's IP address (client-side approximation)
   */
  static async getClientIP(): Promise<string> {
    try {
      // Try to get IP from ipify API
      const response = await fetch('https://api.ipify.org?format=json', { 
        signal: AbortSignal.timeout(3000) 
      });
      const data = await response.json();
      return data.ip || 'Unknown';
    } catch (error) {
      // Fallback to local identifier
      return 'Local-' + Math.random().toString(36).substring(7);
    }
  }

  /**
   * Add entry to history
   */
  static async addHistory(entry: Omit<CrackHistory, 'id' | 'timestamp' | 'ipAddress'>): Promise<void> {
    try {
      const history = this.getHistory();
      const ipAddress = await this.getClientIP();
      
      const newEntry: CrackHistory = {
        ...entry,
        id: `crack_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        timestamp: Date.now(),
        ipAddress,
      };

      history.unshift(newEntry);
      
      // Keep only last 100 entries
      if (history.length > this.MAX_HISTORY) {
        history.splice(this.MAX_HISTORY);
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }

  /**
   * Get all history
   */
  static getHistory(): CrackHistory[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load history:', error);
      return [];
    }
  }

  /**
   * Get history stats
   */
  static getStats(): {
    totalAttempts: number;
    successfulCracks: number;
    totalPasswordsTested: number;
    mostUsedMethod: string;
    averageTime: number;
  } {
    const history = this.getHistory();
    
    if (history.length === 0) {
      return {
        totalAttempts: 0,
        successfulCracks: 0,
        totalPasswordsTested: 0,
        mostUsedMethod: 'N/A',
        averageTime: 0,
      };
    }

    const totalAttempts = history.length;
    const successfulCracks = history.filter(h => h.success).length;
    const totalPasswordsTested = history.reduce((sum, h) => sum + h.passwordsScanned, 0);
    
    // Find most used method
    const methodCounts: { [key: string]: number } = {};
    history.forEach(h => {
      methodCounts[h.attackMethod] = (methodCounts[h.attackMethod] || 0) + 1;
    });
    const mostUsedMethod = Object.keys(methodCounts).reduce((a, b) => 
      methodCounts[a] > methodCounts[b] ? a : b, 'N/A'
    );

    const averageTime = history.reduce((sum, h) => sum + h.timeTaken, 0) / history.length;

    return {
      totalAttempts,
      successfulCracks,
      totalPasswordsTested,
      mostUsedMethod,
      averageTime,
    };
  }

  /**
   * Clear all history
   */
  static clearHistory(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Export history as JSON
   */
  static exportHistory(): string {
    const history = this.getHistory();
    return JSON.stringify(history, null, 2);
  }

  /**
   * Get recent successful cracks
   */
  static getRecentSuccesses(limit: number = 10): CrackHistory[] {
    return this.getHistory()
      .filter(h => h.success)
      .slice(0, limit);
  }
}
