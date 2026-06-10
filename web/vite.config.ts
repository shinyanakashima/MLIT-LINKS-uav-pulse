import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Served from a project page (https://<user>.github.io/MLIT-LINKS-uav-pulse/),
// so assets must be referenced under that base path.
export default defineConfig({
  base: "/MLIT-LINKS-uav-pulse/",
  plugins: [react(), tailwindcss()],
});
