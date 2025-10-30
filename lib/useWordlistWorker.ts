/**
 * Hook for using Web Worker to generate wordlists
 * Prevents UI freezing for Ultra/Mega modes
 */

import { useState, useRef, useCallback } from 'react';

export interface WorkerProgress {
  count: number;
  generated: number;
}

export function useWordlistWorker() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<WorkerProgress>({ count: 0, generated: 0 });
  const workerRef = useRef<Worker | null>(null);

  const generateWordlist = useCallback(
    (
      costFactor: number,
      useUltraMode: boolean,
      useMegaMode: boolean,
      onLog?: (message: string) => void
    ): Promise<string[]> => {
      return new Promise((resolve, reject) => {
        // Create worker
        if (workerRef.current) {
          workerRef.current.terminate();
        }

        try {
          workerRef.current = new Worker('/wordlist-worker.js');
        } catch (error) {
          reject(new Error('Failed to create worker: ' + error));
          return;
        }

        setIsGenerating(true);
        setProgress({ count: 0, generated: 0 });

        workerRef.current.onmessage = (e) => {
          const { type, passwords, count, generated, message, error } = e.data;

          switch (type) {
            case 'progress':
              setProgress({ count, generated });
              break;

            case 'log':
              if (onLog) onLog(message);
              break;

            case 'complete':
              setIsGenerating(false);
              setProgress({ count, generated: count });
              if (onLog) onLog(`Wordlist generation complete: ${count.toLocaleString()} passwords`);
              resolve(passwords);
              if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
              }
              break;

            case 'error':
              setIsGenerating(false);
              reject(new Error(error));
              if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
              }
              break;
          }
        };

        workerRef.current.onerror = (error) => {
          setIsGenerating(false);
          reject(error);
          if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
          }
        };

        // Start generation
        workerRef.current.postMessage({
          type: 'generate',
          costFactor,
          useUltraMode,
          useMegaMode,
        });
      });
    },
    []
  );

  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsGenerating(false);
  }, []);

  return {
    generateWordlist,
    isGenerating,
    progress,
    cancel,
  };
}
