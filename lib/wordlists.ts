/**
 * Advanced Password Wordlist Generator with Cost Factor Support
 * Ultra-comprehensive database with hash verification
 * ULTRA MODE: 199+ MILLION passwords
 * MEGA MODE: 300+ MILLION passwords
 */

import { generateUltraMassiveWordlist } from './wordlists-ultra';

// Character sets for brute force attacks
export const CHARSETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  special: '!@#$%^&*()_+-=[]{}|;:\'",./<>?\\`~',
  alphanumeric: 'abcdefghijklmnopqrstuvwxyz0123456789',
  alphanumericUpper: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  all: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:\'",./<>?\\`~',
  extended: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:\'",./<>?\\`~€£¥§©®™',
};

export const TOP_PASSWORDS = [
  '123456', 'password', '12345678', 'qwerty', '123456789', '12345', '1234', '111111',
  '1234567', 'dragon', '123123', 'baseball', 'iloveyou', 'trustno1', '1234567890',
  'sunshine', 'master', 'welcome', 'shadow', 'ashley', 'football', 'jesus', 'michael',
  'ninja', 'mustang', 'password1', 'admin', 'root', 'pass', 'letmein', 'monkey',
  '000000', '696969', '666666', '121212', '112233', '654321', 'superman', 'batman',
  'abc123', 'password123', 'qwerty123', 'admin123', 'test', 'test123', 'guest',
  'hello', 'secret', 'love', 'god', 'money', 'access', 'lovely', 'whatever',
  'princess', 'qwertyuiop', 'starwars', 'freedom', 'computer', 'internet',
];

export const COMMON_WORDS = [
  'account', 'alice', 'alpha', 'anderson', 'andrew', 'angel', 'animal', 'anthony',
  'apple', 'april', 'august', 'austin', 'baby', 'badboy', 'banana', 'barney',
  'batman', 'beach', 'bear', 'beautiful', 'beaver', 'beavis', 'beer', 'betty',
  'bigdaddy', 'bigdog', 'bill', 'billy', 'birdie', 'black', 'blazer', 'blonde',
  'blue', 'bob', 'bobby', 'bond007', 'bonnie', 'booboo', 'booger', 'boomer',
  'boss', 'boston', 'brandon', 'brandy', 'braves', 'brazil', 'brian', 'bronco',
  'bubba', 'buddy', 'bull', 'bulldog', 'buster', 'butter', 'butthead', 'calvin',
  'camaro', 'cameron', 'canada', 'captain', 'carlos', 'carter', 'casper', 'cat',
  'charles', 'cherry', 'chicago', 'chicken', 'chris', 'cisco', 'clark', 'coffee',
  'college', 'compaq', 'cookie', 'cool', 'cooper', 'corvette', 'cowboy', 'cowboys',
  'crystal', 'dakota', 'dallas', 'daniel', 'danielle', 'dave', 'david', 'debbie',
  'dennis', 'diablo', 'diamond', 'dick', 'doctor', 'doggie', 'dolphin', 'dolphins',
  'donald', 'driver', 'eagle', 'eagles', 'edward', 'einstein', 'elaine', 'emily',
  'emma', 'enjoy', 'enter', 'eric', 'erotic', 'extreme', 'falcon', 'fender',
  'ferrari', 'fire', 'firebird', 'fish', 'fishing', 'florida', 'flower', 'flyers',
  'ford', 'forest', 'forever', 'frank', 'fred', 'freddy', 'friend', 'friends',
  'galaxy', 'game', 'gandalf', 'garden', 'garfield', 'george', 'giants', 'ginger',
  'girl', 'girls', 'golden', 'golf', 'golfer', 'gordon', 'great', 'green', 'gregory',
  'guitar', 'gunner', 'hammer', 'hannah', 'happy', 'hardcore', 'harley', 'harry',
  'hawk', 'heaven', 'heather', 'hello', 'helpme', 'henry', 'hockey', 'homer',
  'honey', 'hooter', 'horney', 'horny', 'hotdog', 'house', 'hunter', 'hunting',
];

export const NAMES = [
  'james', 'mary', 'john', 'patricia', 'robert', 'jennifer', 'michael', 'linda',
  'william', 'barbara', 'david', 'elizabeth', 'richard', 'susan', 'joseph', 'jessica',
  'thomas', 'sarah', 'charles', 'karen', 'christopher', 'nancy', 'daniel', 'lisa',
  'matthew', 'betty', 'anthony', 'margaret', 'donald', 'sandra', 'mark', 'ashley',
];

export const KEYBOARD_PATTERNS = [
  'qwerty', 'asdfgh', 'zxcvbn', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
  'qaz', 'wsx', 'edc', 'rfv', 'tgb', 'yhn', 'ujm', 'ik', 'ol', 'p',
  'qazwsx', 'wsxedc', 'edcrfv', 'rfvtgb', 'tgbyhn', 'yhnujm',
  '1qaz2wsx', '2wsx3edc', '3edc4rfv', '4rfv5tgb', '5tgb6yhn',
];

export const LEET_SUBSTITUTIONS = [
  'p@ssw0rd', 'p@ssword', 'passw0rd', 'pa$$word', 'pa$$w0rd',
  'adm1n', '@dmin', '4dmin', 'admin1', 'admin12', 'admin123',
  'r00t', 'ro0t', 'r007', 'root123',
];

/**
 * Verified password database - adds successfully cracked passwords
 */
export class PasswordDatabase {
  private static verifiedPasswords = new Set<string>();
  
