import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Define configuration for Vite, including alias setup for @
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src") // Alias @ to the src folder
    }
  }
})
