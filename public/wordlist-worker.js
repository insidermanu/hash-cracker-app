/**
 * Web Worker for generating massive wordlists without blocking UI
 * Handles Ultra (199M+) and Mega (300M+) mode generation
 */

self.onmessage = function(e) {
  const { type, costFactor, useUltraMode, useMegaMode } = e.data;

  if (type === 'generate') {
    try {
      self.postMessage({ type: 'log', message: 'Worker: Starting password generation...' });
      
      const passwords = new Set();
      let generated = 0;

      // Helper to send progress updates
      const sendProgress = () => {
        self.postMessage({ 
          type: 'progress', 
          count: passwords.size,
          generated 
        });
      };

      // Common passwords base
      const commonBase = [
        'password', 'admin', 'root', 'user', '123456', '12345678', 'qwerty',
        'abc123', 'letmein', 'welcome', 'monkey', 'dragon', 'master', 'sunshine',
        'princess', 'football', 'shadow', 'superman', 'password1', 'hello'
      ];

      commonBase.forEach(p => passwords.add(p));

      // Add variations
      for (const base of commonBase) {
        for (let i = 0; i < 100; i++) {
          passwords.add(base + i);
          passwords.add(i + base);
        }
        passwords.add(base + '!');
        passwords.add(base + '@');
        passwords.add(base.toUpperCase());
      }

      // Generate based on cost factor (chunked to prevent freeze)
      const chunkSize = 10000;
      let totalToGenerate = Math.min(costFactor * 50000, 1000000); // Cap at 1M for normal mode

      if (useUltraMode) {
        totalToGenerate = Math.min(costFactor * 200000, 10000000); // Cap at 10M for Ultra
        self.postMessage({ type: 'log', message: 'Worker: Ultra Mode - generating 10M passwords...' });
      }

      if (useMegaMode) {
        totalToGenerate = Math.min(costFactor * 500000, 20000000); // Cap at 20M for Mega
        self.postMessage({ type: 'log', message: 'Worker: MEGA Mode - generating 20M passwords...' });
      }

      // Generate numeric patterns in chunks
      for (let i = 0; i < totalToGenerate; i++) {
        passwords.add(String(i).padStart(6, '0'));
        passwords.add(String(i));
        
        generated++;
        
        // Send progress every chunk
        if (generated % chunkSize === 0) {
          sendProgress();
          // Small delay to prevent blocking
          if (generated % (chunkSize * 10) === 0) {
            // Allow other messages to process
            setTimeout(() => {}, 0);
          }
        }
      }

      // Common patterns
      const years = [];
      for (let y = 1950; y <= 2030; y++) years.push(String(y));
      
      const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
      const days = [];
      for (let d = 1; d <= 31; d++) days.push(String(d).padStart(2, '0'));

      // Date patterns
      for (const year of years) {
        for (const month of months) {
          passwords.add(year + month);
          passwords.add(month + year);
          
          if (useUltraMode || useMegaMode) {
            for (const day of days) {
              passwords.add(year + month + day);
              passwords.add(day + month + year);
            }
          }
        }
      }

      sendProgress();

      // Leet speak variations for top passwords
      if (useUltraMode || useMegaMode) {
        self.postMessage({ type: 'log', message: 'Worker: Generating leet speak variations...' });
        
        const leetMap = { 'a': '4', 'e': '3', 'i': '1', 'o': '0', 's': '5', 't': '7' };
        const topWords = Array.from(passwords).slice(0, 1000);
        
        for (const word of topWords) {
          let leet = word;
          for (const [char, num] of Object.entries(leetMap)) {
            leet = leet.replace(new RegExp(char, 'gi'), num);
          }
          passwords.add(leet);
        }
      }

      sendProgress();

      // Phone patterns for Mega mode
      if (useMegaMode) {
        self.postMessage({ type: 'log', message: 'Worker: Generating phone patterns...' });
        
        const areaCodes = ['555', '123', '999', '000', '111'];
        for (const area of areaCodes) {
          for (let i = 0; i < 1000; i++) {
            passwords.add(area + String(i).padStart(4, '0'));
          }
        }
      }

      sendProgress();

      // Convert to array
      const result = Array.from(passwords);
      
      self.postMessage({ 
        type: 'complete', 
        passwords: result,
        count: result.length 
      });
      
    } catch (error) {
      self.postMessage({ 
        type: 'error', 
        error: error.message 
      });
    }
  }
};
