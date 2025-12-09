import { InstallerConfig } from "../types";

// --- 1. Package.json (Locked Dependencies & Scripts) ---
const generatePackageJson = (config: InstallerConfig) => {
  let safeName = config.appName
    .replace(/[^\x00-\x7F]/g, "") 
    .replace(/\s+/g, '-')         
    .replace(/[^a-zA-Z0-9-]/g, "") 
    .toLowerCase();

  safeName = safeName.replace(/^-+|-+$/g, "");
  if (!safeName || safeName.length < 2) safeName = "synology-drive-helper";

  return JSON.stringify({
    name: safeName,
    version: "1.0.0",
    description: "Synology Drive Auto-Deployment Tool",
    main: "main.js",
    scripts: {
      "start": "electron .",
      "pack": "electron-builder --dir",
      "dist": "electron-builder"
    },
    author: "InstallerBuilder",
    license: "ISC",
    dependencies: {
      "fs-extra": "^11.1.0"
    },
    devDependencies: {
      "electron": "^29.1.0",
      "electron-builder": "^24.13.3"
    },
    build: {
      appId: `com.${safeName}.installer`,
      productName: "SynologyDriveAssistant",
      directories: {
        output: "dist",
        buildResources: "."
      },
      icon: "tubiao.ico",
      files: [
        "**/*",
        "tubiao.ico" 
      ],
      win: {
        target: "portable",
        icon: "tubiao.ico", 
        verifyUpdateCodeSignature: false,
        requestedExecutionLevel: "asInvoker"
      },
      portable: {
        artifactName: "SynologyDriveAssistant.exe", 
        requestExecutionLevel: "user"
      },
      extraResources: [
        "./extraResources/**"
      ]
    }
  }, null, 2);
};

