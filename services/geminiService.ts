import { GoogleGenAI } from "@google/genai";
import { InstallerConfig } from "../types";

const getSystemPrompt = () => `
You are an elite DevOps and Application Packaging Engineer specialized in Inno Setup 6. 
Your task is to generate a MODERN, sleek, and production-ready Inno Setup script (.iss).

**CRITICAL COMPILER RULES (STRICT COMPLIANCE REQUIRED):**
1. **ABSOLUTELY FORBIDDEN DIRECTIVES (DO NOT GENERATE THESE)**:
   - ❌ **UseAbsolutePaths**: This directive DOES NOT EXIST in Inno Setup 6. Do NOT include it.
   - ❌ **WizardImageFile**: Do NOT specify this. Omit it to use the built-in default image.
   - ❌ **WizardSmallImageFile**: Do NOT specify this. Omit it to use the built-in default icon.
   - ❌ **OutputBaseFilename**: Do NOT use spaces in the filename.
2. **Syntax Rules**:
   - **NO SPACES in Directive Names**: Use 'RestartApplications', NOT 'Restart Applications'.
   - **Boolean Values**: Use 'yes' or 'no' (not 'true'/'false').
   - **WizardStyle**: ALWAYS set 'WizardStyle=modern'.

Requirements:
1. **MSI Handling**: 
   - IF 'Online Mode' is OFF: Embed and run the MSI normally.
   - IF 'Online Mode' is ON: Use 'DownloadTemporaryFile' (Inno Setup 6.1+) to download the MSI from the URL provided to '{tmp}\\Setup.msi' before running it.
2. **Clean Install Strategy (CRITICAL)**:
   - IF 'Force Clean Install' is ON:
     - **Detection**: Check Registry for existing Synology Drive uninstall keys.
     - **Uninstall**: If found, attempt to run 'msiexec /x {GUID} /qn' (Best effort).
     - **WIPE DATA (SCORCHED EARTH)**: In 'CurStepChanged(ssInstall)', BEFORE copying files, you MUST write a Pascal Script to recursively DELETE the directory: '{localappdata}\\SynologyDrive'. Use 'DelTree'. This ensures old user data/configs are GONE.
3. **Synology Automation**:
   - If 'Synology Config' is enabled, you MUST generate a 'config.json' file in '{tmp}' based on the user's settings.
   - You must write a Pascal Script procedure to construct this JSON string DYNAMICALLY.
   - **Computer Name Logic**: 
     - IF 'Use Info for Device Name' is ON: Read the 'Project' and 'Department' inputs. Combine them: Format('%s-%s-%s', [Project, Department, GetComputerNameString]). Assign this to the 'computer_name' field in JSON. **NOTE: No brackets [] in the format.**
   - **Dynamic List**: Iterate through the custom Checkbox List (TNewCheckListBox) created in the UI. 
     - Checked items [Desktop, C:, D:, E:, F:, G:] must be added to 'backup_source' array.
     - **SMART DE-DUPLICATION**: If 'C:' is selected, you MUST NOT include 'Desktop' in the array, because Desktop is contained within C:. This prevents redundant backup tasks.
   - **Smart Filters (BLACKLIST STRATEGY v2.0)**:
     - IF 'Enable Smart Filters' is ON: Implement 'black_list' and 'max_file_size' in the JSON config.
     - **STRATEGY**: BACKUP EVERYTHING EXCEPT JUNK.
     - **Max File Size**: 2048 MB (2GB).
     - **System Junk (Files)**: .tmp, .log, .bak, .lnk, .url, .sys, .dll, .exe, .msi, .bat, .cmd, .com, .iso, .gho, .db, .db-shm, .db-wal, .dat, desktop.ini, Thumbs.db, ~$*
     - **Chat Junk (Folders/Patterns)**: 
       - Block 'WeChat Files\\*\\Video'
       - Block 'WeChat Files\\*\\Msg' (Databases)
       - Block 'FileStorage\\Video'
       - Block 'FileStorage\\Msg'
       - **CRITICAL**: DO NOT BLOCK 'WeChat Files' root, because we MUST BACKUP images (.jpg, .png).
     - **System Directories (Absolute Paths)**: 
       - C:\\Windows
       - C:\\Program Files
       - C:\\Program Files (x86)
       - C:\\ProgramData
       - C:\\$Recycle.Bin
   - **Backup Mode**:
     - Mode 0 (Continuous) vs Mode 2 (Scheduled).
     - If Scheduled, set 'backup_start_time' from input.
   - **Execution**: When running the MSI (msiexec.exe), you MUST add the argument '/qn CONFIGPATH="{tmp}\\config.json"'.
4. **Custom Input Feature & CASCADING LOGIC**: 
   - Create a custom Wizard Page using Pascal Script (TInputOptionWizardPage or custom form).
   - Use Dropdowns (ComboBoxes) for 'Project Name' and 'Department'.
   - **CASCADING LOGIC (IMPORTANT)**: You MUST implement an 'OnChange' event for the Project ComboBox.
     - When Project changes, Clear and Repopulate the Department ComboBox.
     - IF Project='总经办' -> Dept=['总经办']
     - IF Project='职能部门' -> Dept=['人力行政部', '财务管理部', '运营管理部']
     - IF Project='卖场' -> Dept=['卖场服务部']
     - IF Project='万晟汇' -> Dept=['万晟汇']
     - ELSE -> Dept=['项目综合部', '客户服务部', '工程维护部, '秩序维护部, '环境维护部'] (OR use user-provided list if available)
   - Use a Checkbox List (TNewCheckListBox) for 'Backup Directory Selection' (Desktop, C:, D:, E:, F:, G:). **DO NOT include H:**.
   - **VALIDATION**: The 'Next' button MUST be disabled until the user selects both Project, Department, AND at least one Backup Directory.
   - Capture these variables for use in the JSON generation logic.
5. **Summary Page (wpReady)**:
   - Override the 'UpdateReadyMemo' event function.
   - Update the Ready Memo to display the collected 'Project', 'Department', and 'Backup Directories' so the user can confirm before installing.
6. **Language**: The installer interface MUST be in **Simplified Chinese** by default.
7. **Output**: Return ONLY the raw code. No markdown blocks, no explanations.
`;

