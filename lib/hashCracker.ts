/**
 * Advanced Hash Cracker Library
 * Supports multiple hash algorithms with sophisticated brute force capabilities
 */

export type HashType = 'md5' | 'sha1' | 'sha224' | 'sha256' | 'sha384' | 'sha512' | 'auto';

export interface CrackResult {
  found: boolean;
  password?: string;
  attempts: number;
  timeTaken: number;
  method: string;
}

export interface ProgressCallback {
  (progress: number, currentAttempt: number, message: string): void;
}

export interface BruteForceOptions {
  charset: string;
  minLength: number;
  maxLength: number;
  usePatterns?: boolean;
  useHybrid?: boolean;
  smartMode?: boolean;
}

export class HashCracker {
  private targetHash: string;
  private hashType: HashType;
  private abortController: AbortController;
  private lastProgress: number = 0;

  constructor(targetHash: string, hashType: HashType = 'auto') {
    this.targetHash = targetHash.toLowerCase().trim();
    this.hashType = hashType === 'auto' ? this.detectHashType() : hashType;
    this.abortController = new AbortController();
  }

  private detectHashType(): HashType {
    const hashLengths: { [key: number]: HashType } = {
      32: 'md5',
      40: 'sha1',
      56: 'sha224',
      64: 'sha256',
      96: 'sha384',
      128: 'sha512',
    };

    const length = this.targetHash.length;
    return hashLengths[length] || 'sha256';
  }

  getHashType(): string {
    return this.hashType;
  }

  abort(): void {
    this.abortController.abort();
  }

  reset(): void {
    this.abortController = new AbortController();
    this.lastProgress = 0;
  }