  static addVerified(password: string, hash: string, hashType: string) {
    this.verifiedPasswords.add(password);
    console.log(`✓ Verified: ${password} (${hashType}: ${hash.substring(0, 16)}...)`);
  }
  
  static getVerified(): string[] {
    return Array.from(this.verifiedPasswords);
  }
  
  static hasVerified(): boolean {
    return this.verifiedPasswords.size > 0;
  }
  
  static clear() {
    this.verifiedPasswords.clear();
  }
}

/**
 * Generate massive wordlist based on cost factor (4-20)
 * Cost factor determines complexity and size
 * ULTRA MODE (CF 16+): 199+ MILLION passwords
 * MEGA MODE (CF 18+): 300+ MILLION passwords
 */
export function generateMassiveWordlist(costFactor: number = 10, useUltraMode: boolean = false, useMegaMode: boolean = false): string[] {
  // Use MEGA mode for CF >= 18 or if explicitly requested
  if (useMegaMode || costFactor >= 18) {
    console.log('💥 MEGA MODE ACTIVATED - 300M+ PASSWORDS!');
    return generateUltraMassiveWordlist(costFactor, true);
  }
  
  // Use ultra mode for CF >= 16 or if explicitly requested
  if (useUltraMode || costFactor >= 16) {
    console.log('🚀 ULTRA MODE ACTIVATED!');
    return generateUltraMassiveWordlist(costFactor, false);
  }

  const wordlist = new Set<string>();
  
  // Add verified passwords first
  PasswordDatabase.getVerified().forEach(p => wordlist.add(p));

  console.log(`Generating wordlist with Cost Factor ${costFactor}...`);

  // Base passwords
  TOP_PASSWORDS.forEach(p => wordlist.add(p));
  COMMON_WORDS.forEach(w => wordlist.add(w));
  NAMES.forEach(n => wordlist.add(n));
  KEYBOARD_PATTERNS.forEach(k => wordlist.add(k));
  LEET_SUBSTITUTIONS.forEach(s => wordlist.add(s));

  const suffixes = ['!', '!!', '!!!', '1', '12', '123', '1234', '12345',
    '@', '#', '$', '2023', '2024', '2025', '!@#', '!123', '@123'];
  
  const prefixes = ['my', 'the', 'i', 'love', 'super', 'admin', 'user'];

  // Numbers - MASSIVELY EXPANDED
  const numLimit = Math.min(10000 * Math.pow(2, costFactor - 4), 5000000);
  console.log(`  → Generating ${numLimit.toLocaleString()} numbers...`);
  for (let i = 0; i < numLimit; i++) {
    wordlist.add(i.toString());
    if (i < 10000 && costFactor >= 8) {
      wordlist.add(i.toString().padStart(4, '0'));
    }
    if (i < 100000 && costFactor >= 12) {
      wordlist.add(i.toString().padStart(6, '0'));
    }
  }

  // Dates
  const startYear = costFactor >= 12 ? 1900 : 1950;
  for (let year = startYear; year <= 2030; year++) {
    wordlist.add(year.toString());
    if (costFactor >= 8) {
      for (let month = 1; month <= 12; month++) {
        const m = month.toString().padStart(2, '0');
        wordlist.add(`${m}${year}`);
      }
    }
  }

  // Base words + suffixes - EXPANDED
  const baseWords = [...TOP_PASSWORDS, ...COMMON_WORDS, ...NAMES];
  console.log(`  → Generating ${baseWords.length * suffixes.length * 3} word combinations...`);
  baseWords.forEach(word => {
    suffixes.forEach(suffix => {
      wordlist.add(word + suffix);
      if (costFactor >= 8) {
        wordlist.add(word.charAt(0).toUpperCase() + word.slice(1) + suffix);
      }
      if (costFactor >= 12) {
        wordlist.add(word.toUpperCase() + suffix);
      }
    });
  });

  // Letter + number patterns - EXPANDED
  if (costFactor >= 8) {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const letterNumLimit = costFactor >= 14 ? 10000 : 1000;
    console.log(`  → Generating ${letters.length * letterNumLimit * 2} letter+number patterns...`);
    for (let i = 0; i < letters.length; i++) {
      for (let j = 0; j < letterNumLimit; j++) {
        wordlist.add(letters[i] + j);
        wordlist.add(letters[i].toUpperCase() + j);
      }
    }
  }

  const finalList = Array.from(wordlist);
  console.log(`✓ Generated ${finalList.length.toLocaleString()} passwords (CF${costFactor})`);
  
  return finalList;
}

/**
 * Auto-detect optimal cost factor
 */
export function detectCostFactor(hashType: string): number {
  const factors: Record<string, number> = {
    'md5': 10,
    'sha1': 12,
    'sha256': 14,
    'sha384': 16,
    'sha512': 18,
  };
  return factors[hashType.toLowerCase()] || 10;
}

/**
 * Generate combined wordlist with network passwords
 */
export async function generateCombinedWordlist(
  costFactor: number = 10,
  includeNetwork: boolean = true,
  networkPasswords: string[] = [],
  useUltraMode: boolean = false,
  useMegaMode: boolean = false
): Promise<string[]> {
  const localPasswords = generateMassiveWordlist(costFactor, useUltraMode, useMegaMode);
  
  if (!includeNetwork || networkPasswords.length === 0) {
    return localPasswords;
  }

  // Combine local and network passwords
  const combined = new Set<string>([...localPasswords, ...networkPasswords]);
  
  console.log(`✓ Combined wordlist: ${localPasswords.length.toLocaleString()} local + ${networkPasswords.length.toLocaleString()} network = ${combined.size.toLocaleString()} unique passwords`);
  
  return Array.from(combined);
}
