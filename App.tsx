import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Code, Download, Loader2, Box, Wand2, LayoutTemplate, FileCog, Terminal, Package, Layers, Play } from 'lucide-react';
import { DEFAULT_CONFIG, InstallerConfig, WizardStep } from './types';
import { ConfigForm } from './components/ConfigForm';
import { LivePreview } from './components/LivePreview';
import { generateInstallerScript } from './services/geminiService';

const steps = [
  { id: WizardStep.DETAILS, label: "基础信息" },
  { id: WizardStep.FILES, label: "文件配置" },
  { id: WizardStep.MESSAGES, label: "界面逻辑" },
  { id: WizardStep.REVIEW, label: "生成工程" },
];

export default function App() {
  const [config, setConfig] = useState<InstallerConfig>(DEFAULT_CONFIG);
  const [currentStep, setCurrentStep] = useState<WizardStep>(WizardStep.DETAILS);
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const handleNext = () => {
    if (currentStep < WizardStep.REVIEW) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > WizardStep.DETAILS) {
      setCurrentStep(prev => prev - 1);
    } else if (showCode) {
        setShowCode(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setShowCode(true);
    try {
      const code = await generateInstallerScript(config);
      setGeneratedCode(code);
    } catch (e) {
      setGeneratedCode(`# 错误: ${(e as Error).message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadSourceCode = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedCode], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = "source_code.txt"; // PLAIN TEXT DOWNLOAD
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadBuildInstructions = () => {
    const msiStep = config.useOnlineInstaller 
        ? `
### 3.3 资源文件 (在线模式)
默认下载地址已更新为 **群晖 Global CDN 官方直链**。
地址: \`${config.downloadUrl}\`
`
        : `
### 3.3 资源文件 (离线模式 - 关键!)
1. 在 \`MyInstaller\` 文件夹内，新建一个文件夹叫 \`extraResources\`。
2. 将您的 MSI 安装包文件 **"${config.msiFileName}"** 复制进去。
3. ⚠️ **注意**：文件名必须完全一致！
`;

    const instructions = `# 🚀 Electron 助手构建指南 (绿色版)

## 📁 如何使用源代码
1. 点击界面上的 **"下载源代码 (.txt)"**。
2. 打开下载的 \`source_code.txt\` 文件。
3. 按照文件中的分隔线指示，在 \`MyInstaller\` 文件夹中分别创建以下 5 个文件，并将对应内容粘贴进去：
   - \`package.json\` (⚠️ 复制时请确保包含最外层的 { 和 })
   - \`main.js\`
   - \`preload.js\`
   - \`index.html\`
   - \`.npmrc\`

---

## 🆘 常见报错解决方案

### 🔴 错误: "rcedit: Unable to commit changes"
这是最常见的错误，通常是因为杀毒软件锁定了生成的文件。
1. **暂时关闭 360/火绒/Windows Defender**。
2. 删除 \`dist\` 文件夹中的 \`win-unpacked\` 文件夹。
3. 重新运行 \`npm run dist\`。

### 🔴 错误: "npm install" 卡住不动
请在终端依次执行以下命令：
\`\`\`powershell
npm config set registry https://registry.npmmirror.com/
npm cache clean --force
npm install --verbose
\`\`\`

---

## 🔧 高级：使用本地 Electron (v39.2.4)
如果您本地有 Electron 缓存，请运行：

\`\`\`powershell
$env:ELECTRON_OVERRIDE_DIST_PATH = "D:\\Program Files\\electron-v39.2.4"
$env:ELECTRON_SKIP_BINARY_DOWNLOAD = "1"
npm run dist
\`\`\`

---

## 1. 准备工作
请确保电脑上安装了 **Node.js**。

---

## 2. 创建项目文件夹
1. 在电脑桌面上新建一个文件夹，命名为 \`MyInstaller\`。

---

## 3. 生成代码
**手动创建文件**：
参考本文档开头的说明，手动创建 5 个代码文件。

${msiStep}

---

## 4. 开始构建
1. Shift + 右键 -> PowerShell (管理员)。
2. \`npm install\` (建议运行一次)。
3. \`npm run dist\`。

---

## 5. 获取成果
在 \`dist\` 文件夹中找到生成的 **SynologyDriveAssistant.exe**。
(这是一个绿色版程序，双击即可直接运行，无需安装)
`;
    const element = document.createElement("a");
    const file = new Blob([instructions], {type: 'text/markdown;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = "BUILD_INSTRUCTIONS.md";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 bg-[conic-gradient(at_top_left,_var(--tw-gradient-stops))] from-slate-950 via-[#0f172a] to-[#172554] flex items-center justify-center text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* Main Workspace Container */}
      <div className="w-[96%] h-[92vh] max-w-[1920px] bg-slate-950/60 backdrop-blur-2xl rounded-[24px] shadow-2xl overflow-hidden border border-white/10 flex relative ring-1 ring-white/5">
        
        {/* LEFT PANEL */}
        <div className="w-[440px] flex-shrink-0 flex flex-col border-r border-white/5 bg-slate-900/60 relative z-20">
          
          <header className="h-20 px-8 flex items-center gap-4 border-b border-white/5 shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Box className="text-white" size={20} strokeWidth={2.5} />
            </div>
            <div>
               <h1 className="text-lg font-bold text-white tracking-tight">InstallerGenie</h1>
               <div className="flex items-center gap-2 mt-0.5">
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[9px] text-blue-400 font-bold uppercase tracking-wide">
                    Electron Edition
                  </span>
               </div>
            </div>
          </header>

          <div className="px-8 pt-6 pb-2 shrink-0">
             <div className="flex justify-between items-center relative">
                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-800 -z-10 rounded-full"></div>
                {steps.map((step, idx) => {
                   const isActive = currentStep === step.id;
                   const isCompleted = currentStep > step.id;
                   return (
                     <div key={step.id} className="flex flex-col items-center gap-2 relative group cursor-pointer" onClick={() => currentStep > step.id && setCurrentStep(step.id)}>
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300
                          ${isActive ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] scale-110' : 
                            isCompleted ? 'bg-slate-800 border-blue-500/50 text-blue-400' : 'bg-slate-900 border-slate-700 text-slate-600'}
                        `}>
                          {isCompleted ? <span className="block w-2 h-2 rounded-full bg-blue-400"></span> : idx + 1}
                        </div>
                        <span className={`text-[10px] font-medium absolute -bottom-5 whitespace-nowrap transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500'}
                        `}>
                          {step.label}
                        </span>
                     </div>
                   );
                })}
             </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 mt-4">
            <ConfigForm 
                config={config} 
                setConfig={setConfig} 
                currentStep={currentStep} 
                setStep={setCurrentStep}
              />
          </div>

          <div className="p-6 border-t border-white/5 bg-slate-900/40 backdrop-blur-md shrink-0 flex gap-3">
             <button 
                onClick={handleBack}
                disabled={currentStep === 0 && !showCode}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border border-slate-700 hover:bg-slate-800 hover:text-white transition-all ${currentStep === 0 && !showCode ? 'opacity-50 cursor-not-allowed' : 'text-slate-400'}`}
              >
                上一步
              </button>

              {currentStep < WizardStep.REVIEW ? (
                <button 
                  onClick={handleNext}
                  className="flex-[2] py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  下一步 <ChevronRight size={16} />
                </button>
              ) : (
                <button 
                  onClick={handleGenerate}
                  className="flex-[2] py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                   <Layers size={16} /> 生成 Electron 工程
                </button>
              )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 relative bg-[#050914] overflow-hidden flex flex-col">
           <div className="absolute inset-0 opacity-[0.04]" 
                style={{ 
                  backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', 
                  backgroundSize: '40px 40px',
                  maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)'
                }}>
           </div>
           
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>

           <div className="relative z-10 flex-1 flex flex-col h-full">
              
              <div className="h-14 flex items-center justify-between px-8 border-b border-white/5 bg-slate-950/20 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                  <LayoutTemplate size={14} className="text-indigo-500"/>
                  <span>所见即所得</span>
                  <span className="text-slate-600 mx-2">/</span>
                  <span className={showCode ? "text-slate-500" : "text-white"}>UI 交互模拟</span>
                </div>

                <div className="flex bg-slate-900/80 rounded-lg p-1 border border-slate-800">
                   <button 
                     onClick={() => setShowCode(false)}
                     className={`px-3 py-1 rounded text-[10px] font-medium transition-all ${!showCode ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     Web UI 预览
                   </button>
                   <button 
                     onClick={() => generatedCode && setShowCode(true)}
                     disabled={!generatedCode}
                     className={`px-3 py-1 rounded text-[10px] font-medium transition-all flex items-center gap-1 ${showCode ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'} ${!generatedCode && 'opacity-50 cursor-not-allowed'}`}
                   >
                     源代码 {generatedCode && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                   </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden relative">
                 {showCode ? (
                    <div className="absolute inset-0 flex flex-col animate-in fade-in zoom-in-95 duration-300">
                       <div className="flex-1 overflow-auto p-8 custom-scrollbar bg-[#0d1117]">
                          {isGenerating ? (
                             <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-6">
                                <Loader2 className="animate-spin text-indigo-500" size={40} />
                                <p className="text-sm font-mono">正在生成工程代码...</p>
                             </div>
                          ) : (
                             <pre className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-all">{generatedCode}</pre>
                          )}
                       </div>
                       <div className="p-4 border-t border-white/5 bg-slate-950 flex justify-end gap-3">
                          <button onClick={downloadBuildInstructions} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-2 transition-all">
                             <Terminal size={14} /> 查看构建说明
                          </button>
                          <button onClick={downloadSourceCode} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20">
                             <Play size={14} /> 下载源代码 (.txt)
                          </button>
                       </div>
                    </div>
                 ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8">
                       <LivePreview config={config} />
                    </div>
                 )}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}