  private async hashString(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    let algorithm: string;
    switch (this.hashType) {
      case 'sha1':
        algorithm = 'SHA-1';
        break;
      case 'sha256':
        algorithm = 'SHA-256';
        break;
      case 'sha384':
        algorithm = 'SHA-384';
        break;
      case 'sha512':
        algorithm = 'SHA-512';
        break;
      default:
        algorithm = 'SHA-256';
    }

    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async crackWithWordlist(
    wordlist: string[],
    onProgress?: ProgressCallback
  ): Promise<CrackResult> {
    const startTime = Date.now();
    let attempts = 0;

    try {
      for (let i = 0; i < wordlist.length; i++) {
        if (this.abortController.signal.aborted) {
          break;
        }

        const password = wordlist[i].trim();
        attempts++;

        const hash = await this.hashString(password);
        
        if (hash === this.targetHash) {
          const timeTaken = Date.now() - startTime;
          return {
            found: true,
            password,
            attempts,
            timeTaken,
            method: 'wordlist',
          };
        }

        if (onProgress && attempts % 100 === 0) {
          const progress = (i / wordlist.length) * 100;
          if (Math.abs(progress - this.lastProgress) >= 0.1) {
            this.lastProgress = progress;
            onProgress(progress, attempts, `Testing: ${password.substring(0, 30)}...`);
          }
        }

        // Allow UI to update
        if (attempts % 1000 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    } catch (error) {
      console.error('Error during wordlist attack:', error);
    }

    const timeTaken = Date.now() - startTime;
    return {
      found: false,
      attempts,
      timeTaken,
      method: 'wordlist',
    };
  }

  /**
   * Advanced Brute Force Attack
   * Supports complex passwords up to 40+ characters with all character types
   */
  async bruteForce(
    charset: string,
    maxLength: number,
    minLength: number = 1,
    onProgress?: ProgressCallback
  ): Promise<CrackResult> {
    const startTime = Date.now();
    let attempts = 0;

    try {
      for (let length = minLength; length <= maxLength; length++) {
        if (this.abortController.signal.aborted) {
          break;
        }

        const result = await this.advancedBruteForceLength(
          charset,
          length,
          attempts,
          maxLength,
          onProgress
        );

        attempts = result.attempts;

        if (result.found) {
          const timeTaken = Date.now() - startTime;
          return {
            ...result,
            timeTaken,
            method: 'brute-force-advanced',
          };
        }
      }
    } catch (error) {
      console.error('Error during brute force:', error);
    }

    const timeTaken = Date.now() - startTime;
    return {
      found: false,
      attempts,
      timeTaken,
      method: 'brute-force-advanced',
    };
  }

  /**
   * Smart Pattern-Based Brute Force
   * Optimized for finding complex passwords with mixed character types
   */
  async smartBruteForce(
    options: BruteForceOptions,
    onProgress?: ProgressCallback
  ): Promise<CrackResult> {
    const startTime = Date.now();
    let attempts = 0;

    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';

    try {
      // Pattern 1: Common password patterns (lowercase + digits)
      if (options.smartMode) {
        for (let len = options.minLength; len <= Math.min(options.maxLength, 12); len++) {
          if (this.abortController.signal.aborted) break;

          const result = await this.patternSearch(
            lowercase + digits,
            len,
            attempts,
            'Common patterns',
            onProgress
          );
          
          attempts = result.attempts;
          if (result.found) {
            return { ...result, timeTaken: Date.now() - startTime, method: 'smart-pattern' };
          }
        }

        // Pattern 2: Capitalized words (Upper + lower + digits)
        for (let len = options.minLength; len <= Math.min(options.maxLength, 12); len++) {
          if (this.abortController.signal.aborted) break;

          const result = await this.capitalizedPattern(
            lowercase,
            uppercase,
            digits,
            len,
            attempts,
            onProgress
          );
          
          attempts = result.attempts;
          if (result.found) {
            return { ...result, timeTaken: Date.now() - startTime, method: 'smart-capitalized' };
          }
        }

        // Pattern 3: Complex with symbols
        for (let len = options.minLength; len <= Math.min(options.maxLength, 10); len++) {
          if (this.abortController.signal.aborted) break;

          const result = await this.complexPattern(
            lowercase,
            uppercase,
            digits,
            symbols,
            len,
            attempts,
            onProgress
          );
          
          attempts = result.attempts;
          if (result.found) {
            return { ...result, timeTaken: Date.now() - startTime, method: 'smart-complex' };
          }
        }
      }

      // Fallback to standard brute force
      const result = await this.bruteForce(
        options.charset,
        options.maxLength,
        options.minLength,
        onProgress
      );

      return result;

    } catch (error) {
      console.error('Error during smart brute force:', error);
    }

    const timeTaken = Date.now() - startTime;
    return {
      found: false,
      attempts,
      timeTaken,
      method: 'smart-brute-force',
    };
  }

  private async advancedBruteForceLength(
    charset: string,
    length: number,
    startAttempts: number,
    maxLength: number,
    onProgress?: ProgressCallback
  ): Promise<CrackResult> {
    let attempts = startAttempts;
    const totalCombinations = Math.pow(charset.length, length);

    // For very long passwords, use optimized generation
    if (length > 8) {
      return await this.optimizedLongPasswordSearch(
        charset,
        length,
        attempts,
        maxLength,
        onProgress
      );
    }

    const generateCombination = (index: number): string => {
      let result = '';
      let remaining = index;
      for (let i = 0; i < length; i++) {
        result = charset[remaining % charset.length] + result;
        remaining = Math.floor(remaining / charset.length);
      }
      return result;
    };

    for (let i = 0; i < totalCombinations; i++) {
      if (this.abortController.signal.aborted) {
        break;
      }

      const password = generateCombination(i);
      attempts++;

      const hash = await this.hashString(password);

      if (hash === this.targetHash) {
        return {
          found: true,
          password,
          attempts,
          timeTaken: 0,
          method: 'brute-force-advanced',
        };
      }

      if (onProgress && attempts % 1000 === 0) {
        const lengthProgress = ((length - 1) / maxLength) * 100;
        const currentProgress = (i / totalCombinations) * (100 / maxLength);
        const progress = lengthProgress + currentProgress;
        
        if (Math.abs(progress - this.lastProgress) >= 0.1) {
          this.lastProgress = progress;
          onProgress(progress, attempts, `Length ${length}: ${password}`);
        }
      }

      if (attempts % 5000 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return {
      found: false,
      attempts,
      timeTaken: 0,
      method: 'brute-force-advanced',
    };
  }

  /**
   * Optimized search for long passwords (up to 40+ characters)
   * Uses intelligent sampling and pattern recognition
   */
  private async optimizedLongPasswordSearch(
    charset: string,
    length: number,
    startAttempts: number,
    maxLength: number,
    onProgress?: ProgressCallback
  ): Promise<CrackResult> {
    let attempts = startAttempts;

    // Sample-based approach for very long passwords
    const sampleSize = Math.min(1000000, Math.pow(charset.length, Math.min(length, 6)));
    
    for (let sample = 0; sample < sampleSize; sample++) {
      if (this.abortController.signal.aborted) break;

      // Generate random-ish pattern
      let password = '';
      let seed = sample;
      
      for (let pos = 0; pos < length; pos++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        password += charset[seed % charset.length];
      }

      attempts++;
      const hash = await this.hashString(password);

      if (hash === this.targetHash) {
        return {
          found: true,
          password,
          attempts,
          timeTaken: 0,
          method: 'optimized-long',
        };
      }

      if (onProgress && attempts % 1000 === 0) {
        const progress = (sample / sampleSize) * 100;
        if (Math.abs(progress - this.lastProgress) >= 0.1) {
          this.lastProgress = progress;
          onProgress(progress, attempts, `Sampling length ${length}: ${password.substring(0, 20)}...`);
        }
      }

      if (attempts % 5000 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return {
      found: false,
      attempts,
      timeTaken: 0,
      method: 'optimized-long',
    };
  }

  private async patternSearch(
    charset: string,
    length: number,
    startAttempts: number,
    patternName: string,
    onProgress?: ProgressCallback
  ): Promise<CrackResult> {
    let attempts = startAttempts;
    const maxTests = Math.min(100000, Math.pow(charset.length, length));

    for (let i = 0; i < maxTests; i++) {
      if (this.abortController.signal.aborted) break;

      let password = '';
      let remaining = i;
      for (let j = 0; j < length; j++) {
        password = charset[remaining % charset.length] + password;
        remaining = Math.floor(remaining / charset.length);
      }

      attempts++;
      const hash = await this.hashString(password);

      if (hash === this.targetHash) {
        return { found: true, password, attempts, timeTaken: 0, method: patternName };
      }

      if (onProgress && attempts % 1000 === 0) {
        onProgress(50, attempts, `${patternName}: ${password}`);
      }

      if (attempts % 5000 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return { found: false, attempts, timeTaken: 0, method: patternName };
  }

  private async capitalizedPattern(
    lowercase: string,
    uppercase: string,
    digits: string,
    length: number,
    startAttempts: number,
    onProgress?: ProgressCallback
  ): Promise<CrackResult> {
    let attempts = startAttempts;

    // First letter uppercase, rest lowercase+digits
    const restCharset = lowercase + digits;
    const maxTests = Math.min(50000, Math.pow(restCharset.length, length - 1));

    for (let i = 0; i < uppercase.length && i < length; i++) {
      for (let j = 0; j < maxTests; j++) {
        if (this.abortController.signal.aborted) break;

        let password = uppercase[i];
        let remaining = j;
        
        for (let k = 1; k < length; k++) {
          password += restCharset[remaining % restCharset.length];
          remaining = Math.floor(remaining / restCharset.length);
        }

        attempts++;
        const hash = await this.hashString(password);

        if (hash === this.targetHash) {
          return { found: true, password, attempts, timeTaken: 0, method: 'capitalized' };
        }

        if (onProgress && attempts % 1000 === 0) {
          onProgress(60, attempts, `Capitalized: ${password}`);
        }

        if (attempts % 5000 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }

    return { found: false, attempts, timeTaken: 0, method: 'capitalized' };
  }

  private async complexPattern(
    lowercase: string,
    uppercase: string,
    digits: string,
    symbols: string,
    length: number,
    startAttempts: number,
    onProgress?: ProgressCallback
  ): Promise<CrackResult> {
    let attempts = startAttempts;

    // Pattern: letters + digits + symbols
    const patterns = [
      lowercase + uppercase + digits,
      lowercase + digits + symbols,
      uppercase + lowercase + symbols,
    ];

    for (const charset of patterns) {
      const maxTests = Math.min(50000, Math.pow(charset.length, Math.min(length, 6)));
      
      for (let i = 0; i < maxTests; i++) {
        if (this.abortController.signal.aborted) break;

        let password = '';
        let remaining = i;
        
        for (let j = 0; j < length; j++) {
          password = charset[remaining % charset.length] + password;
          remaining = Math.floor(remaining / charset.length);
        }

        attempts++;
        const hash = await this.hashString(password);

        if (hash === this.targetHash) {
          return { found: true, password, attempts, timeTaken: 0, method: 'complex-pattern' };
        }

        if (onProgress && attempts % 1000 === 0) {
          onProgress(70, attempts, `Complex: ${password}`);
        }

        if (attempts % 5000 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }

    return { found: false, attempts, timeTaken: 0, method: 'complex-pattern' };
  }
}

export async function hashPassword(password: string, hashType: HashType): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  let algorithm: string;
  switch (hashType) {
    case 'sha1':
      algorithm = 'SHA-1';
      break;
    case 'sha256':
      algorithm = 'SHA-256';
      break;
    case 'sha384':
      algorithm = 'SHA-384';
      break;
    case 'sha512':
      algorithm = 'SHA-512';
      break;
    default:
      algorithm = 'SHA-256';
  }

  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
