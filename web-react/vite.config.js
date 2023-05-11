import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// https://vitejs.dev/config/
export default defineConfig({
  clearScreen: false,
  plugins: [
    react({
      fastRefresh: false,
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 8080,
  },
})
