#!/usr/bin/env node
/**
 * Script to capture screenshots of only canvas elements from WebGL test pages
 */
import { launchBrowser } from "../browser/launcher.js";
import { captureScreenshot, saveScreenshotMetadata } from "../screenshot/capture.js";
import type { BrowserLaunchOptions } from "../browser/types.js";

const pages = [
  { url: "http://localhost:8765/webgl-test/basic", name: "canvas-only-basic" },
  { url: "http://localhost:8765/webgl-test/webgl2", name: "canvas-only-webgl2" },
  { url: "http://localhost:8765/webgl-test/texture", name: "canvas-only-texture" },
];

async function captureCanvasScreenshots() {
  console.log("🚀 Launching browser with WebGL support...");
  
  // Launch browser with WebGL options
  const browserOptions: BrowserLaunchOptions = {
    url: "http://localhost:8765/webgl-test/",
    viewport: { width: 1280, height: 720 },
    debugPort: 9223, // Different port to avoid conflicts
    webglOptions: {
      ignoreGpuBlocklist: false,
    },
    headless: false, // Set to false to see what's happening
  };

  let instance;
  
  try {
    instance = await launchBrowser(browserOptions);
    console.log("✅ Browser launched successfully");
    
    // Wait a bit for the initial page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Capture screenshots for each page
    for (const pageInfo of pages) {
      console.log(`\n📸 Capturing canvas element for: ${pageInfo.name}`);
      console.log(`   URL: ${pageInfo.url}`);
      
      // Navigate to the page
      await instance.page.goto(pageInfo.url, { waitUntil: 'networkidle2' });
      
      // Wait a bit for any WebGL content to render
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Capture screenshot of canvas only
      const result = await captureScreenshot(instance.page, {
        testCase: pageInfo.name,
        format: "png",
        fullPage: false,
        captureCanvas: true, // This captures only the canvas element
      });
      
      // Save metadata
      await saveScreenshotMetadata(result);
      
      console.log(`   ✅ Canvas screenshot saved: ${result.filename}`);
      console.log(`   📁 Path: ${result.path}`);
    }
    
    console.log("\n🎉 All canvas screenshots captured successfully!");
    console.log("📁 Screenshots saved in: ./screenshots/");
    
  } catch (error) {
    console.error("❌ Error capturing screenshots:", error);
  } finally {
    if (instance) {
      console.log("\n🔒 Closing browser...");
      await instance.browser.close();
    }
  }
}

// Run the script
captureCanvasScreenshots().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});