// --- 2. Main.js (STABLE NODE DOWNLOADER) ---
const generateMainJs = (config: InstallerConfig) => {
    // Construct the payload object SAFE for injection via JSON.stringify
    const synologyConfigPayload = config.synologyConfig.enabled ? {
        "connections": [
            {
                "server_address": config.synologyConfig.serverAddress,
                "username": config.synologyConfig.username,
                "password": config.synologyConfig.password,
                "as_user": config.synologyConfig.asUser, // Values with backslashes are safe here
                "enable_ssl": config.synologyConfig.enableSsl,
                "allow_untrusted_certificate": config.synologyConfig.allowUntrustedCertificate,
                "sync_sessions": [
                    {
                        "sharefolder": config.synologyConfig.shareFolder,
                        "remote_path": config.synologyConfig.remotePath,
                        "local_path": config.synologyConfig.localPath,
                        "sync_direction": 0
                    }
                ]
            }
        ]
    } : null;

    return `
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { spawn } = require('child_process');
const https = require('https');
const http = require('http');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 920, 
    height: 610, 
    frame: false, 
    transparent: true, 
    resizable: false,
    icon: path.join(__dirname, 'tubiao.ico'), 
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-close', () => app.quit());

// --- IPC LOGGING ---
function sendLog(msg) {
  console.log('[INSTALLER]', msg);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('install-log', msg);
  }
}

function sendProgress(percent) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('install-progress', percent);
  }
}

// --- ROBUST DOWNLOADER (Node Native) ---
function downloadFileNode(url, destPath) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(destPath);
    
    const requestOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Connection': 'keep-alive'
      },
      timeout: 15000 // 15s timeout
    };

    const doRequest = (targetUrl) => {
      sendLog(\`🔗 请求地址: \${new URL(targetUrl).hostname}...\`);
      
      const lib = targetUrl.startsWith('https') ? https : http;
      
      const req = lib.get(targetUrl, requestOptions, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          sendLog(\`🔀 跳转中 (\${res.statusCode})...\`);
          res.resume(); 
          doRequest(res.headers.location);
          return;
        }

        if (res.statusCode !== 200) {
          fs.unlink(destPath, () => {}); 
          reject(new Error(\`服务器返回错误: \${res.statusCode}\`));
          return;
        }

        const totalBytes = parseInt(res.headers['content-length'] || 0, 10);
        sendLog(\`⬇️ 连接成功! 文件大小: \${(totalBytes/1024/1024).toFixed(1)} MB\`);
        
        let receivedBytes = 0;
        let lastUpdateTime = 0;

        res.on('data', (chunk) => {
          receivedBytes += chunk.length;
          fileStream.write(chunk);

          const now = Date.now();
          if (now - lastUpdateTime > 100) {
            if (totalBytes > 0) {
               const pct = Math.floor((receivedBytes / totalBytes) * 100);
               sendProgress(pct);
            } else {
               sendProgress(-1);
            }
            lastUpdateTime = now;
          }
        });

        res.on('end', () => {
          fileStream.end();
        });

        fileStream.on('finish', () => {
          sendProgress(100);
          sendLog('✅ 文件写入完成');
          resolve();
        });

        fileStream.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(new Error(\`写入文件失败: \${err.message}\`));
        });
      });

      req.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(new Error(\`网络错误: \${err.message}\`));
      });

      req.on('timeout', () => {
        req.destroy();
        fs.unlink(destPath, () => {});
        reject(new Error('下载连接超时'));
      });
    };

    doRequest(url);
  });
}

// --- EXEC AS ADMIN via POWERSHELL ---
// Uses native Windows Start-Process -Verb RunAs to invoke UAC
// Much more robust than sudo-prompt for complex arguments/paths
function execAsAdmin(msiPath, configPath) {
  return new Promise((resolve, reject) => {
    
    // Construct argument list for PowerShell
    // We pass arguments as an array to ArgumentList to handle quoting correctly
    const msiArg = \`"\${msiPath}"\`;
    const configArg = configPath ? \`CONFIGPATH="\${configPath}"\` : '';
    
    let psArgs = [
        '-NoProfile', 
        '-ExecutionPolicy', 'Bypass', 
        '-Command', 
        \`Start-Process -FilePath "msiexec.exe" -ArgumentList '/i', '\${msiArg}', '/qn', '/norestart'\${configPath ? \`, '\${configArg}'\` : ''} -Verb RunAs -Wait -WindowStyle Hidden\`
    ];

    const child = spawn('powershell.exe', psArgs, {
        windowsHide: true
    });

    child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error('PowerShell exited with code ' + code));
    });
    
    child.on('error', (err) => reject(err));
  });
}

function execAsUser(command) {
  return new Promise((resolve, reject) => {
    require('child_process').exec(command, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

// --- HELPER: Wait for File to Exist (Retry Logic) ---
// Synology MSI finishes "installing" before the files are fully written to disk.
// We must poll for the EXE before running config commands.
async function waitForFile(possiblePaths, maxRetries = 30) {
    for (let i = 0; i < maxRetries; i++) {
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                return p;
            }
        }
        // Log every 5th retry to avoid spamming
        if (i > 0 && i % 5 === 0) {
            sendLog(\`⏳ 等待主程序写入硬盘 (\${i}s)...\`);
        }
        await new Promise(r => setTimeout(r, 1000)); // Wait 1 second
    }
    return null;
}

ipcMain.handle('install-start', async (event, installData) => {
  // Use unique run ID to prevent temp file conflicts
  const runId = Date.now();
  const configJsonPath = path.join(os.tmpdir(), \`syno_config_\${runId}.json\`);
  let msiPath = '';

  try {
      sendProgress(0);
      sendLog('🚀 收到安装请求，开始初始化...');
      
      const tempDir = os.tmpdir();
      
      if (${config.useOnlineInstaller}) {
         msiPath = path.join(tempDir, \`SynologyDriveSetup_\${runId}.msi\`);
         if (fs.existsSync(msiPath)) fs.unlinkSync(msiPath);

         sendLog('📡 开始下载核心组件...');
         await downloadFileNode('${config.downloadUrl}', msiPath);
      } else {
         const msiName = '${config.msiFileName}';
         const isDev = !app.isPackaged;
         const basePath = isDev 
            ? path.join(__dirname, 'extraResources') 
            : path.join(process.resourcesPath, 'extraResources');
         msiPath = path.join(basePath, msiName);
         
         if (!fs.existsSync(msiPath)) throw new Error('未找到本地安装包: ' + msiPath);
         sendLog('✅ 本地安装包校验通过');
      }

      if (${config.synologyConfig.enabled}) {
          sendLog('⚙️ 生成自动化配置文件...');
          const synologyConfig = ${JSON.stringify(synologyConfigPayload, null, 4)};
          await fs.writeFile(configJsonPath, JSON.stringify(synologyConfig, null, 4));
      }

      sendLog('🛡️ 正在申请管理员权限进行安装...');
      sendProgress(-1); 
      
      // Install MSI
      await execAsAdmin(msiPath, ${config.synologyConfig.enabled} ? configJsonPath : null);
      
      sendProgress(100);
      sendLog('✅ 核心组件安装指令已完成');

      // --- CRITICAL FIX: RETRY LOGIC ---
      const programFiles = process.env.ProgramFiles;
      const programFilesX86 = process.env['ProgramFiles(x86)'];
      
      // Define potential paths for Synology Drive Client
      const possibleUiPaths = [
          path.join(programFilesX86 || 'C:\\Program Files (x86)', 'Synology', 'SynologyDrive', 'bin', 'cloud-drive-ui.exe'),
          path.join(programFiles || 'C:\\Program Files', 'Synology', 'SynologyDrive', 'bin', 'cloud-drive-ui.exe')
      ];

      if (${config.synologyConfig.enabled}) {
          sendLog('🔄 正在搜索主程序以应用配置...');
          
          // Wait up to 30 seconds for the file to appear
          const uiPath = await waitForFile(possibleUiPaths, 30);

          if (uiPath) {
              sendLog('✅ 找到主程序: ' + uiPath);
              try {
                  sendLog('⚡ 正在注入用户配置...');
                  await execAsUser(\`"\${uiPath}" --auto-setup "\${configJsonPath}"\`);
                  sendLog('✅ 用户配置注入命令已下发');
              } catch (e) {
                  sendLog('⚠️ 自动配置失败 (非致命): ' + e.message);
              }
          } else {
              sendLog('❌ 超时: 未能找到 cloud-drive-ui.exe，跳过配置');
          }
      }

      // Cleanup files
      setTimeout(() => {
          if (fs.existsSync(configJsonPath)) fs.unlink(configJsonPath, ()=>{});
          if (${config.useOnlineInstaller} && fs.existsSync(msiPath)) fs.unlink(msiPath, ()=>{});
      }, 5000);

      sendLog('🚀 正在启动程序...');
      const possibleLauncherPaths = [
          path.join(programFilesX86 || 'C:\\Program Files (x86)', 'Synology', 'SynologyDrive', 'bin', 'launcher.exe'),
          path.join(programFiles || 'C:\\Program Files', 'Synology', 'SynologyDrive', 'bin', 'launcher.exe')
      ];

      const launcherPath = await waitForFile(possibleLauncherPaths, 10);
      
      if (launcherPath) {
          spawn(launcherPath, [], { detached: true, stdio: 'ignore' }).unref();
          sendLog('✅ 程序已启动');
      } else {
          sendLog('⚠️ 未找到 launcher.exe，请手动启动');
      }

      return { success: true };

  } catch (err) {
      console.error(err);
      sendLog('❌ 错误: ' + err.message);
      return { success: false, error: err.message };
  }
});
`;
};

