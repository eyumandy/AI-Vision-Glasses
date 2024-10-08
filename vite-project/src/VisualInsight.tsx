'use client'

import { useState, useEffect } from 'react'
import { motion, useAnimation, useMotionValue } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, MessageSquare, RefreshCw, Send, Loader2 } from 'lucide-react'

const colors = {
  black: '#000000',
  chineseBlack: '#141414',
  eerieBlack: '#1b1b1b',
  white: '#ffffff',
  antiFlashWhite: '#f3f3f3',
  chineseWhite: '#e1e1e1',
  neonBlue: '#00FFFF',
}

interface TrailDot {
  x: number
  y: number
  id: number
}

const CursorTrail = () => {
  const [trail, setTrail] = useState<TrailDot[]>([])
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const trailLimit = 5
  const trailDuration = 200

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }

    window.addEventListener('mousemove', updateMousePosition)

    const intervalId = setInterval(() => {
      setTrail((prevTrail) => {
        const newTrail = [
          { x: mouseX.get(), y: mouseY.get(), id: Date.now() },
          ...prevTrail,
        ].slice(0, trailLimit)

        return newTrail
      })
    }, 30)

    return () => {
      window.removeEventListener('mousemove', updateMousePosition)
      clearInterval(intervalId)
    }
  }, [mouseX, mouseY])

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {trail.map((dot, index) => (
        <motion.div
          key={dot.id}
          className="absolute w-3 h-3 bg-white rounded-full"
          style={{
            left: dot.x,
            top: dot.y,
            opacity: 1 - index * 0.15,
            scale: 1 - index * 0.1,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1 - index * 0.15, scale: 1 - index * 0.1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: trailDuration / 1000 }}
        />
      ))}
    </div>
  )
}

