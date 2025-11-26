import { GoogleGenAI } from "@google/genai";
import { InstallerConfig } from "../types";

const getSystemPrompt = () => `
You are an expert Inno Setup 6 Script Generator. Your goal is to generate a **100% COMPILE-READY** script that runs without external file dependencies (except the MSI itself).

**⛔ CRITICAL ERROR PREVENTION RULES (YOU MUST FOLLOW THESE):**

1.  **STRICTLY FORBIDDEN DIRECTIVES (NEVER GENERATE THESE):**
    *   ❌ \`UseAbsolutePaths\`: This directive **DOES NOT EXIST**. Including it causes immediate compiler failure. **DO NOT WRITE IT.**
    *   ❌ \`WizardImageFile\`: **DO NOT WRITE IT.** Attempting to point to 'compiler:image.bmp' often fails. Omit this line entirely to use the safe, built-in default image.
    *   ❌ \`WizardSmallImageFile\`: **DO NOT WRITE IT.** Omit entirely.
    *   ❌ \`SetupIconFile\`: **DO NOT WRITE IT.** Omit entirely.
    *   ❌ \`LicenseFile\`: **DO NOT WRITE IT.**
    *   ❌ \`InfoBeforeFile\`: **DO NOT WRITE IT.**

2.  **PATHING RULES:**
    *   Always use \`{src}\` to refer to the directory where the .iss script is running.
    *   Example: \`Source: "{src}\\MyFile.msi"; DestDir: "{tmp}"; Flags: ignoreversion dontcopy\`

3.  **SYNTAX RULES:**
    *   **Booleans**: Use \`yes\` or \`no\`. Do NOT use \`true\`/\`false\`.
    *   **WizardStyle**: ALWAYS set \`WizardStyle=modern\`.
    *   **Variables**: In Pascal Script, string matching is case-insensitive usually, but be consistent.

**REQUIRED LOGIC IMPLEMENTATION:**

1.  **[Files] Section**:
    *   IF 'Online Mode' is OFF (Local MSI):
        *   \`Source: "{src}\\{#MsiFileName}"; DestDir: "{tmp}"; Flags: ignoreversion dontcopy\`
        *   (Note: Define \`#define MsiFileName "..."\` at the top based on user input).
    *   IF 'Online Mode' is ON:
        *   Do NOT include the MSI in the \`[Files]\` section. We will download it via Pascal Script.

2.  **Clean Install Strategy (Scorched Earth)**:
    *   IF 'Force Clean Install' is ON:
        *   In \`CurStepChanged(ssInstall)\`, BEFORE any installation logic:
        *   1. Check Registry for existing uninstall string. Run it with \`/qn\` if found.
        *   2. **CRITICAL**: Recursively FORCE DELETE \`{localappdata}\\SynologyDrive\`. Use a helper function or \`DelTree\`. This deletes the old user config DB to ensure a fresh start.

3.  **Synology Automation (JSON Generation)**:
    *   IF Enabled, you MUST create a procedure \`GenerateConfigJson\`.
    *   Construct a JSON string manually (Pascal Script doesn't have a native JSON parser/writer, so use string concatenation).
    *   Save it to \`ExpandConstant('{tmp}\\config.json')\`.
    *   **Fields**:
        *   \`mode\`: "light"
        *   \`black_list\`: Include extensions [.tmp, .log, .bak] and **folders**: "WeChat Files\\\\*\\\\Msg", "WeChat Files\\\\*\\\\Video", "FileStorage\\\\Msg", "FileStorage\\\\Video".
        *   \`max_file_size\`: 2147483648 (2GB).
        *   \`backup_start_time\`: User input (if Scheduled) or default.
        *   \`backup_path\`: User selected drives (Iterate the Checklist). **Smart Logic**: If "C:" is in the list, ignore "Desktop" (as it is inside C).
        *   \`computer_name\`: Format is \`Project-Department-ComputerName\`.

4.  **Custom Page (User Input)**:
    *   Create \`CreateInputOptionPage\` isn't enough for Dropdowns + Checklist.
    *   Use \`CreateCustomForm\` or a complex \`CreateInputQueryPage\` combined with \`TInputOptionWizardPage\`? 
    *   **BETTER:** Use \`CreateInputQueryPage\` doesn't support Dropdowns well in standard Inno.
    *   **SOLUTION**: Use **standard Pascal Script classes** to build a custom page (\`CreateCustomPage\`).
        *   Add \`TNewComboBox\` for Project.
        *   Add \`TNewComboBox\` for Department.
        *   Add \`TNewCheckListBox\` for Backup Drives (Desktop, C, D, E, F, G).
    *   **Validation**: The "Next" button should check if Project/Dept are selected and at least one Drive is checked.

5.  **Execution**:
    *   In \`RunInstall\`:
        *   IF Online Mode: Download file using \`DownloadTemporaryFile\` to \`{tmp}\\Setup.msi\`.
        *   Run \`msiexec.exe /i "{tmp}\\Setup.msi" /qn CONFIGPATH="{tmp}\\config.json"\`.

6.  **Output Format**:
    *   RETURN **ONLY** THE CODE. No markdown fencing (\`\`\`), no "Here is your code". Just the raw .iss content.
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

  // Clean filename to prevent spaces in defines
  const safeMsiName = config.msiFileName.trim();

  const prompt = `
    GENERATE INNO SETUP SCRIPT FOR:
    
    #define MyAppName "${config.appName}"
    #define MyAppVersion "${config.appVersion}"
    #define MyAppPublisher "${config.publisher}"
    #define MsiFileName "${safeMsiName}"

    [CONFIGURATION]
    OnlineInstaller=${config.useOnlineInstaller ? 'yes' : 'no'}
    DownloadURL=${config.downloadUrl}
    
    ForceCleanInstall=${config.forceCleanInstall ? 'yes' : 'no'}
    
    [SYNOLOGY CONFIG]
    Enabled=${config.synologyConfig.enabled}
    Server=${config.synologyConfig.serverAddress}
    User=${config.synologyConfig.username}
    Pass=${config.synologyConfig.password}
    
    [USER INTERFACE]
    CollectUserInfo=${config.collectUserInfo}
    ProjectOptions=${config.projectList || 'Default'}
    DepartmentOptions=${config.departmentList || 'Default'}
    UseInfoForDeviceName=${config.useInfoForDeviceName}
    
    EnableBackupSelection=${config.enableBackupSelection}
    BackupMode=${config.backupMode}
    BackupStartTime=${config.backupStartTime}
    EnableSmartFilters=${config.enableSmartFilters}

    [EXECUTION]
    RunAsAdmin=${config.runAsAdmin}
    SilentInstall=${config.silentInstall}
    PostInstallScriptsCount=${config.automationScripts.length}

    IMPORTANT:
    - If OnlineInstaller=no, the script MUST expect "${safeMsiName}" to exist in the same folder as the .iss file (Source: "{src}\\${safeMsiName}").
    - **DO NOT** include WizardImageFile or WizardSmallImageFile.
    - **DO NOT** include UseAbsolutePaths.
    - Ensure 'RestartApplications=yes' and 'CloseApplications=yes'.
  `;

  const generate = async (modelName: string) => {
    return await ai.models.generateContent({
        model: modelName,
        config: {
          systemInstruction: getSystemPrompt(),
          // Use a lower temperature to make the output more deterministic and code-compliant
          temperature: 0.2, 
        },
        contents: prompt,
    });
  };

  try {
    // TIER 1: Try Gemini 3 Pro (Best Quality for Code)
    try {
      console.log("Attempting generation with gemini-3-pro-preview...");
      const response = await retryOperation(() => generate("gemini-3-pro-preview"), 1, 2000);
      return response.text || "// 生成失败，AI 未返回内容。";
    } catch (proError) {
      console.warn("gemini-3-pro-preview failed, attempting fallback to Standard...", proError);
    }

    // TIER 2: Try Gemini 2.5 Flash
    try {
      console.log("Fallback: Attempting generation with gemini-2.5-flash...");
      const response = await retryOperation(() => generate("gemini-2.5-flash"), 1, 1000);
      return response.text || "// 生成失败，AI 未返回内容 (Standard Fallback)。";
    } catch (flashError) {
       console.warn("gemini-2.5-flash failed, attempting fallback to Lite...", flashError);
    }

    // TIER 3: Try Gemini Flash Lite
    console.log("Fallback: Attempting generation with gemini-flash-lite-latest...");
    const response = await retryOperation(() => generate("gemini-flash-lite-latest"), 2, 1000);
    return response.text || "// 生成失败，AI 未返回内容 (Lite Fallback)。";

  } catch (error: any) {
    console.error("Gemini API Error (All models failed):", error);
    const friendlyMessage = extractErrorMessage(error);
    throw new Error(`服务调用失败: ${friendlyMessage}。请检查网络后重试。`);
  }
};
