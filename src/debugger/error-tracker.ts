import { promises as fs } from "fs";
import path from "path";
import type { WebGLError, ShaderCompilationError } from "./types.js";
import { generateHash } from "../utils/hash.js";
import { ensureDirectory } from "../utils/file.js";

const ERRORS_DIR = path.join(process.cwd(), "temp", "webgl-errors");
const ERRORS_FILE = path.join(ERRORS_DIR, "errors.json");
const SHADER_ERRORS_FILE = path.join(ERRORS_DIR, "shader-errors.json");

// In-memory error storage
const errorMap = new Map<string, WebGLError>();
const shaderErrorMap = new Map<string, ShaderCompilationError>();

export const initializeErrorTracker = async (): Promise<void> => {
  await ensureDirectory(ERRORS_DIR);
  
  // Load existing errors if file exists
  try {
    const data = await fs.readFile(ERRORS_FILE, "utf-8");
    const errors: WebGLError[] = JSON.parse(data);
    errors.forEach((error) => {
      errorMap.set(error.id, error);
    });
  } catch (error) {
    // File doesn't exist yet, that's fine
  }
  
  // Load existing shader errors
  try {
    const data = await fs.readFile(SHADER_ERRORS_FILE, "utf-8");
    const errors: ShaderCompilationError[] = JSON.parse(data);
    errors.forEach((error) => {
      shaderErrorMap.set(error.id, error);
    });
  } catch (error) {
    // File doesn't exist yet, that's fine
  }
};

export const trackWebGLError = async (
  error: Omit<WebGLError, "id" | "count">,
): Promise<WebGLError> => {
  const errorId = generateHash(error.message);
  
  const existingError = errorMap.get(errorId);
  
  if (existingError) {
    // Increment count for existing error
    existingError.count++;
    existingError.timestamp = new Date();
    await saveErrors();
    return existingError;
  }
  
  // Create new error entry
  const newError: WebGLError = {
    ...error,
    id: errorId,
    count: 1,
    timestamp: new Date(),
  };
  
  errorMap.set(errorId, newError);
  await saveErrors();
  
  return newError;
};

const saveErrors = async (): Promise<void> => {
  const errors = Array.from(errorMap.values());
  await fs.writeFile(ERRORS_FILE, JSON.stringify(errors, null, 2));
};

export const getWebGLErrors = async (): Promise<WebGLError[]> => {
  return Array.from(errorMap.values());
};

export const clearWebGLErrors = async (): Promise<void> => {
  errorMap.clear();
  await saveErrors();
};

export const getWebGLError = async (errorId: string): Promise<WebGLError | undefined> => {
  return errorMap.get(errorId);
};

export const trackShaderError = async (
  error: Omit<ShaderCompilationError, "id">,
): Promise<ShaderCompilationError> => {
  const errorId = generateHash(error.errorLog + error.type + (error.shaderType || ""));
  
  const existingError = shaderErrorMap.get(errorId);
  
  if (existingError) {
    // Update timestamp for existing error
    existingError.timestamp = new Date();
    await saveShaderErrors();
    return existingError;
  }
  
  // Create new error entry
  const newError: ShaderCompilationError = {
    ...error,
    id: errorId,
    timestamp: new Date(),
  };
  
  shaderErrorMap.set(errorId, newError);
  await saveShaderErrors();
  
  return newError;
};

const saveShaderErrors = async (): Promise<void> => {
  const errors = Array.from(shaderErrorMap.values());
  await fs.writeFile(SHADER_ERRORS_FILE, JSON.stringify(errors, null, 2));
};

export const getShaderErrors = async (): Promise<ShaderCompilationError[]> => {
  return Array.from(shaderErrorMap.values());
};

export const clearShaderErrors = async (): Promise<void> => {
  shaderErrorMap.clear();
  await saveShaderErrors();
};

// Initialize on module load
initializeErrorTracker().catch(console.error);