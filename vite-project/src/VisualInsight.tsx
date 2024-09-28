'use client'

import { useState, useEffect } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, MessageSquare, RefreshCw } from 'lucide-react'

const colors = {
  black: '#000000',
  chineseBlack: '#141414',
  eerieBlack: '#1b1b1b',
  white: '#ffffff',
  antiFlashWhite: '#f3f3f3',
  chineseWhite: '#e1e1e1',
}

export default function VisualInsight() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I can provide insights on what you\'re looking at. How can I assist you today?' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLiveMode, setIsLiveMode] = useState(true)
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const controls = useAnimation()

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isLoading) {
      animateName()
    }
  }, [isLoading])

  const animateName = async () => {
    await controls.start(i => ({
      opacity: 1,
      transition: { delay: i * 0.1 }
    }))
    controls.start("blink")
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      setMessages([...messages, { role: 'user', content: input }])
      setInput('')
      setIsSpeaking(true)
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: 'I\'m analyzing what you\'re seeing. Give me a moment...' }])
        setIsSpeaking(false)
      }, 2000)
    }
  }

  const handleCapture = () => {
    setCapturedImage('/placeholder.svg?height=300&width=400')
    setIsLiveMode(false)
  }

  const handleSwitchToLive = () => {
    setCapturedImage(null)
    setIsLiveMode(true)
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
      className="min-h-screen flex flex-col w-full"
      style={{ backgroundColor: colors.black, color: colors.white }}
    >
      <header className="w-full shadow" style={{ backgroundColor: colors.eerieBlack }}>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold flex items-center">
            <div>
              {"VisualInsight AI".split('').map((letter, index) => (
                <motion.span
                  key={index}
                  custom={index}
                  initial={{ opacity: 0 }}
                  animate={controls}
                  style={{ display: 'inline-block' }}
                >
                  {letter}
                </motion.span>
              ))}
              <motion.span
                initial={{ opacity: 0 }}
                animate={controls}
                variants={{
                  blink: {
                    opacity: [0, 1, 0],
                    transition: {
                      duration: 1,
                      repeat: Infinity,
                      repeatDelay: 0.5,
                    },
                  },
                }}
                style={{ display: 'inline-block' }}
              >
                .
              </motion.span>
            </div>
          </h1>
        </div>
      </header>
      <main className="flex-grow w-full px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="video" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="video">Video Feed</TabsTrigger>
            <TabsTrigger value="chat">AI Chat</TabsTrigger>
          </TabsList>
          <TabsContent value="video">
            <Card style={{ backgroundColor: colors.chineseBlack, borderColor: colors.eerieBlack }}>
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
                  <div className="aspect-w-16 aspect-h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: colors.eerieBlack }}>
                    <p style={{ color: colors.chineseWhite }}>Bluetooth video stream will appear here</p>
                  </div>
                ) : (
                  capturedImage ? (
                    <img src={capturedImage} alt="Captured" className="w-full h-auto rounded-lg" />
                  ) : (
                    <p style={{ color: colors.chineseWhite }}>No image captured</p>
                  )
                )}
                </motion.div>
                <div className="mt-4 flex space-x-2">
                  <motion.div className="flex-1" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button onClick={handleCapture} className="w-full" disabled={!isLiveMode}>
                      <Camera className="mr-2 h-4 w-4" /> Capture Image
                    </Button>
                  </motion.div>
                  <motion.div className="flex-1" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button onClick={handleSwitchToLive} className="w-full" disabled={isLiveMode}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Switch to Live
                    </Button>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="chat">
            <Card style={{ backgroundColor: colors.chineseBlack, borderColor: colors.eerieBlack }}>
              <CardHeader>
                <CardTitle style={{ color: colors.white }}>AI Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 overflow-y-auto mb-4 space-y-4">
                  {messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`rounded-lg px-4 py-2 max-w-[80%]`}
                        style={{
                          backgroundColor: message.role === 'user' ? colors.eerieBlack : colors.chineseBlack,
                          color: colors.white
                        }}
                      >
                        {message.content}
                      </div>
                    </motion.div>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                  <Input
                    type="text"
                    placeholder="Ask about what you're seeing..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-grow"
                    style={{
                      backgroundColor: colors.eerieBlack,
                      color: colors.white,
                      borderColor: colors.chineseBlack,
                    }}
                  />
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      type="submit" 
                      style={{
                        backgroundColor: colors.white,
                        color: colors.black,
                      }}
                      className="hover:bg-opacity-90"
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
