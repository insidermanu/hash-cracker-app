'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { HashCracker, type HashType, type CrackResult } from '@/lib/hashCracker'
import { generateMassiveWordlist, generateCombinedWordlist, CHARSETS, PasswordDatabase, detectCostFactor } from '@/lib/wordlists'
import { hashPassword } from '@/lib/hashCracker'
import { initializeNetworkDatabase, networkDB, NETWORK_SOURCES, CUSTOM_WORDLISTS, type FetchProgress } from '@/lib/networkDatabase'
import { HistoryManager, type CrackHistory } from '@/lib/historyManager'
import { useWordlistWorker } from '@/lib/useWordlistWorker'
import { exportHistoryToPDF } from '@/lib/pdfExport'
import { Shield, Lock, Unlock, Copy, PlayCircle, StopCircle, CheckCircle, AlertCircle, Globe, Database, Download, History as HistoryIcon, TrendingUp } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export default function Home() {
  const [targetHash, setTargetHash] = useState('')
  const [hashType, setHashType] = useState<HashType>('auto')
  const [attackMethod, setAttackMethod] = useState<'wordlist' | 'bruteforce' | 'smart'>('wordlist')
  const [isCracking, setIsCracking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [result, setResult] = useState<CrackResult | null>(null)
  const [crackerInstance, setCrackerInstance] = useState<HashCracker | null>(null)
  const [detectedType, setDetectedType] = useState('')
  
  // Cost Factor
  const [costFactor, setCostFactor] = useState(10)
  const [autoCostFactor, setAutoCostFactor] = useState(true)
  const [useUltraMode, setUseUltraMode] = useState(false)
  const [useMegaMode, setUseMegaMode] = useState(false)

  // Network Database
  const [useNetworkDB, setUseNetworkDB] = useState(true)
  const [networkDBStatus, setNetworkDBStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [networkPasswordCount, setNetworkPasswordCount] = useState(0)
  const [fetchProgress, setFetchProgress] = useState<FetchProgress[]>([])
  const [networkDBInitialized, setNetworkDBInitialized] = useState(false)

  // Brute Force
  const [charset, setCharset] = useState('alphanumeric')
  const [minLength, setMinLength] = useState(1)
  const [maxLength, setMaxLength] = useState(8)
  const [smartMode, setSmartMode] = useState(true)

  // Generator
  const [passwordToHash, setPasswordToHash] = useState('')
  const [generatedHash, setGeneratedHash] = useState('')
  const [genHashType, setGenHashType] = useState<HashType>('sha256')
  const [copySuccess, setCopySuccess] = useState(false)
  
  // Verification
  const [verifiedCount, setVerifiedCount] = useState(0)

  // History
  const [history, setHistory] = useState<CrackHistory[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [dialogSize, setDialogSize] = useState({ width: 1200, height: 700 })
  const [isResizing, setIsResizing] = useState(false)
  const [stats, setStats] = useState({
    totalAttempts: 0,
    successfulCracks: 0,
    totalPasswordsTested: 0,
    mostUsedMethod: 'N/A',
    averageTime: 0,
  })

  // Status Logs
  const [statusLogs, setStatusLogs] = useState<string[]>([])
  const [showLogs, setShowLogs] = useState(false)

  // Web Worker for wordlist generation
  const { generateWordlist: generateWithWorker, isGenerating: workerGenerating, progress: workerProgress } = useWordlistWorker()

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setStatusLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 100))
  }

  // Load history on mount
  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = () => {
    const h = HistoryManager.getHistory()
    const s = HistoryManager.getStats()
    setHistory(h)
    setStats(s)
  }

  // Initialize Network Database on mount
  useEffect(() => {
    if (useNetworkDB && !networkDBInitialized) {
      initializeNetworkDB()
    }
  }, [useNetworkDB, networkDBInitialized])

  const initializeNetworkDB = async () => {
    setNetworkDBStatus('loading')
    setStatusMessage('🌐 Loading network password databases...')
    toast.loading('Loading network databases...', { id: 'network-db' })
    addLog('Initializing network database...')
    
    try {
      await initializeNetworkDatabase((progress) => {
        setFetchProgress(progress)
        const loaded = progress.filter(p => p.status === 'success').length
        const total = progress.length
        setStatusMessage(`Loading databases: ${loaded}/${total} sources`)
        toast.loading(`Loading databases: ${loaded}/${total}`, { id: 'network-db' })
        addLog(`Loading databases: ${loaded}/${total} sources`)
      })
      
      const stats = networkDB.getStats()
      setNetworkPasswordCount(stats.uniquePasswords)
      setNetworkDBStatus('ready')
      setNetworkDBInitialized(true)
      setStatusMessage(`✓ Network database ready: ${stats.uniquePasswords.toLocaleString()} passwords from ${stats.sources} sources`)
      
      toast.success(`Network DB ready: ${stats.uniquePasswords.toLocaleString()} passwords`, { id: 'network-db' })
      addLog(`Network database ready: ${stats.uniquePasswords.toLocaleString()} passwords from ${stats.sources} sources`)
      console.log('Network Database Stats:', stats)
    } catch (error) {
      console.error('Failed to initialize network database:', error)
      setNetworkDBStatus('error')
      setStatusMessage(`❌ Network database error: ${error}`)
      toast.error('Failed to load network database', { id: 'network-db' })
      addLog(`Error loading network database: ${error}`)
    }
  }

  const detectHashType = (hash: string) => {
    const len = hash.length
    const detected: Record<number, string> = {
      32: 'MD5',
      40: 'SHA-1',
      56: 'SHA-224',
      64: 'SHA-256',
      96: 'SHA-384',
      128: 'SHA-512'
    }
    return detected[len] || 'Unknown'
  }

  const handleHashInput = (value: string) => {
    setTargetHash(value)
    if (value.length > 0) {
      const detected = detectHashType(value)
      setDetectedType(detected)
      
      // Auto-set cost factor
      if (autoCostFactor && detected !== 'Unknown') {
        const hashTypeKey = detected.toLowerCase().replace('-', '')
        const cf = detectCostFactor(hashTypeKey)
        setCostFactor(cf)
      }
    } else {
      setDetectedType('')
    }
  }

  const startCracking = async () => {
    if (!targetHash) {
      setStatusMessage('Please enter a hash')
      toast.error('Please enter a hash to crack')
      addLog('Error: No hash provided')
      return
    }

    setIsCracking(true)
    setProgress(0)
    setAttempts(0)
    setResult(null)
    setStatusMessage('Initializing ultra-compromise system...')
    addLog('Starting crack attempt...')

    const startTime = Date.now()
    const cracker = new HashCracker(targetHash, hashType)
    setCrackerInstance(cracker)

    const progressCallback = (prog: number, att: number, msg: string) => {
      setProgress(prog)
      setAttempts(att)
      setStatusMessage(msg)
      if (att % 10000 === 0) {
        addLog(`Progress: ${prog.toFixed(1)}% - ${att.toLocaleString()} attempts`)
      }
    }

    const mode = useMegaMode ? 'mega' : useUltraMode ? 'ultra' : 'normal'
    toast.loading(`Starting ${attackMethod} attack...`, { id: 'crack' })
    addLog(`Attack method: ${attackMethod}, Mode: ${mode.toUpperCase()}`)

    try {
      let crackResult: CrackResult
      let passwordsScanned = 0

      if (attackMethod === 'wordlist') {
        const modeText = useMegaMode ? ' (MEGA 20M)' : useUltraMode ? ' (ULTRA 10M)' : '';
        setStatusMessage(`Generating Cost Factor ${costFactor} wordlist${modeText}...`)
        addLog(`Generating wordlist with Cost Factor ${costFactor}${modeText}`)
        
        // Use Web Worker for Ultra/Mega modes to prevent UI freeze
        let wordlist: string[]
        
        if (useUltraMode || useMegaMode) {
          addLog('Using Web Worker for background generation (prevents UI freeze)...')
          toast.loading('Generating wordlist in background...', { id: 'crack' })
          
          try {
            wordlist = await generateWithWorker(costFactor, useUltraMode, useMegaMode, addLog)
            
            // Add network passwords if enabled
            if (useNetworkDB && networkDBStatus === 'ready') {
              const networkPasswords = networkDB.getAllPasswords()
              addLog(`Merging ${networkPasswords.length.toLocaleString()} network passwords...`)
              wordlist = [...new Set([...wordlist, ...networkPasswords])]
            }
            
            setStatusMessage(`Testing ${wordlist.length.toLocaleString()} passwords...`)
            addLog(`Wordlist ready: ${wordlist.length.toLocaleString()} total passwords`)
            passwordsScanned = wordlist.length
          } catch (error) {
            addLog(`Worker error: ${error}. Falling back to standard generation...`)
            wordlist = generateMassiveWordlist(costFactor, false, false) // Fallback to normal mode
            passwordsScanned = wordlist.length
          }
        } else {
          // Normal mode - direct generation
          if (useNetworkDB && networkDBStatus === 'ready') {
            const networkPasswords = networkDB.getAllPasswords()
            addLog(`Loading ${networkPasswords.length.toLocaleString()} network passwords...`)
            wordlist = await generateCombinedWordlist(costFactor, true, networkPasswords, false, false)
            setStatusMessage(`Testing ${wordlist.length.toLocaleString()} passwords (${networkPasswords.length.toLocaleString()} from network)...`)
            addLog(`Combined wordlist ready: ${wordlist.length.toLocaleString()} total passwords`)
            passwordsScanned = wordlist.length
          } else {
            addLog('Generating local wordlist...')
            wordlist = generateMassiveWordlist(costFactor, false, false)
            setStatusMessage(`Testing ${wordlist.length.toLocaleString()} passwords...`)
            addLog(`Local wordlist ready: ${wordlist.length.toLocaleString()} passwords`)
            passwordsScanned = wordlist.length
          }
        }
        
        addLog('Starting password testing...')
        toast.loading(`Testing ${wordlist.length.toLocaleString()} passwords...`, { id: 'crack' })
        crackResult = await cracker.crackWithWordlist(wordlist, progressCallback)
      } else if (attackMethod === 'smart') {
        setStatusMessage('Starting smart pattern-based attack...')
        addLog('Using smart brute force with pattern recognition')
        toast.loading('🧠 Smart brute force attack in progress...', { 
          id: 'crack',
          duration: Infinity,
          icon: '🔍'
        })
        const selectedCharset = CHARSETS[charset as keyof typeof CHARSETS]
        crackResult = await cracker.smartBruteForce({
          charset: selectedCharset,
          minLength,
          maxLength,
          smartMode: true,
        }, progressCallback)
        passwordsScanned = attempts
      } else {
        const selectedCharset = CHARSETS[charset as keyof typeof CHARSETS]
        setStatusMessage('Starting ultra brute force...')
        addLog(`Brute force: ${charset} charset, length ${minLength}-${maxLength}`)
        toast.loading('⚡ Ultra brute force attack in progress...', { 
          id: 'crack',
          duration: Infinity,
          icon: '💪'
        })
        crackResult = await cracker.bruteForce(selectedCharset, maxLength, minLength, progressCallback)
        passwordsScanned = attempts
      }

      setResult(crackResult)
      setProgress(100)

      const timeTaken = Date.now() - startTime

      if (crackResult.found && crackResult.password) {
        setStatusMessage(`✓ Password found: ${crackResult.password}`)
        toast.success(`Password found: ${crackResult.password}`, { id: 'crack', duration: 5000 })
        addLog(`SUCCESS! Password found: ${crackResult.password} (${(timeTaken / 1000).toFixed(2)}s)`)
        
        // Add to verified database
        PasswordDatabase.addVerified(crackResult.password, targetHash, cracker.getHashType())
        setVerifiedCount(PasswordDatabase.getVerified().length)

        // Add to history
        await HistoryManager.addHistory({
          targetHash,
          hashType: cracker.getHashType(),
          attackMethod,
          costFactor: attackMethod === 'wordlist' ? costFactor : undefined,
          success: true,
          password: crackResult.password,
          attempts,
          timeTaken,
          passwordsScanned,
          mode: mode as 'normal' | 'ultra' | 'mega',
        })
        loadHistory()
      } else {
        setStatusMessage('Password not found')
        toast.error('Password not found', { id: 'crack' })
        addLog(`Password not found after ${attempts.toLocaleString()} attempts (${(timeTaken / 1000).toFixed(2)}s)`)

        // Add to history
        await HistoryManager.addHistory({
          targetHash,
          hashType: cracker.getHashType(),
          attackMethod,
          costFactor: attackMethod === 'wordlist' ? costFactor : undefined,
          success: false,
          attempts,
          timeTaken,
          passwordsScanned,
          mode: mode as 'normal' | 'ultra' | 'mega',
        })
        loadHistory()
      }
    } catch (error) {
      setStatusMessage(`Error: ${error}`)
      toast.error(`Error: ${error}`, { id: 'crack' })
      addLog(`ERROR: ${error}`)
    } finally {
      setIsCracking(false)
      addLog('Attack completed')
    }
  }

  const stopCracking = () => {
    if (crackerInstance) {
      crackerInstance.abort()
      setIsCracking(false)
      setStatusMessage('Stopped')
      toast.error('Attack stopped by user', { id: 'crack' })
    }
  }

  const generateHash = async () => {
    if (!passwordToHash) {
      toast.error('Please enter a password to hash')
      return
    }

    try {
      toast.loading('Generating hash...', { id: 'gen' })
      const hash = await hashPassword(passwordToHash, genHashType)
      setGeneratedHash(hash)
      setCopySuccess(false)
      toast.success(`${genHashType.toUpperCase()} hash generated`, { id: 'gen' })
    } catch (error) {
      setGeneratedHash(`Error: ${error}`)
      toast.error(`Failed to generate hash: ${error}`, { id: 'gen' })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopySuccess(true)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const handleUltraModeToggle = (enabled: boolean) => {
    setUseUltraMode(enabled)
    if (enabled) {
      toast.success('Ultra Mode enabled: 10M+ passwords', { icon: '⚡' })
      addLog('Ultra Mode ENABLED: 10M+ passwords (Web Worker prevents UI freeze)')
      if (costFactor < 16) {
        setCostFactor(16)
        toast('Cost factor increased to 16', { icon: 'ℹ️' })
        addLog('Cost factor auto-adjusted to 16 for Ultra Mode')
      }
      if (useMegaMode) {
        setUseMegaMode(false)
        toast('Mega Mode disabled', { icon: 'ℹ️' })
        addLog('Mega Mode disabled (Ultra Mode active)')
      }
    } else {
      toast('Ultra Mode disabled', { icon: 'ℹ️' })
      addLog('Ultra Mode DISABLED')
    }
  }

  const handleMegaModeToggle = (enabled: boolean) => {
    setUseMegaMode(enabled)
    if (enabled) {
      toast.success('MEGA Mode enabled: 20M+ passwords', { icon: '💥' })
      addLog('MEGA Mode ENABLED: 20M+ passwords with deep scanning (Web Worker prevents UI freeze)')
      if (costFactor < 18) {
        setCostFactor(18)
        toast('Cost factor increased to 18', { icon: 'ℹ️' })
        addLog('Cost factor auto-adjusted to 18 for MEGA Mode')
      }
      if (!useUltraMode) {
        setUseUltraMode(true)
        toast('Ultra Mode auto-enabled', { icon: 'ℹ️' })
        addLog('Ultra Mode auto-enabled for MEGA Mode')
      }
    } else {
      toast('MEGA Mode disabled', { icon: 'ℹ️' })
      addLog('MEGA Mode DISABLED')
    }
  }

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all history?')) {
      HistoryManager.clearHistory()
      loadHistory()
      toast.success('History cleared')
      addLog('History cleared by user')
    }
  }

  const exportHistoryPDF = () => {
    try {
      exportHistoryToPDF(history, stats)
      toast.success('History exported as PDF')
      addLog('History exported as PDF')
    } catch (error) {
      toast.error('Failed to export PDF')
      addLog(`PDF export error: ${error}`)
    }
  }

  const exportHistoryJSON = () => {
    try {
      const data = HistoryManager.exportHistory()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hash-cracker-history-${Date.now()}.json`
      a.click()
      toast.success('History exported as JSON')
      addLog('History exported as JSON')
    } catch (error) {
      toast.error('Failed to export JSON')
      addLog(`JSON export error: ${error}`)
    }
  }

  const handleMouseDownResize = (e: React.MouseEvent, direction: 'right' | 'bottom' | 'corner') => {
    e.preventDefault()
    setIsResizing(true)
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = dialogSize.width
    const startHeight = dialogSize.height

    const handleMouseMove = (e: MouseEvent) => {
      if (direction === 'right' || direction === 'corner') {
        const newWidth = Math.max(600, Math.min(window.innerWidth * 0.95, startWidth + (e.clientX - startX)))
        setDialogSize(prev => ({ ...prev, width: newWidth }))
      }
      if (direction === 'bottom' || direction === 'corner') {
        const newHeight = Math.max(400, Math.min(window.innerHeight * 0.95, startHeight + (e.clientY - startY)))
        setDialogSize(prev => ({ ...prev, height: newHeight }))
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50">
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#111',
            boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '14px 18px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
            style: {
              border: '1px solid #10b981',
              background: '#f0fdf4',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
            style: {
              border: '1px solid #ef4444',
              background: '#fef2f2',
            },
          },
          loading: {
            iconTheme: {
              primary: '#3b82f6',
              secondary: '#fff',
            },
            style: {
              border: '1px solid #3b82f6',
              background: '#eff6ff',
            },
          },
        }}
      />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              Ultra Hash Cracker
            </h1>
          </div>
          <p className="text-gray-600 text-lg">110+ Network Databases • 20M+ Passwords • Deep Scanning • Web Worker Optimized</p>
          <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
            <Button 
              variant="outline" 
              size="default"
              onClick={() => setShowHistory(!showHistory)}
              className={`shadow-sm hover:shadow-md transition-all ${
                showHistory 
                  ? 'bg-blue-50 border-blue-400 text-blue-700 hover:bg-blue-100' 
                  : 'hover:border-blue-300'
              }`}
            >
              <HistoryIcon className="w-4 h-4 mr-2" />
              {showHistory ? 'Hide History' : 'Show History'}
            </Button>
            <Button 
              variant="outline" 
              size="default"
              onClick={() => setShowLogs(!showLogs)}
              className={`shadow-sm hover:shadow-md transition-all ${
                showLogs 
                  ? 'bg-purple-50 border-purple-400 text-purple-700 hover:bg-purple-100' 
                  : 'hover:border-purple-300'
              }`}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {showLogs ? 'Hide Logs' : 'Show Logs'}
            </Button>
            {stats.totalAttempts > 0 && (
              <Badge variant="outline" className="px-3 py-2 text-sm font-semibold shadow-sm">
                <HistoryIcon className="w-3 h-3 mr-1" />
                {stats.totalAttempts} Total • {stats.successfulCracks} Success
              </Badge>
            )}
            {verifiedCount > 0 && (
              <Badge variant="outline" className="px-3 py-2 text-sm font-semibold shadow-sm">
                <CheckCircle className="w-3 h-3 mr-1" />
                {verifiedCount} Verified
              </Badge>
            )}
            {networkDBStatus === 'ready' && (
              <Badge className="bg-green-100 text-green-700 border-green-300 px-3 py-2 text-sm font-semibold shadow-sm">
                <Globe className="w-3 h-3 mr-1" />
                {networkPasswordCount.toLocaleString()} Network
              </Badge>
            )}
            {useMegaMode && (
              <Badge className="bg-gradient-to-r from-red-100 to-pink-100 text-red-700 border-red-300 px-3 py-2 text-sm font-bold shadow-md animate-pulse">
                💥 MEGA: 20M+
              </Badge>
            )}
            {useUltraMode && !useMegaMode && (
              <Badge className="bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border-purple-300 px-3 py-2 text-sm font-bold shadow-md">
                🚀 ULTRA: 10M+
              </Badge>
            )}
          </div>
        </div>

        {/* Status Logs */}
        {showLogs && statusLogs.length > 0 && (
          <Card className="mb-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 border-slate-700 shadow-2xl">
            <CardHeader className="pb-3 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-mono flex items-center gap-2 text-slate-100">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <TrendingUp className="w-4 h-4" />
                  System Logs
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setStatusLogs([])}
                  className="text-slate-400 hover:text-slate-100 hover:bg-slate-700"
                >
                  Clear Logs
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="max-h-72 overflow-y-auto space-y-1 font-mono text-xs">
                {statusLogs.map((log, idx) => (
                  <div 
                    key={idx} 
                    className="text-slate-300 hover:bg-slate-800 px-3 py-2 rounded-md transition-colors border-l-2 border-transparent hover:border-blue-500"
                  >
                    {log}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="crack" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-gray-100 rounded-xl shadow-sm">
            <TabsTrigger 
              value="crack" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg transition-all"
            >
              <Unlock className="w-4 h-4" />
              Crack Hash
            </TabsTrigger>
            <TabsTrigger 
              value="generate" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg transition-all"
            >
              <Lock className="w-4 h-4" />
              Generate Hash
            </TabsTrigger>
          </TabsList>

          {/* Crack Hash Tab */}
          <TabsContent value="crack">
            <Card className="shadow-xl border-gray-200 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-gray-100 pb-4">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Unlock className="w-5 h-5 text-white" />
                  </div>
                  Ultra Hash Cracker
                </CardTitle>
                <CardDescription className="text-base">
                  Advanced password recovery with auto-detection and verification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Hash Input */}
                <div className="space-y-2">
                  <Label htmlFor="hash" className="text-sm font-semibold">Target Hash</Label>
                  <Input
                    id="hash"
                    placeholder="Enter hash (e.g., 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8)"
                    value={targetHash}
                    onChange={(e) => handleHashInput(e.target.value)}
                    disabled={isCracking}
                    className="font-mono text-sm shadow-sm"
                  />
                  {detectedType && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Auto-detected: {detectedType}
                      </Badge>
                      {autoCostFactor && (
                        <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                          Cost Factor: {costFactor}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Settings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hashType">Hash Algorithm</Label>
                    <Select value={hashType} onValueChange={(value) => setHashType(value as HashType)} disabled={isCracking}>
                      <SelectTrigger id="hashType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto Detect</SelectItem>
                        <SelectItem value="md5">MD5</SelectItem>
                        <SelectItem value="sha1">SHA-1</SelectItem>
                        <SelectItem value="sha256">SHA-256</SelectItem>
                        <SelectItem value="sha512">SHA-512</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="attackMethod">Attack Method</Label>
                    <Select value={attackMethod} onValueChange={(value) => setAttackMethod(value as any)} disabled={isCracking}>
                      <SelectTrigger id="attackMethod">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wordlist">Wordlist (CF-based)</SelectItem>
                        <SelectItem value="smart">Smart Brute Force</SelectItem>
                        <SelectItem value="bruteforce">Ultra Brute Force</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="costFactor">Cost Factor (4-20)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="costFactor"
                        type="number"
                        value={costFactor}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 10
                          setCostFactor(Math.min(20, Math.max(4, val)))
                          setAutoCostFactor(false)
                        }}
                        min={4}
                        max={20}
                        disabled={isCracking || (attackMethod !== 'wordlist')}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        variant={autoCostFactor ? "default" : "outline"}
                        onClick={() => setAutoCostFactor(!autoCostFactor)}
                        disabled={isCracking || (attackMethod !== 'wordlist')}
                      >
                        Auto
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Ultra Mode Toggle */}
                {attackMethod === 'wordlist' && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <input
                        id="ultraMode"
                        type="checkbox"
                        checked={useUltraMode}
                        onChange={(e) => handleUltraModeToggle(e.target.checked)}
                        disabled={isCracking}
                        className="w-4 h-4 rounded"
                      />
                      <Label htmlFor="ultraMode" className="font-normal text-sm flex-1">
                        <span className="font-bold text-purple-700">🚀 ULTRA MODE:</span> 10M+ passwords (Web Worker, no UI freeze)
                      </Label>
                      {useUltraMode && !useMegaMode && (
                        <Badge className="bg-purple-600 text-white">
                          ULTRA
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg border border-red-200">
                      <input
                        id="megaMode"
                        type="checkbox"
                        checked={useMegaMode}
                        onChange={(e) => handleMegaModeToggle(e.target.checked)}
                        disabled={isCracking}
                        className="w-4 h-4 rounded"
                      />
                      <Label htmlFor="megaMode" className="font-normal text-sm flex-1">
                        <span className="font-bold text-red-700">💥 MEGA MODE:</span> 20M+ passwords with DEEP SCANNING (Web Worker, no UI freeze)
                      </Label>
                      {useMegaMode && (
                        <Badge className="bg-red-600 text-white animate-pulse">
                          MEGA
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Brute Force Settings */}
                {(attackMethod === 'bruteforce' || attackMethod === 'smart') && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {attackMethod === 'smart' ? 'Smart' : 'Ultra'} Brute Force Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="charset">Character Set</Label>
                        <Select value={charset} onValueChange={setCharset} disabled={isCracking}>
                          <SelectTrigger id="charset">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lowercase">Lowercase (a-z)</SelectItem>
                            <SelectItem value="uppercase">Uppercase (A-Z)</SelectItem>
                            <SelectItem value="digits">Digits (0-9)</SelectItem>
                            <SelectItem value="alphanumeric">Alphanumeric (a-z, 0-9)</SelectItem>
                            <SelectItem value="alphanumericUpper">All Letters + Digits</SelectItem>
                            <SelectItem value="all">All (Letters + Digits + Symbols)</SelectItem>
                            <SelectItem value="extended">Extended (All + Unicode)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="minLength">Min Length</Label>
                          <Input
                            id="minLength"
                            type="number"
                            value={minLength}
                            onChange={(e) => setMinLength(parseInt(e.target.value) || 1)}
                            min={1}
                            max={40}
                            disabled={isCracking}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maxLength">Max Length (up to 40)</Label>
                          <Input
                            id="maxLength"
                            type="number"
                            value={maxLength}
                            onChange={(e) => setMaxLength(parseInt(e.target.value) || 8)}
                            min={1}
                            max={40}
                            disabled={isCracking}
                          />
                        </div>
                      </div>

                      {attackMethod === 'smart' && (
                        <div className="flex items-center space-x-2">
                          <input
                            id="smartMode"
                            type="checkbox"
                            checked={smartMode}
                            onChange={(e) => setSmartMode(e.target.checked)}
                            disabled={isCracking}
                            className="w-4 h-4 rounded"
                          />
                          <Label htmlFor="smartMode" className="font-normal text-sm">
                            Enable pattern-based intelligence (Capitalized, Complex, Symbols)
                          </Label>
                        </div>
                      )}

                      {maxLength > 12 && (
                        <Alert className="bg-yellow-50 border-yellow-300">
                          <AlertDescription className="text-xs text-yellow-800">
                            <strong>Long Password Mode:</strong> Optimized sampling for 40+ character passwords 
                            with mixed case, numbers, and symbols.
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Network Database Section */}
                {attackMethod === 'wordlist' && (
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Network Password Database
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <input
                            id="useNetwork"
                            type="checkbox"
                            checked={useNetworkDB}
                            onChange={(e) => setUseNetworkDB(e.target.checked)}
                            disabled={isCracking}
                            className="w-4 h-4 rounded"
                          />
                          <Label htmlFor="useNetwork" className="font-normal text-sm">
                            Use external network wordlists
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          {networkDBStatus === 'ready' && (
                            <Badge className="bg-green-100 text-green-700 border-green-300">
                              <Database className="w-3 h-3 mr-1" />
                              {networkPasswordCount.toLocaleString()} passwords
                            </Badge>
                          )}
                          {networkDBStatus === 'loading' && (
                            <Badge variant="outline" className="animate-pulse">
                              <Download className="w-3 h-3 mr-1" />
                              Loading...
                            </Badge>
                          )}
                          {networkDBStatus === 'error' && (
                            <Badge variant="destructive">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Error
                            </Badge>
                          )}
                        </div>
                      </div>

                      {useNetworkDB && networkDBStatus === 'idle' && (
                        <Button
                          onClick={initializeNetworkDB}
                          disabled={isCracking}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Load Network Databases
                        </Button>
                      )}

                      {useNetworkDB && networkDBStatus === 'loading' && fetchProgress.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-600">
                            Loading {fetchProgress.filter(p => p.status === 'success').length} / {fetchProgress.length} sources
                          </p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {fetchProgress.map((fp, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="truncate flex-1">{fp.source}</span>
                                <span className="ml-2">
                                  {fp.status === 'success' && <span className="text-green-600">✓ {fp.passwordsLoaded.toLocaleString()}</span>}
                                  {fp.status === 'loading' && <span className="text-blue-600">...</span>}
                                  {fp.status === 'error' && <span className="text-red-600">✗</span>}
                                  {fp.status === 'pending' && <span className="text-gray-400">○</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {useNetworkDB && networkDBStatus === 'ready' && (
                        <Alert className="bg-white border-green-300">
                          <AlertDescription className="text-xs text-green-800">
                            <strong>Sources loaded:</strong>
                            <ul className="mt-1 space-y-1">
                              <li>• SecLists (10k-1M common passwords)</li>
                              <li>• RockYou leak database</li>
                              <li>• Default credentials & patterns</li>
                              <li>• WiFi common passwords</li>
                              <li>• Honeypot attack logs</li>
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Action Button */}
                <div>
                  {!isCracking ? (
                    <Button 
                      onClick={startCracking} 
                      className="w-full"
                      size="lg"
                    >
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Start Attack
                    </Button>
                  ) : (
                    <Button 
                      onClick={stopCracking} 
                      variant="destructive" 
                      className="w-full"
                      size="lg"
                    >
                      <StopCircle className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                  )}
                </div>

                {/* Progress */}
                {(isCracking || result) && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">{attempts.toLocaleString()} attempts</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    <p className="text-sm text-gray-600 truncate">{statusMessage}</p>
                  </div>
                )}

                {/* Result */}
                {result && (
                  <Alert className={result.found ? 'bg-green-50 border-green-300' : 'bg-gray-50'}>
                    <AlertDescription>
                      {result.found ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-green-700 font-semibold">
                            <CheckCircle className="w-5 h-5" />
                            Password Found!
                          </div>
                          <div className="bg-white p-3 rounded border border-green-300">
                            <code className="text-lg font-mono text-green-900">{result.password}</code>
                          </div>
                          <p className="text-xs text-gray-600">
                            Method: {result.method} | Time: {(result.timeTaken / 1000).toFixed(2)}s | Attempts: {result.attempts.toLocaleString()}
                          </p>
                        </div>
                      ) : (
                        <div className="text-gray-700">
                          Password not found after {result.attempts.toLocaleString()} attempts. 
                          Try increasing the cost factor or using a different attack method.
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Test Hashes */}
                <Card className="bg-gray-50">
                  <CardHeader>
                    <CardTitle className="text-sm">Test Hashes (SHA-256)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div><strong>password</strong>: 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8</div>
                    <div><strong>123456</strong>: 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92</div>
                    <div><strong>admin</strong>: 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918</div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Generate Hash Tab */}
          <TabsContent value="generate">
            <Card>
              <CardHeader>
                <CardTitle>Hash Generator & Verifier</CardTitle>
                <CardDescription>Generate hashes for testing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="text"
                    placeholder="Enter password"
                    value={passwordToHash}
                    onChange={(e) => setPasswordToHash(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="genHashType">Algorithm</Label>
                  <Select value={genHashType} onValueChange={(value) => setGenHashType(value as HashType)}>
                    <SelectTrigger id="genHashType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sha1">SHA-1</SelectItem>
                      <SelectItem value="sha256">SHA-256</SelectItem>
                      <SelectItem value="sha384">SHA-384</SelectItem>
                      <SelectItem value="sha512">SHA-512</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={generateHash} className="w-full">
                  Generate Hash
                </Button>

                {generatedHash && (
                  <div className="space-y-2">
                    <Label>Generated Hash</Label>
                    <div className="flex gap-2">
                      <Input
                        value={generatedHash}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => copyToClipboard(generatedHash)}
                      >
                        {copySuccess ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* History Modal */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent 
            className={`overflow-hidden flex flex-col bg-white/98 backdrop-blur-2xl border-gray-300 shadow-2xl rounded-2xl transition-all duration-300 p-0 ${
              isResizing ? 'select-none' : ''
            }`}
            style={{
              width: historyExpanded ? '95vw' : `${dialogSize.width}px`,
              height: historyExpanded ? '95vh' : `${dialogSize.height}px`,
              maxWidth: historyExpanded ? '95vw' : `${dialogSize.width}px`,
              maxHeight: historyExpanded ? '95vh' : `${dialogSize.height}px`,
            }}
          >
            {/* Resize Handles */}
            {!historyExpanded && (
              <>
                {/* Right resize handle */}
                <div
                  className="absolute top-0 right-0 w-2 h-full cursor-ew-resize hover:bg-blue-400/50 transition-all z-50 group"
                  onMouseDown={(e) => handleMouseDownResize(e, 'right')}
                  style={{ background: isResizing ? '#60a5fa' : 'transparent' }}
                >
                  <div className="absolute top-1/2 right-0 transform -translate-y-1/2 w-1 h-12 bg-gray-300 group-hover:bg-blue-500 rounded-l transition-colors" />
                </div>
                {/* Bottom resize handle */}
                <div
                  className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize hover:bg-blue-400/50 transition-all z-50 group"
                  onMouseDown={(e) => handleMouseDownResize(e, 'bottom')}
                  style={{ background: isResizing ? '#60a5fa' : 'transparent' }}
                >
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-300 group-hover:bg-blue-500 rounded-t transition-colors" />
                </div>
                {/* Corner resize handle */}
                <div
                  className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-50 group flex items-center justify-center"
                  onMouseDown={(e) => handleMouseDownResize(e, 'corner')}
                >
                  <div className="w-4 h-4 border-r-2 border-b-2 border-gray-400 group-hover:border-blue-500 transition-colors rounded-br" />
                  <svg 
                    className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transition-colors absolute bottom-0.5 right-0.5" 
                    fill="currentColor" 
                    viewBox="0 0 16 16"
                  >
                    <path d="M8 8l4 4M12 8l4 4"/>
                  </svg>
                </div>
              </>
            )}

            <DialogHeader className="pb-5 border-b border-gray-200 flex-shrink-0 px-6 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <DialogTitle className="flex items-center gap-3 text-3xl mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                      <HistoryIcon className="w-6 h-6 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      Crack History
                    </span>
                  </DialogTitle>
                  <DialogDescription className="text-base text-gray-600 ml-13">
                    Track all your password cracking attempts with IP logging
                    {!historyExpanded && (
                      <span className="text-xs text-gray-400 ml-2">• Drag edges to resize</span>
                    )}
                  </DialogDescription>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button 
                    variant="outline" 
                    size="default" 
                    onClick={() => setHistoryExpanded(!historyExpanded)}
                    className="gap-2 shadow-sm hover:shadow-md hover:bg-purple-50"
                  >
                    {historyExpanded ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                        </svg>
                        Collapse
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5.25 5.25M20 8V4m0 0h-4m4 0l-5.25 5.25M4 16v4m0 0h4m-4 0l5.25-5.25M20 20l-5.25-5.25M20 20v-4m0 4h-4" />
                        </svg>
                        Expand
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="default" onClick={exportHistoryPDF} className="gap-2 shadow-sm hover:shadow-md hover:bg-blue-50">
                    <Download className="w-4 h-4" />
                    PDF
                  </Button>
                  <Button variant="outline" size="default" onClick={exportHistoryJSON} className="gap-2 shadow-sm hover:shadow-md hover:bg-green-50">
                    <Download className="w-4 h-4" />
                    JSON
                  </Button>
                  <Button variant="destructive" size="default" onClick={clearHistory} className="shadow-sm hover:shadow-md">
                    Clear All
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-auto space-y-6 py-4 px-6">
              {/* Stats Summary */}
              {stats.totalAttempts > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-xs text-blue-600 mb-1 font-semibold uppercase tracking-wide">Total Attempts</div>
                    <div className="text-3xl font-bold text-blue-700">{stats.totalAttempts}</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-xs text-green-600 mb-1 font-semibold uppercase tracking-wide">Success Rate</div>
                    <div className="text-3xl font-bold text-green-700">
                      {stats.totalAttempts > 0 ? Math.round((stats.successfulCracks / stats.totalAttempts) * 100) : 0}%
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-xs text-purple-600 mb-1 font-semibold uppercase tracking-wide">Passwords Tested</div>
                    <div className="text-3xl font-bold text-purple-700">
                      {stats.totalPasswordsTested > 999999 
                        ? `${(stats.totalPasswordsTested / 1000000).toFixed(1)}M`
                        : stats.totalPasswordsTested.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-xs text-orange-600 mb-1 font-semibold uppercase tracking-wide">Avg Time</div>
                    <div className="text-3xl font-bold text-orange-700">
                      {(stats.averageTime / 1000).toFixed(1)}s
                    </div>
                  </div>
                </div>
              )}

              {/* History List */}
              {history.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Recent Activity</h3>
                    <span className="text-xs text-gray-500">{history.length} total entries</span>
                  </div>
                  <div className="space-y-2">
                    {history.slice(0, 20).map((entry) => (
                      <div
                        key={entry.id}
                        className={`p-4 rounded-xl border transition-all hover:shadow-lg hover:scale-[1.01] ${
                          entry.success
                            ? 'bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-green-300 shadow-sm'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 mt-1">
                            {entry.success ? (
                              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-md">
                                <CheckCircle className="w-6 h-6 text-white" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-gray-600" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge 
                                variant={entry.mode === 'mega' ? 'destructive' : entry.mode === 'ultra' ? 'default' : 'outline'}
                                className="text-xs font-semibold"
                              >
                                {entry.mode.toUpperCase()}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">{entry.hashType.toUpperCase()}</Badge>
                              <span className="text-xs text-gray-500 font-medium">
                                {new Date(entry.timestamp).toLocaleString()}
                              </span>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded truncate">
                                Hash: {entry.targetHash}
                              </div>
                              
                              {entry.success && entry.password && (
                                <div className="font-mono text-sm font-bold text-green-700 bg-green-100 px-3 py-2 rounded-lg border border-green-300 shadow-sm">
                                  🔓 Password: <span className="text-green-800">{entry.password}</span>
                                </div>
                              )}
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                <div className="bg-gray-50 px-2 py-1 rounded">
                                  <span className="text-gray-500">Method:</span>{' '}
                                  <span className="font-semibold text-gray-700">{entry.attackMethod}</span>
                                </div>
                                <div className="bg-gray-50 px-2 py-1 rounded">
                                  <span className="text-gray-500">Attempts:</span>{' '}
                                  <span className="font-semibold text-gray-700">{entry.attempts.toLocaleString()}</span>
                                </div>
                                <div className="bg-gray-50 px-2 py-1 rounded">
                                  <span className="text-gray-500">Time:</span>{' '}
                                  <span className="font-semibold text-gray-700">{(entry.timeTaken / 1000).toFixed(2)}s</span>
                                </div>
                                <div className="bg-gray-50 px-2 py-1 rounded truncate">
                                  <span className="text-gray-500">IP:</span>{' '}
                                  <span className="font-semibold text-gray-700">{entry.ipAddress}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <HistoryIcon className="w-10 h-10 text-gray-300" />
                  </div>
                  <p className="text-gray-500 text-lg font-medium">No history yet</p>
                  <p className="text-gray-400 text-sm mt-1">Start cracking some hashes!</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