// --- 3. Preload.js ---
const generatePreloadJs = () => `
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),
  startInstall: (data) => ipcRenderer.invoke('install-start', data),
  onLog: (callback) => ipcRenderer.on('install-log', (_event, value) => callback(value)),
  onProgress: (callback) => ipcRenderer.on('install-progress', (_event, value) => callback(value))
});
`;

// --- 4. .npmrc ---
const generateNpmrc = () => `
registry=https://registry.npmmirror.com/
electron_mirror=https://npmmirror.com/mirrors/electron/
electron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/
`;

// --- 5. Index.html (RESTORED HIGH QUALITY UI) ---
const generateIndexHtml = (config: InstallerConfig) => {
  // ROBUST PARSING: Trim and filter empty items to prevent blank dropdown options
  const projects = config.projectList.split(',').map(s => s.trim()).filter(Boolean);
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.appName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { 
            font-family: 'Inter', 'Microsoft YaHei', sans-serif !important; 
            user-select: none; overflow: hidden; -webkit-font-smoothing: antialiased;
        }
        .drag-region { -webkit-app-region: drag; }
        .no-drag { -webkit-app-region: no-drag; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
        
        /* ANIMATIONS */
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInBottom { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(16px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }

        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .animate-slide-in-bottom { animation: slideInBottom 0.5s ease-out forwards; }
        .animate-slide-in-right { animation: slideInRight 0.5s ease-out forwards; }
        .animate-zoom-in { animation: zoomIn 0.2s ease-out forwards; }
        .animate-shimmer { animation: shimmer 1.5s infinite; }
    </style>
</head>
<body class="bg-transparent">
    <div class="w-full h-screen bg-[#0f172a] rounded-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden relative ring-1 ring-white/5">
        
        <!-- Title Bar -->
        <div class="h-10 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 drag-region z-50 shrink-0">
            <div class="flex items-center gap-2 text-xs font-medium text-slate-400">
                <div class="w-3.5 h-3.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[3px] shadow-sm"></div>
                <span class="text-slate-300">${config.appName}</span>
            </div>
            <div class="flex gap-3 no-drag">
                <i data-lucide="minus" width="14" onclick="window.electronAPI.minimize()" class="text-slate-500 hover:text-white cursor-pointer transition-colors"></i>
                <i data-lucide="x" width="14" onclick="window.electronAPI.close()" class="text-slate-500 hover:text-red-400 cursor-pointer transition-colors"></i>
            </div>
        </div>

        <div class="flex flex-1 overflow-hidden">
            <!-- Sidebar -->
            <div class="w-64 bg-[#020617]/50 backdrop-blur-sm border-r border-slate-800 p-8 flex flex-col justify-between z-10 items-center">
                <div class="space-y-1 w-full text-center mt-2">
                  <h2 class="text-xl font-bold text-white tracking-wide">安装向导</h2>
                  <p class="text-[10px] text-blue-500 uppercase font-mono tracking-wider mt-0.5">Setup Wizard</p>
                </div>
                
                <div id="stepIndicatorContainer" class="space-y-6 w-full flex flex-col items-center"></div>

                <div class="space-y-3 border-t border-slate-800/50 pt-4 flex flex-col items-center w-full">
                    <div class="text-[10px] text-slate-500 font-medium text-center leading-tight mb-2">
                        <div class="mb-1">安装过程中遇到问题</div>
                        <div>可扫码提交</div>
                    </div>
                    <!-- Fixed QR Code -->
                    <div class="p-2 bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-inner w-24 h-24 flex items-center justify-center bg-white">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https%3A%2F%2Fu.wechat.com%2FMKS80D3l2Dv2lXL8nRgDcdw" class="w-full h-full object-contain" alt="QR Code" />
                    </div>
                    <div class="text-[10px] text-slate-500 font-medium tracking-wide opacity-80 mt-1">
                        ${config.publisher || 'IT Dept'}
                    </div>
                </div>
            </div>

            <!-- Content Body -->
            <div class="flex-1 p-10 flex flex-col relative overflow-hidden bg-gradient-to-br from-[#0f172a] to-[#1e293b]">
                 <!-- Background Blobs -->
                <div class="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
                <div class="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/3"></div>
                
                <div id="pageContainer" class="relative z-10 h-full flex flex-col"></div>
            </div>
        </div>
    </div>

    <script>
        const CONFIG = {
            appName: "${config.appName}",
            projects: ${JSON.stringify(projects)},
            departmentListRaw: "${config.departmentList}", 
            collectInfo: ${config.collectUserInfo},
            synology: ${config.synologyConfig.enabled ? JSON.stringify(config.synologyConfig) : 'null'},
            enableBackupSelection: ${config.enableBackupSelection},
            backupMode: "${config.backupMode}",
            backupStartTime: "${config.backupStartTime}",
            useOnlineInstaller: ${config.useOnlineInstaller},
            warningTitle: "${config.warningTitle}",
            warningMessage: "${config.warningMessage}",
            welcomeMessage: "${config.welcomeMessage}"
        };

        let state = { step: 1, project: "", department: "", backups: [], confirmed: false, openDropdown: null };
        let lastRenderedStep = 0; // Tracks the last full page render to prevent animation loops

        // --- HELPERS ---
        function getDepartments(proj) {
            if (!proj) return [];
            if (proj === '总经办') return ['总经办'];
            if (proj === '职能部门') return ['人力行政部', '财务管理部', '运营管理部'];
            if (proj === '卖场') return ['卖场服务部'];
            if (proj === '万晟汇') return ['万晟汇'];
            // ROBUST PARSING HERE TOO
            return CONFIG.departmentListRaw.split(',').map(s => s.trim()).filter(Boolean);
        }

        window.onclick = function(event) {
            // FIX: Only re-render if a dropdown was actually open
            if (!event.target.closest('.custom-select-trigger')) {
                if (state.openDropdown) { 
                    state.openDropdown = null;
                    renderPage();
                }
            }
        }

        function toggleDropdown(e, id) {
            e.stopPropagation();
            state.openDropdown = state.openDropdown === id ? null : id;
            renderPage();
        }

        function selectOption(id, value) {
            if (id === 'project') {
                state.project = value;
                state.department = ""; 
            } else if (id === 'department') {
                state.department = value;
            }
            state.openDropdown = null;
            renderPage();
        }
        
        function toggleBackup(item) {
            let list = [...state.backups];
            if (list.includes(item)) {
                list = list.filter(i => i !== item);
            } else {
                list.push(item);
                if (item === 'C:') list = list.filter(i => i !== 'Desktop');
                if (item === 'Desktop' && list.includes('C:')) list = list.filter(i => i !== 'C:');
            }
            state.backups = list;
            renderPage(); 
        }

        function renderCustomSelect(id, value, options, placeholder, iconName) {
            const isOpen = state.openDropdown === id;
            const optionsHtml = options.length > 0 ? options.map(opt => \`
                <div onclick="selectOption('\${id}', '\${opt}')" 
                     class="px-3 py-2.5 text-xs rounded-md cursor-pointer transition-all mb-1 flex items-center justify-between group/item \${value === opt ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-300 hover:bg-blue-900/20 hover:text-blue-200'}">
                   <span>\${opt}</span>
                   \${value === opt ? '<i data-lucide="check" width="12"></i>' : ''}
                </div>\`).join('') : '<div class="px-3 py-2 text-xs text-slate-500 text-center">无选项</div>';

            return \`
            <div class="relative z-20 group">
                <div onclick="toggleDropdown(event, '\${id}')" 
                     class="custom-select-trigger relative bg-[#0a101e]/80 flex items-center cursor-pointer transition-all duration-300 rounded-lg py-2.5 px-3 ring-1 \${isOpen || value ? 'ring-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'ring-slate-800 hover:ring-slate-600'}">
                     <i data-lucide="\${iconName}" width="14" class="shrink-0 transition-colors \${isOpen || value ? 'text-blue-400' : 'text-slate-600'}"></i>
                     <div class="w-full text-xs pl-3 truncate select-none \${value ? 'text-white' : 'text-slate-500'}">\${value || placeholder}</div>
                     <i data-lucide="chevron-down" width="14" class="absolute right-3 transition-transform duration-300 \${isOpen ? 'text-blue-400 rotate-180' : 'text-slate-600'}"></i>
                </div>
                \${isOpen ? \`<div class="absolute top-full left-0 w-full mt-2 bg-[#0f172a] rounded-lg shadow-[0_0_30px_rgba(37,99,235,0.3)] z-40 overflow-hidden animate-zoom-in ring-1 ring-slate-800"><div class="max-h-48 overflow-y-auto custom-scrollbar p-1.5">\${optionsHtml}</div></div>\` : ''}
            </div>\`;
        }

        function renderSteps() {
            const steps = [
                {id: 1, label: "欢迎使用"},
                ...(CONFIG.collectInfo ? [{id: 2, label: "配置信息"}] : []),
                {id: 3, label: "准备安装"},
                {id: 4, label: CONFIG.useOnlineInstaller ? "下载安装" : "正在安装"}
            ];
            let html = '';
            steps.forEach((s) => {
                let isActive = (state.step === s.id);
                html += \`
                <div class="flex items-center gap-3 text-xs transition-all duration-300 \${isActive ? 'text-white' : 'text-slate-500'}">
                    <div class="\${isActive ? 'bg-blue-600 border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-slate-800/50 border-slate-700'} w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold border transition-all duration-300">\${s.id}</div>
                    <span class="\${isActive ? 'font-medium tracking-wide' : ''}">\${s.label}</span>
                </div>\`;
            });
            document.getElementById('stepIndicatorContainer').innerHTML = html;
        }

        function renderPage() {
            const container = document.getElementById('pageContainer');
            let content = '';
            const isValidInput = (!CONFIG.collectInfo || (state.project && state.department)) && (!CONFIG.enableBackupSelection || state.backups.length > 0);
            
            // Animation logic: Only animate if the step index has changed.
            const shouldAnim = state.step !== lastRenderedStep;
            const animBottom = shouldAnim ? "animate-slide-in-bottom" : "";
            const animRight = shouldAnim ? "animate-slide-in-right" : "";

            if (state.step === 1) {
                content = \`
                <div class="flex flex-col h-full \${animBottom} relative z-10">
                    <div class="mb-8 w-16 h-16 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-900/20"><i data-lucide="shield-check" width="36" height="36" stroke-width="1.5"></i></div>
                    <h1 class="text-3xl font-bold text-white mb-6 tracking-tight">欢迎安装 <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">\${CONFIG.appName}</span></h1>
                    <div class="text-sm text-slate-400 leading-relaxed space-y-4 max-w-md">
                        <p>\${CONFIG.welcomeMessage}</p>
                        <div class="flex items-start gap-3 text-emerald-300 bg-emerald-950/40 p-3 rounded-lg border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                             <i data-lucide="cloud-upload" class="shrink-0 mt-0.5 text-emerald-400" width="18"></i>
                             <span class="text-xs font-medium leading-relaxed">备份数据会自动加密上传至公司服务器中，其他人无法看到你的数据。</span>
                        </div>
                        <p>点击“下一步”继续。</p>
                    </div>
                    \${CONFIG.warningMessage ? \`<div class="mt-auto p-4 bg-orange-950/20 border border-orange-500/20 rounded-lg text-xs text-orange-200/80 backdrop-blur-sm relative overflow-hidden"><div class="absolute left-0 top-0 bottom-0 w-1 bg-orange-500/50"></div><strong class="block mb-1 text-orange-400 flex items-center gap-2">注意: \${CONFIG.warningTitle}</strong>\${CONFIG.warningMessage}</div>\` : '<div class="mt-auto"></div>'}
                    <div class="flex justify-between pt-6 border-t border-slate-800/50 mt-auto shrink-0 pb-2">
                        <button onclick="prevStep()" class="px-6 py-2 rounded-lg bg-slate-800 text-slate-400 text-xs font-medium border border-slate-700 cursor-not-allowed opacity-50">上一步</button>
                        <button onclick="nextStep()" class="px-6 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium shadow-lg hover:bg-blue-500 transition-colors active:scale-95">下一步</button>
                    </div>
                </div>\`;
            } else if (state.step === 2 && CONFIG.collectInfo) {
                const depts = getDepartments(state.project);
                content = \`
                <div class="flex flex-col h-full \${animBottom} relative z-10">
                    <h2 class="text-xl font-bold text-white mb-6">用户信息登记</h2>
                    <div class="space-y-6 flex-1">
                        <div class="grid grid-cols-2 gap-4">
                            <div class="space-y-1.5"><label class="text-[10px] font-semibold text-blue-400 tracking-wide uppercase">所属项目</label>\${renderCustomSelect('project', state.project, CONFIG.projects, '请选择...', 'building')}</div>
                            <div class="space-y-1.5"><label class="text-[10px] font-semibold text-blue-400 tracking-wide uppercase">所属部门</label>\${renderCustomSelect('department', state.department, depts, state.project ? '请选择...' : '请先选择项目', 'user')}</div>
                        </div>
                        \${CONFIG.enableBackupSelection ? \`<div class="space-y-2 pt-2"><div class="flex items-center justify-between"><label class="text-[10px] font-semibold text-amber-500 tracking-wide uppercase flex items-center gap-1"><i data-lucide="alert-triangle" width="12"></i> 需要备份的目录 <span class="text-slate-500 font-normal normal-case">(关键步骤)</span></label>\${state.backups.length === 0 ? '<span class="text-[9px] text-amber-500">请选择至少一项</span>' : ''}</div><div class="grid grid-cols-3 gap-3">\${['Desktop', 'C:', 'D:', 'E:', 'F:', 'G:'].map(item => { const isSelected = state.backups.includes(item); const icon = item === 'Desktop' ? 'monitor' : 'folder'; const label = item === 'Desktop' ? '桌面' : item + ' 盘'; return \`<div onclick="toggleBackup('\${item}')" class="cursor-pointer text-xs rounded-lg border flex items-center justify-center py-3 gap-2 transition-all duration-300 select-none active:scale-95 \${isSelected ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.25)] text-emerald-400 font-bold' : 'bg-[#0a101e] border-slate-800 text-slate-500 hover:border-amber-700/50 hover:text-slate-300'}"><i data-lucide="\${icon}" width="14"></i> \${label}</div>\`; }).join('')}</div></div>\` : ''}
                        <div class="mt-auto p-4 rounded-lg border flex gap-3 items-center transition-all duration-300 \${isValidInput ? 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'bg-slate-900/30 border-slate-800'}">
                            <div class="p-2 rounded-full \${isValidInput ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-600'}"><i data-lucide="\${isValidInput ? 'check-circle-2' : 'monitor-smartphone'}" width="20"></i></div>
                            <div class="flex-1"><div class="text-[10px] text-slate-500 uppercase tracking-wider mb-1">预计设备连接标识</div><div class="font-mono text-xs \${isValidInput ? 'text-emerald-300' : 'text-slate-500'}">\${isValidInput ? \`\${state.project}-\${state.department}-DESKTOP-CN\` : '等待配置...'}</div></div>
                        </div>
                    </div>
                    <div class="flex justify-between pt-6 border-t border-slate-800/50 mt-auto shrink-0 pb-2">
                        <button onclick="prevStep()" class="px-6 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium border border-slate-700 active:scale-95">上一步</button>
                        <button onclick="nextStep()" \${!isValidInput ? 'disabled' : ''} class="px-6 py-2 rounded-lg text-white text-xs font-medium shadow-lg transition-all active:scale-95 \${isValidInput ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30' : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'}">下一步</button>
                    </div>
                </div>\`;
            } else if (state.step === 3) {
                content = \`
                <div class="flex flex-col h-full \${animRight} relative z-10">
                    <h2 class="text-xl font-bold text-white mb-3">准备安装</h2>
                    <div class="bg-slate-900/50 border border-slate-800 rounded-xl py-3 px-4 mb-4 shadow-inner">
                        <div class="flex items-center gap-4">
                            <div class="shrink-0 flex flex-col justify-start h-full"><div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1 h-4"><i data-lucide="monitor-smartphone" width="10"></i> 连接标识</div><div class="font-mono text-emerald-400 font-bold text-xs h-4 flex items-center">\${state.project}-\${state.department}</div></div>
                            <div class="w-px h-10 bg-slate-800 self-center"></div>
                            <div class="flex-1 flex flex-col justify-start h-full"><div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1 h-4"><i data-lucide="hard-drive" width="10"></i> 备份目录</div><div class="flex flex-wrap gap-1.5">\${state.backups.length > 0 ? state.backups.map(d => \`<div class="px-2 py-0 bg-slate-800 rounded text-slate-300 font-mono text-[9px] border border-slate-700 flex items-center gap-1 h-4"><i data-lucide="\${d==='Desktop'?'monitor':'folder'}" width="10"></i> \${d==='Desktop'?'桌面':d}</div>\`).join('') : '<span class="text-slate-500 text-[10px]">未选择</span>'}</div></div>
                            <div class="w-px h-10 bg-slate-800 self-center"></div>
                            <div class="shrink-0 flex flex-col justify-start h-full"><div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1 h-4"><i data-lucide="clock" width="10"></i> 备份模式</div><div class="flex justify-start h-4 items-center"><div class="text-blue-300 font-medium text-xs px-2 py-0 bg-blue-900/20 rounded inline-block leading-4">\${CONFIG.backupMode==='continuous' ? '连续备份' : '计划: '+CONFIG.backupStartTime}</div></div></div>
                        </div>
                    </div>
                    <div class="flex-1 flex flex-col">
                        <div class="mb-2 p-2 bg-amber-950/20 border border-amber-500/20 rounded-lg flex gap-2 items-center"><i data-lucide="alert-triangle" width="14" class="text-amber-500 shrink-0"></i><span class="text-xs text-amber-200/80 leading-relaxed font-medium">为避免无效数据占用服务器空间，以下非业务类文件不备份，其余文件均自动备份。</span></div>
                        <div class="space-y-2">
                            <div class="bg-slate-900/30 border border-slate-800 rounded-lg p-2 flex items-center justify-between"><div class="flex items-center gap-2.5"><div class="p-1 bg-red-900/20 rounded text-red-400"><i data-lucide="trash-2" width="14"></i></div><span class="text-xs font-medium text-slate-300">系统文件</span></div><span class="text-[10px] text-slate-500 font-mono">操作系统组件、应用程序、临时缓存及日志文件</span></div>
                            <div class="bg-slate-900/30 border border-slate-800 rounded-lg p-2 flex items-center justify-between"><div class="flex items-center gap-2.5"><div class="p-1 bg-orange-900/20 rounded text-orange-400"><i data-lucide="message-square-off" width="14"></i></div><span class="text-xs font-medium text-slate-300">聊天缓存</span></div><span class="text-[10px] text-slate-500 font-mono">QQ、微信、企业微信、钉钉</span></div>
                            <div class="bg-slate-900/30 border border-slate-800 rounded-lg p-2 flex items-center justify-between"><div class="flex items-center gap-2.5"><div class="p-1 bg-yellow-900/20 rounded text-yellow-400"><i data-lucide="file-warning" width="14"></i></div><span class="text-xs font-medium text-slate-300">超大文件</span></div><span class="text-[10px] text-slate-500 font-mono">大于 2GB 的所有文件</span></div>
                        </div>
                        <div onclick="state.confirmed=!state.confirmed; renderPage()" class="mt-4 p-4 rounded-lg border flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 select-none active:scale-95 \${state.confirmed ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-[#0a101e] border-slate-700 hover:border-amber-500/50 animate-pulse'}">
                             <div class="w-4 h-4 rounded border flex items-center justify-center transition-all \${state.confirmed ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-transparent border-slate-500'}">\${state.confirmed ? '<i data-lucide="check" width="12" stroke-width="3"></i>' : ''}</div>
                             <span class="text-xs font-bold transition-colors \${state.confirmed ? 'text-emerald-400' : 'text-slate-400'}">我已确认上述配置信息准确无误</span>
                        </div>
                    </div>
                    <div class="flex justify-between pt-6 border-t border-slate-800/50 mt-auto shrink-0 pb-2">
                        <button onclick="prevStep()" class="px-6 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium border border-slate-700 active:scale-95">上一步</button>
                        <button onclick="nextStep()" \${!state.confirmed ? 'disabled' : ''} class="px-6 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all border active:scale-95 \${state.confirmed ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 border-transparent' : 'bg-slate-800 text-slate-500 cursor-not-allowed border-slate-700'}">开始安装</button>
                    </div>
                </div>\`;
            } else {
                // PAGE 4: Installing
                content = \`
                <div class="flex flex-col h-full justify-center \${animBottom} relative z-10">
                    <div class="text-center mb-8">
                        <h2 class="text-2xl font-bold text-white mb-2">正在安装...</h2>
                        <div class="w-full bg-slate-800 h-4 rounded-full overflow-hidden mt-4 border border-slate-700/50 shadow-inner">
                            <div id="progressBar" class="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-300 w-0 relative overflow-hidden shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                            </div>
                        </div>
                        <p id="progressText" class="text-xl font-bold text-blue-500 mt-4">{simulatedProgress}%</p>
                    </div>
                    <div id="logArea" class="h-48 rounded-2xl bg-slate-950/50 border border-slate-800/50 font-mono text-xs p-4 overflow-y-auto text-slate-500 custom-scrollbar break-all whitespace-pre-wrap">
                        <div className="mb-0.5 flex items-start gap-2 leading-tight"><span className="opacity-80">⚡ 正在呼叫安装引擎...</span></div>
                    </div>
                     <div id="finishArea" class="hidden text-center mt-4">
                        <button onclick="window.electronAPI.close()" class="px-8 py-2 bg-emerald-600 text-white rounded font-bold shadow-lg shadow-emerald-900/20">安装完成 (关闭)</button>
                    </div>
                </div>\`;
                setTimeout(startInstallProcess, 500);
            }
            container.innerHTML = content;
            lucide.createIcons();
            renderSteps();
            
            // UPDATE TRACKER
            lastRenderedStep = state.step;
        }

        function nextStep() { state.step++; state.openDropdown = null; renderPage(); }
        function prevStep() { state.step--; state.openDropdown = null; renderPage(); }

        function addLog(msg) {
            const el = document.getElementById('logArea');
            if(el) { 
                // CLEANER LOGS
                el.innerHTML += \`<div class="mb-0.5 animate-slide-in-right flex items-start gap-2 leading-tight"><span class="opacity-80">\${msg}</span></div>\`; 
                el.scrollTop = el.scrollHeight; 
            }
        }

        function updateProgress(percent) {
            const bar = document.getElementById('progressBar');
            const txt = document.getElementById('progressText');
            if (bar && txt) {
                if (percent === -1) { bar.classList.add('animate-shimmer'); bar.style.width = '100%'; txt.innerText = '正在执行后台任务...'; } 
                else { bar.classList.remove('animate-shimmer'); bar.style.width = percent + '%'; txt.innerText = percent + '%'; }
            }
        }

        async function startInstallProcess() {
            if(window.installRunning) return;
            window.installRunning = true;
            window.electronAPI.onLog(addLog);
            window.electronAPI.onProgress(updateProgress);
            addLog('⚡ 正在呼叫安装引擎...');
            try {
                const result = await window.electronAPI.startInstall({ project: state.project, department: state.department });
                if (result.success) { document.getElementById('finishArea').classList.remove('hidden'); } 
                else { addLog('❌ 失败: ' + result.error); }
            } catch(e) { addLog('❌ 致命错误: ' + e); }
        }

        renderPage();
    </script>
</body>
</html>`;
};

export const generateInstallerScript = async (config: InstallerConfig): Promise<string> => {
  const packageJson = generatePackageJson(config);
  const mainJs = generateMainJs(config);
  const preloadJs = generatePreloadJs();
  const npmrc = generateNpmrc();
  const indexHtml = generateIndexHtml(config);

  return `
================================================================================
文件名: package.json
================================================================================
${packageJson}

================================================================================
文件名: main.js
================================================================================
${mainJs}

================================================================================
文件名: preload.js
================================================================================
${preloadJs}

================================================================================
文件名: index.html
================================================================================
${indexHtml}

================================================================================
文件名: .npmrc
================================================================================
${npmrc}
`;
};