const retryOperation = async <T>(operation: () => Promise<T>, retries = 2, delay = 1000): Promise<T> => {
  let lastError: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < retries) {
        console.warn(`API call attempt ${i + 1} failed. Retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
  throw lastError;
};

// Helper to sanitize error messages from Google GenAI SDK
const extractErrorMessage = (error: any): string => {
  let msg = error instanceof Error ? error.message : String(error);

  // Attempt to parse JSON error strings (common in SDK errors)
  try {
    if (typeof error === 'string' && (error.startsWith('{') || error.startsWith('['))) {
       const parsed = JSON.parse(error);
       if (parsed.error && parsed.error.message) {
         msg = parsed.error.message;
       }
    } else if (error.error && error.error.message) {
      // Direct object access
      msg = error.error.message;
    }
  } catch (e) {
    // Failed to parse, use original message
  }

  // Friendly mapping
  if (msg.includes("Rpc failed") || msg.includes("xhr error") || msg.includes("network")) {
    return "网络连接不稳定 (RPC/Network Error)";
  }
  if (msg.includes("429") || msg.includes("Quota")) {
    return "请求过于频繁，请稍后重试 (Rate Limit)";
  }
  if (msg.includes("503") || msg.includes("Overloaded")) {
    return "AI 模型服务繁忙 (Service Overloaded)";
  }
  
  return msg;
};

export const generateInstallerScript = async (config: InstallerConfig): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please ensure process.env.API_KEY is configured.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Generate a complete Inno Setup (.iss) script for:
    
    [Metadata]
    App Name: ${config.appName}
    Version: ${config.appVersion}
    Publisher: ${config.publisher}
    
    [Install Mode]
    - Online Installer: ${config.useOnlineInstaller ? 'YES' : 'NO'}
    ${config.useOnlineInstaller ? `- Download URL: "${config.downloadUrl}"` : `- Local MSI: "${config.msiFileName}"`}
    
    [Clean Strategy]
    - Force Clean Install: ${config.forceCleanInstall ? 'YES (Wipe %localappdata%\\SynologyDrive)' : 'NO'}

    [Synology Server Config]
    - Enabled: ${config.synologyConfig.enabled}
    ${config.synologyConfig.enabled ? `
    - Server: ${config.synologyConfig.serverAddress}
    - User: ${config.synologyConfig.username}
    - Pass: ${config.synologyConfig.password}
    - Action: Generate JSON config in {tmp} and pass via CONFIGPATH argument to MSI.
    ` : 'No automation.'}

    [User Info & Backup UI]
    ${config.collectUserInfo ? `
    - Custom Page Required: Yes
    - Project Options (Source): ${config.projectList || 'Default'}
    - Department Options (Source): ${config.departmentList || 'Default'}
    - Device Renaming: ${config.useInfoForDeviceName ? 'YES (Format: Proj-Dept-Hostname)' : 'NO'}
    ${config.enableBackupSelection ? `
    - Backup Selection: Add Checkbox List for [Desktop, C:, D:, E:, F:, G:]. 
    - Backup Mode: ${config.backupMode} (${config.backupMode === 'scheduled' ? config.backupStartTime : 'Realtime'})
    - Enable Smart Filters: ${config.enableSmartFilters ? 'YES (BLACKLIST MODE v2.0: Block junk/video/db, Allow Chat Images, Limit 2GB)' : 'NO'}
    - Logic: Use checked items to populate the 'backup_source' array in the Synology JSON config.
    ` : ''}
    ` : 'No custom page.'}

    [Configuration]
    - Run as Admin: ${config.runAsAdmin}
    - Silent MSI: ${config.silentInstall}
    - Extra Scripts: ${config.automationScripts.length} (Run after MSI)
    
    IMPORTANT GENERATION RULES: 
    1. Ensure 'RestartApplications=yes' and 'CloseApplications=yes' are written CORRECTLY without spaces.
    2. ❌ DO NOT include 'UseAbsolutePaths'. This directive does not exist.
    3. ❌ DO NOT include 'WizardImageFile' or 'WizardSmallImageFile'. Let Inno Setup use the default modern theme.
    4. Return ONLY the .iss code content.
  `;

  const generate = async (modelName: string) => {
    return await ai.models.generateContent({
        model: modelName,
        config: {
          systemInstruction: getSystemPrompt(),
        },
        contents: prompt,
    });
  };

  try {
    // TIER 1: Try Gemini 3 Pro (Best Quality)
    try {
      console.log("Attempting generation with gemini-3-pro-preview...");
      const response = await retryOperation(() => generate("gemini-3-pro-preview"), 1, 1500);
      return response.text || "// 生成失败，AI 未返回内容。";
    } catch (proError) {
      console.warn("gemini-3-pro-preview failed, attempting fallback to Standard...", proError);
    }

    // TIER 2: Try Gemini 2.5 Flash (Standard Speed/Stability)
    try {
      console.log("Fallback: Attempting generation with gemini-2.5-flash...");
      const response = await retryOperation(() => generate("gemini-2.5-flash"), 1, 1000);
      return response.text || "// 生成失败，AI 未返回内容 (Standard Fallback)。";
    } catch (flashError) {
       console.warn("gemini-2.5-flash failed, attempting fallback to Lite...", flashError);
    }

    // TIER 3: Try Gemini Flash Lite (Highest Availability / Last Resort)
    console.log("Fallback: Attempting generation with gemini-flash-lite-latest...");
    const response = await retryOperation(() => generate("gemini-flash-lite-latest"), 2, 1000);
    return response.text || "// 生成失败，AI 未返回内容 (Lite Fallback)。";

  } catch (error: any) {
    console.error("Gemini API Error (All models failed):", error);
    const friendlyMessage = extractErrorMessage(error);
    // Return a clean error message to the UI
    throw new Error(`服务调用失败: ${friendlyMessage}。请检查网络后重试。`);
  }
};
