export type WebGLError = {
  id: string; // MD5 hash of error message
  message: string;
  stackTrace?: string;
  timestamp: Date;
  count: number;
  url?: string;
  context?: {
    shaderType?: string;
    functionName?: string;
    lineNumber?: number;
  };
};

export type ShaderCompilationError = {
  id: string;
  type: "shader_compilation" | "program_linking";
  shaderType?: "vertex" | "fragment";
  source?: string;
  errorLog: string;
  lineNumber?: number;
  columnNumber?: number;
  timestamp: Date;
  url?: string;
  programId?: string;
  shaderId?: string;
};

export type WebGLContextInfo = {
  version: string;
  vendor: string;
  renderer: string;
  shadingLanguageVersion: string;
  extensions: string[];
  parameters: Record<string, any>;
};

export type WebGLShaderInfo = {
  type: "vertex" | "fragment";
  source: string;
  compileStatus: boolean;
  infoLog?: string;
};

export type WebGLProgramInfo = {
  linkStatus: boolean;
  infoLog?: string;
  shaders: WebGLShaderInfo[];
  activeAttributes: Array<{
    name: string;
    type: number;
    size: number;
  }>;
  activeUniforms: Array<{
    name: string;
    type: number;
    size: number;
  }>;
};

export type WebGLNotificationType = 
  | "webgl.error.shader_compilation"
  | "webgl.error.program_linking"
  | "webgl.error.general";

export type WebGLNotification = {
  type: WebGLNotificationType;
  timestamp: Date;
  error: WebGLError | ShaderCompilationError;
  severity: "error" | "warning" | "info";
};

export type ErrorSummary = {
  totalErrors: number;
  uniqueErrors: number;
  mostFrequent: Array<{
    message: string;
    count: number;
    percentage: number;
  }>;
  timeRange: {
    start: Date;
    end: Date;
  };
};