export default function Component() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: 'assistant', content: 'Hello! I can provide insights on what you\'re looking at. How can I assist you today?' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isThinking, setIsThinking] = useState(false)
  const [isLiveMode, setIsLiveMode] = useState(true)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [storedImage, setStoredImage] = useState<string | null>(null)
  const controls = useAnimation()

  const [activeTab, setActiveTab] = useState<'video' | 'chat'>('video')

  const videoFeedUrl = 'http://10.108.214.115:5000/video_feed'

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isLoading) {
      animateHeader()
    }
  }, [isLoading])

  const animateHeader = async () => {
    await controls.start({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      setMessages(prev => [...prev, { role: 'user', content: input }])
      setInput('')
      setIsThinking(true)
      
      try {
        const response = await fetch('http://10.108.214.115:5001/generate_text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_input: input })
        })

        if (response.ok) {
          const result = await response.json()
          setMessages(prev => [...prev, { role: 'assistant', content: result.generated_text }])
        } else {
          throw new Error('Failed to generate response')
        }
      } catch (error) {
        console.error('Error:', error)
        setMessages(prev => [...prev, { role: 'assistant', content: 'I apologize, I encountered an error while processing your request.' }])
      } finally {
        setIsThinking(false)
      }
    }
  }

  const handleCapture = async () => {
    try {
      const response = await fetch('http://10.108.214.115:5000/snapshot')
      if (response.ok) {
        const blob = await response.blob()
        const imageUrl = URL.createObjectURL(blob)
        setCapturedImage(imageUrl)
        setIsLiveMode(false)
      } else {
        console.error('Failed to capture image')
      }
    } catch (error) {
      console.error('Error capturing image:', error)
    }
  }

  const handleSwitchToLive = () => {
    setCapturedImage(null)
    setIsLiveMode(true)
  }

  const handleCaptureAndAnalyze = async () => {
    await handleCapture()
    if (capturedImage) {
      setStoredImage(capturedImage)
      handleTabChange('chat')
      analyzeImageOnServer()
    }
  }

  const analyzeImageOnServer = async () => {
    setIsThinking(true)
    try {
      const analyzeResponse = await fetch('http://10.108.214.115:5000/analyze', { method: 'POST' })
      
      if (analyzeResponse.ok) {
        const analyzeResult = await analyzeResponse.json()
        
        const chatbotResponse = await fetch('http://10.108.214.115:5001/generate_text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(analyzeResult)
        })
  
        if (chatbotResponse.ok) {
          const chatbotResult = await chatbotResponse.json()
          const generatedText = chatbotResult.generated_text || 'No generated response'
          setMessages(prev => [...prev, { role: 'assistant', content: generatedText }])
        } else {
          throw new Error('Failed to generate text from chatbot')
        }
      } else {
        throw new Error('Failed to analyze image')
      }
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: 'I apologize, I encountered an error while analyzing the image.' }])
    } finally {
      setIsThinking(false)
    }
  }
  
  const handleTabChange = (value: string) => {
    if (value === 'video' || value === 'chat') {
      setActiveTab(value)
    } else {
      console.warn(`Invalid tab value: ${value}`)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center w-full" style={{ backgroundColor: colors.black }}>
        <motion.div
          animate={{
            scale: [1, 2, 2, 1, 1],
            rotate: [0, 0, 270, 270, 0],
            borderRadius: ["20%", "20%", "50%", "50%", "20%"],
          }}
          transition={{
            duration: 2,
            ease: "easeInOut",
            times: [0, 0.2, 0.5, 0.8, 1],
            repeat: Infinity,
            repeatDelay: 1
          }}
          className="w-16 h-16"
          style={{ backgroundColor: colors.white }}
        />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col w-full relative overflow-hidden"
      style={{ 
        background: `linear-gradient(to bottom, ${colors.eerieBlack} 0%, ${colors.black} 100%)`,
        color: colors.white 
      }}
    >
      <CursorTrail />
      <motion.header
        className="relative overflow-hidden pt-16 pb-32"
        initial={{ opacity: 0, y: -50 }}
        animate={controls}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="flex flex-col items-center justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <motion.h1
              className="text-5xl font-bold mb-2 text-center"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <span>VisualInsight AI</span>
            </motion.h1>
            <motion.div
              className="text-xl font-semibold text-neonBlue text-center"
            >
              Analyzing Your World
            </motion.div>
            <motion.p
              className="mt-2 text-lg text-gray-400 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              Capture • Analyze • Understand
            </motion.p>
          </motion.div>
        </div>
      </motion.header>
      <main className="flex-grow w-full px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full relative z-10">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="video">Video Feed</TabsTrigger>
            <TabsTrigger value="chat">AI Chat</TabsTrigger>
          </TabsList>
          <TabsContent value="video">
            <Card className="bg-opacity-30 backdrop-blur-md border-opacity-30 transition-all duration-300" style={{ backgroundColor: colors.chineseBlack, borderColor: colors.eerieBlack }}>
              <CardHeader>
                <CardTitle style={{ color: colors.white }}>
                  {isLiveMode ? "Live Video Stream" : "Captured Image"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {isLiveMode ? (
                    <div
                      className="rounded-lg overflow-hidden mx-auto"
                      style={{ width: '500px' }}
                    >
                      <img
                        src={videoFeedUrl}
                        alt="ESP32-CAM Video Stream"
                        className="w-full h-auto object-cover"
                        style={{ transform: 'rotate(-90deg)' }}
                      />
                    </div>
                  ) : (
                    capturedImage ? (
                      <div
                        className="rounded-lg overflow-hidden mx-auto"
                        style={{ width: '500px' }}
                      >
                        <img
                          src={capturedImage}
                          alt="Captured"
                          className="w-full h-auto object-cover"
                          style={{ transform: 'rotate(-90deg)' }}
                        />
                      </div>
                    ) : (
                      <p style={{ color: colors.chineseWhite }}>No image captured</p>
                    )
                  )}
                </motion.div>
                <div className="mt-4 flex space-x-2">
                  <motion.div className="flex-1" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button onClick={handleCapture} className="w-full">
                      <Camera className="mr-2 h-4 w-4" /> Capture Image
                    </Button>
                  </motion.div>
                  <motion.div className="flex-1" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button onClick={handleSwitchToLive} className="w-full" disabled={isLiveMode}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Switch to Live
                    </Button>
                  </motion.div>
                  <motion.div className="flex-1" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button onClick={handleCaptureAndAnalyze} className="w-full" disabled={isLiveMode}>
                      <Send className="mr-2 h-4 w-4" /> Capture & Analyze
                    </Button>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="chat">
            <Card className="bg-opacity-30 backdrop-blur-md border-opacity-30 transition-all duration-300" style={{ backgroundColor: colors.chineseBlack, borderColor: colors.eerieBlack }}>
              <CardHeader>
                <CardTitle style={{ color: colors.white }}>AI Insights</CardTitle>
              </CardHeader>
              <CardContent>
                {storedImage && (
                  <div className="mb-4 rounded-lg overflow-hidden mx-auto" style={{ width: '200px' }}>
                    <img
                      src={storedImage}
                      alt="Stored Captured Image"
                      className="w-full h-auto object-cover"
                      style={{ transform: 'rotate(-90deg)' }}
                    />
                  </div>
                )}
                <div className="h-96 overflow-y-auto mb-4 space-y-4">
                  {messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`rounded-lg px-4 py-2 max-w-[80%] transition-all duration-300`}
                        style={{
                          backgroundColor: message.role === 'user' ? `${colors.eerieBlack}99` : `${colors.chineseBlack}99`,
                          color: colors.white,
                          boxShadow: `0 4px 6px ${colors.black}33`
                        }}
                      >
                        {message.content}
                      </div>
                    </motion.div>
                  ))}
                  {isThinking && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex justify-start"
                    >
                      <div
                        className="rounded-lg px-4 py-2 transition-all duration-300"
                        style={{
                          backgroundColor: `${colors.chineseBlack}99`,
                          color: colors.white,
                          boxShadow: `0 4px 6px ${colors.black}33`
                        }}
                      >
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    </motion.div>
                  )}
                </div>
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                  <Input
                    type="text"
                    placeholder="Ask about what you're seeing..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-grow transition-all duration-300"
                    style={{
                      backgroundColor: `${colors.eerieBlack}99`,
                      color: colors.white,
                      borderColor: colors.chineseBlack,
                    }}
                  />
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      type="submit" 
                      style={{
                        backgroundColor: colors.neonBlue,
                        color: colors.black,
                      }}
                      className="hover:bg-opacity-90 transition-all duration-300"
                      disabled={isThinking}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" /> Send
                    </Button>
                  </motion.div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </motion.div>
  )
}