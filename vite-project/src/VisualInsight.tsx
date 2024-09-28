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
  
  // Define the video feed URL
  const videoFeedUrl = 'http://10.108.214.115:5000/video_feed';

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

  const handleCapture = async () => {
    try {
      const response = await fetch('http://10.108.214.115:5000/snapshot');
      if (response.ok) {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        setIsLiveMode(false);
      } else {
        console.error('Failed to capture image');
      }
    } catch (error) {
      console.error('Error capturing image:', error);
    }
  };

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
      {/* ... header and other components ... */}
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
          <div
            className="rounded-lg overflow-hidden"
            style={{ width: '500px', height: 'auto', margin: '0 auto' }} // Set width and center the video
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
              className="rounded-lg overflow-hidden"
              style={{ width: '500px', height: 'auto', margin: '0 auto' }}
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
          {/* ... other tabs and components ... */}
        </Tabs>
      </main>
    </motion.div>
  )
}
