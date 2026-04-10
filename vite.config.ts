import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  base: "/inspection/",
  plugins: [react()],
  build: {
    outDir: "dist/ui"
  }
});
