import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Code, Download, Loader2, Box, Wand2, LayoutTemplate, FileCog } from 'lucide-react';
import { DEFAULT_CONFIG, InstallerConfig, WizardStep } from './types';
import { ConfigForm } from './components/ConfigForm';
import { LivePreview } from './components/LivePreview';
import { generateInstallerScript } from './services/geminiService';

const steps = [
  { id: WizardStep.DETAILS, label: "基础信息" },
  { id: WizardStep.FILES, label: "文件配置" },
  { id: WizardStep.MESSAGES, label: "界面逻辑" },
  { id: WizardStep.REVIEW, label: "生成构建" },
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
      setGeneratedCode(`// 错误: ${(e as Error).message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadScript = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedCode], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "setup_script.iss";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadBatchScript = () => {
    // 预设用户提供的路径
    const compilerPath = "D:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe";
    
    const batchContent = `@echo off
chcp 65001 >nul
title InstallerGenie Auto-Builder
cls

echo ========================================================
echo       InstallerGenie 自动构建工具
echo ========================================================
echo.

set "ISCC_PATH=${compilerPath}"
set "SCRIPT_NAME=setup_script.iss"

:: 1. Check Compiler
if not exist "%ISCC_PATH%" (
    echo [错误] 找不到 Inno Setup 编译器。
    echo 检测路径: "%ISCC_PATH%"
    echo.
    echo 请手动修改本 BAT 文件中的 ISCC_PATH 为您电脑上的实际路径。
    pause
    exit /b
)

:: 2. Check Script
if not exist "%SCRIPT_NAME%" (
    echo [错误] 找不到 "%SCRIPT_NAME%"。
    echo 请先下载 .iss 脚本，并将其与本工具放在同一文件夹下。
    pause
    exit /b
)

:: 3. Run Compilation
echo [1/2] 正在启动编译器...
echo --------------------------------------------------------
"%ISCC_PATH%" "%SCRIPT_NAME%"
echo --------------------------------------------------------

if %errorlevel% neq 0 (
    echo.
    echo [失败] 编译出现错误，请检查上方红字提示。
    color 0c
) else (
    echo.
    echo [成功] 安装包已生成！请查看 Output 文件夹。
    color 0a
)

pause
`;
    const element = document.createElement("a");
    const file = new Blob([batchContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "build.bat";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 bg-[conic-gradient(at_top_left,_var(--tw-gradient-stops))] from-slate-950 via-[#0f172a] to-[#172554] flex items-center justify-center text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* Main Workspace Container - Maximize Screen Real Estate */}
      <div className="w-[96%] h-[92vh] max-w-[1920px] bg-slate-950/60 backdrop-blur-2xl rounded-[24px] shadow-2xl overflow-hidden border border-white/10 flex relative ring-1 ring-white/5">
        
        {/* LEFT PANEL: Sidebar / Configuration (Fixed Width) */}
        <div className="w-[440px] flex-shrink-0 flex flex-col border-r border-white/5 bg-slate-900/60 relative z-20">
          
          {/* Header */}
          <header className="h-20 px-8 flex items-center gap-4 border-b border-white/5 shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Box className="text-white" size={20} strokeWidth={2.5} />
            </div>
            <div>
               <h1 className="text-lg font-bold text-white tracking-tight">InstallerGenie</h1>
               <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">专业安装包构建工具</p>
            </div>
          </header>

          {/* Step Progress Bar (Compact) */}
          <div className="px-8 pt-6 pb-2 shrink-0">
             <div className="flex justify-between items-center relative">
                {/* Line Background */}
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
                        <span className={`text-[10px] font-medium absolute -bottom-5 whitespace-nowrap transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500'}`}>
                          {step.label}
                        </span>
                     </div>
                   );
                })}
             </div>
          </div>

          {/* Form Area (Scrollable) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 mt-4">
            <ConfigForm 
                config={config} 
                setConfig={setConfig} 
                currentStep={currentStep} 
                setStep={setCurrentStep}
              />
          </div>

          {/* Footer / Navigation Actions */}
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
                  className="flex-[2] py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                   <Wand2 size={16} /> 生成脚本
                </button>
              )}
          </div>
        </div>

        {/* RIGHT PANEL: Preview / Code (Flexible Width) */}
        <div className="flex-1 relative bg-[#050914] overflow-hidden flex flex-col">
           
           {/* Decorative Background Grid */}
           <div className="absolute inset-0 opacity-[0.04]" 
                style={{ 
                  backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', 
                  backgroundSize: '40px 40px',
                  maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)'
                }}>
           </div>
           
           {/* Ambient Glow */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>

           {/* Content Layer */}
           <div className="relative z-10 flex-1 flex flex-col h-full">
              
              {/* Preview Header */}
              <div className="h-14 flex items-center justify-between px-8 border-b border-white/5 bg-slate-950/20 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                  <LayoutTemplate size={14} className="text-blue-500"/>
                  <span>实时预览</span>
                  <span className="text-slate-600 mx-2">/</span>
                  <span className={showCode ? "text-slate-500" : "text-white"}>UI 交互模拟</span>
                </div>

                {/* View Toggle */}
                <div className="flex bg-slate-900/80 rounded-lg p-1 border border-slate-800">
                   <button 
                     onClick={() => setShowCode(false)}
                     className={`px-3 py-1 rounded text-[10px] font-medium transition-all ${!showCode ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     界面预览
                   </button>
                   <button 
                     onClick={() => generatedCode && setShowCode(true)}
                     disabled={!generatedCode}
                     className={`px-3 py-1 rounded text-[10px] font-medium transition-all flex items-center gap-1 ${showCode ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'} ${!generatedCode && 'opacity-50 cursor-not-allowed'}`}
                   >
                     代码视图 {generatedCode && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                   </button>
                </div>
              </div>

              {/* Main Viewport */}
              <div className="flex-1 overflow-hidden relative">
                 {showCode ? (
                    <div className="absolute inset-0 flex flex-col animate-in fade-in zoom-in-95 duration-300">
                       <div className="flex-1 overflow-auto p-8 custom-scrollbar bg-[#0d1117]">
                          {isGenerating ? (
                             <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-6">
                                <Loader2 className="animate-spin text-blue-500" size={40} />
                                <p className="text-sm font-mono">正在通过 AI 生成 Pascal Script...</p>
                             </div>
                          ) : (
                             <pre className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-all">{generatedCode}</pre>
                          )}
                       </div>
                       <div className="p-4 border-t border-white/5 bg-slate-950 flex justify-end gap-3">
                          <button onClick={downloadBatchScript} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-2 transition-all">
                             <FileCog size={14} /> 下载编译脚本 (.bat)
                          </button>
                          <button onClick={downloadScript} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20">
                             <Download size={14} /> 下载 .iss 脚本文件
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