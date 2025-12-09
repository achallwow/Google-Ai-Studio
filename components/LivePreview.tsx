
import React, { useState, useEffect } from 'react';
import { InstallerConfig } from '../types';
import { User, Building, HardDrive, ShieldCheck, CloudDownload, Minus, X as CloseIcon, ChevronDown, Folder, Monitor, Filter, MonitorSmartphone, AlertTriangle, FileSpreadsheet, Ruler, Film, FileText, Info, CheckCircle2, ListChecks, Check, Clock, CloudUpload, Trash2, FileWarning, MessageSquareOff, ScanLine } from 'lucide-react';

interface LivePreviewProps {
  config: InstallerConfig;
}

// Custom Select Component for Glowing, Borderless Look
const SimpleCustomSelect = ({ value, onChange, options, placeholder, icon: Icon }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative z-20 group">
      {/* Trigger - No Border, just Glow and Ring */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative bg-[#0a101e]/80 flex items-center cursor-pointer transition-all duration-300 rounded-lg py-2.5 px-3
        ${isOpen || value ? 'ring-1 ring-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'ring-1 ring-slate-800 hover:ring-slate-600'}`}
      >
         <Icon size={14} className={`shrink-0 transition-colors ${isOpen || value ? 'text-blue-400' : 'text-slate-600'}`}/>
         <div className={`w-full text-xs pl-3 truncate select-none ${value ? 'text-white' : 'text-slate-500'}`}>
            {value || placeholder}
         </div>
         <ChevronDown size={14} className={`absolute right-3 transition-transform duration-300 ${isOpen ? 'text-blue-400 rotate-180' : 'text-slate-600'}`} />
      </div>

      {/* Backdrop to close */}
      {isOpen && (
        <div className="fixed inset-0 z-30 cursor-default" onClick={() => setIsOpen(false)}></div>
      )}

      {/* Dropdown List - Floating, Glowing, Borderless Feel */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 bg-[#0f172a] rounded-lg shadow-[0_0_30px_rgba(37,99,235,0.3)] z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-slate-800">
           <div className="max-h-48 overflow-y-auto custom-scrollbar p-1.5">
              {options && options.length > 0 ? options.map((opt: string) => (
                 <div 
                   key={opt}
                   onClick={() => { onChange(opt.trim()); setIsOpen(false); }}
                   className={`px-3 py-2.5 text-xs rounded-md cursor-pointer transition-all mb-1 flex items-center justify-between group/item ${value === opt.trim() ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-300 hover:bg-blue-900/20 hover:text-blue-200'}`}
                 >
                   <span>{opt.trim()}</span>
                   {value === opt.trim() && <Check size={12} />}
                 </div>
              )) : (
                <div className="px-3 py-2 text-xs text-slate-500 text-center">无选项</div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export const LivePreview: React.FC<LivePreviewProps> = ({ config }) => {
  // Updated state to support 4 steps: welcome -> input -> summary -> installing
  const [previewPage, setPreviewPage] = useState<'welcome' | 'input' | 'summary' | 'installing'>('welcome');
  
  // State for interactive preview inputs
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  // State for backup checklist
  const [backupSelections, setBackupSelections] = useState<string[]>([]);
  // Progress Simulation State
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  
  // New: Configuration Confirmation State
  const [isConfigConfirmed, setIsConfigConfirmed] = useState(false);

  // Cascading Logic: Get Department Options based on selected Project
  const getDepartmentOptions = (project: string) => {
    if (!project) return [];
    
    // Logic specific to Property Management Company structure
    if (project === '总经办') {
        return ['总经办'];
    }
    if (project === '职能部门') {
        return ['人力行政部', '财务管理部', '运营管理部'];
    }
    if (project === '卖场') {
        return ['卖场服务部'];
    }
    if (project === '万晟汇') {
        return ['万晟汇'];
    }
    
    // Default fallback: Use the configured list from the text area
    return config.departmentList ? config.departmentList.split(',').map(s => s.trim()) : [];
  };

  const toggleBackup = (item: string) => {
    setBackupSelections(prev => {
      let newSelections = [...prev];
      const isSelecting = !newSelections.includes(item);

      if (isSelecting) {
        newSelections.push(item);
        // Smart Logic: If C: is selected, remove Desktop
        if (item === 'C:') {
            newSelections = newSelections.filter(i => i !== 'Desktop');
        }
        // Smart Logic: If Desktop is selected but C: was already there
        if (item === 'Desktop' && newSelections.includes('C:')) {
            newSelections = newSelections.filter(i => i !== 'C:');
        }
      } else {
        newSelections = newSelections.filter(i => i !== item);
      }
      return newSelections;
    });
  };

  // Reset selections when config changes
  useEffect(() => {
    setSelectedProject("");
    setSelectedDepartment("");
    setBackupSelections([]); 
  }, [config.collectUserInfo]);

  // Reset department when project changes (Cascading reset)
  useEffect(() => {
    setSelectedDepartment("");
  }, [selectedProject]);

  // Reset confirmation when entering summary page
  useEffect(() => {
    if (previewPage === 'summary') {
        setIsConfigConfirmed(false);
    }
  }, [previewPage]);

  // Progress Simulation Effect
  useEffect(() => {
    if (previewPage === 'installing') {
        setSimulatedProgress(0);
        const interval = setInterval(() => {
            setSimulatedProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                // Random increment
                return Math.min(prev + Math.random() * 5, 100);
            });
        }, 300);
        return () => clearInterval(interval);
    }
  }, [previewPage]);

  // Validity Logic
  const isBackupValid = !config.enableBackupSelection || backupSelections.length > 0;
  const isInputPageValid = (!config.collectUserInfo || (selectedProject !== "" && selectedDepartment !== "")) && isBackupValid;

  // Helper to render the step dots/indicator in the sidebar
  const StepIndicator = ({ active, label, number }: { active: boolean; label: string; number: number }) => (
    <div className={`flex items-center gap-3 text-xs transition-all duration-300 ${active ? 'text-white' : 'text-slate-500'}`}>
      <div className={`
        w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold border transition-all duration-300
        ${active 
          ? 'bg-blue-600 border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]' 
          : 'bg-slate-800/50 border-slate-700'}
      `}>
        {number}
      </div>
      <span className={active ? 'font-medium tracking-wide' : ''}>{label}</span>
    </div>
  );

  // Navigation Logic
  const handleNextClick = () => {
    if (previewPage === 'welcome') {
      if (config.collectUserInfo) {
        setPreviewPage('input');
      } else {
        setPreviewPage('summary');
      }
    } else if (previewPage === 'input') {
      if (isInputPageValid) {
        setPreviewPage('summary');
      }
    } else if (previewPage === 'summary') {
      if (isConfigConfirmed) {
        setPreviewPage('installing');
      }
    }
  };

  const handleBackClick = () => {
    if (previewPage === 'input') setPreviewPage('welcome');
    if (previewPage === 'summary') {
        if (config.collectUserInfo) setPreviewPage('input');
        else setPreviewPage('welcome');
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-[800px] animate-fade-in relative">
      
      {/* External Controls for Preview State Switching */}
      <div className="flex gap-2 mb-8 bg-slate-950/60 p-1.5 rounded-full border border-slate-800 backdrop-blur-md shadow-2xl">
        <button onClick={() => setPreviewPage('welcome')} className={`px-4 py-1.5 rounded-full text-[10px] font-medium transition-all ${previewPage === 'welcome' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>1. 欢迎</button>
        {config.collectUserInfo && (
          <button onClick={() => setPreviewPage('input')} className={`px-4 py-1.5 rounded-full text-[10px] font-medium transition-all ${previewPage === 'input' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>2. 录入</button>
        )}
        <button onClick={() => setPreviewPage('summary')} className={`px-4 py-1.5 rounded-full text-[10px] font-medium transition-all ${previewPage === 'summary' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>3. 确认</button>
        <button onClick={() => setPreviewPage('installing')} className={`px-4 py-1.5 rounded-full text-[10px] font-medium transition-all ${previewPage === 'installing' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>4. 安装</button>
      </div>

      {/* THE INSTALLER WINDOW MOCKUP */}
      <div className="w-full aspect-[16/10] bg-[#0f172a] rounded-xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col relative border border-slate-700 ring-1 ring-white/5 select-none transition-transform duration-500 hover:scale-[1.01]">
        
        {/* Window Title Bar - Color Updated to bg-slate-900 */}
        <div className="h-10 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0 z-20">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <div className="w-3.5 h-3.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[3px] shadow-sm"></div>
            <span className="text-slate-300">{config.appName}</span>
          </div>
          <div className="flex gap-3">
            {/* Removed Square Icon (Maximize) */}
            <Minus size={14} className="text-slate-500 hover:text-white cursor-pointer transition-colors" />
            <CloseIcon size={14} className="text-slate-500 hover:text-red-400 cursor-pointer transition-colors" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex relative bg-gradient-to-br from-[#0f172a] to-[#1e293b]">
          
          {/* Sidebar - Centered Layout */}
          <div className="w-56 bg-[#020617]/50 backdrop-blur-sm border-r border-slate-800 p-8 flex flex-col justify-between z-10 items-center">
            <div className="space-y-1 w-full text-center mt-2">
              <h2 className="text-xl font-bold text-white tracking-wide">安装向导</h2>
              <p className="text-[10px] text-blue-500 uppercase font-mono tracking-wider mt-0.5">Setup Wizard</p>
            </div>
            
            <div className="space-y-6 w-full flex flex-col items-center">
              <StepIndicator active={previewPage === 'welcome'} label="欢迎使用" number={1} />
              {config.collectUserInfo && (
                 <StepIndicator active={previewPage === 'input'} label="配置信息" number={2} />
              )}
              <StepIndicator active={previewPage === 'summary'} label="准备安装" number={3} />
              <StepIndicator active={previewPage === 'installing'} label={config.useOnlineInstaller ? "下载安装" : "正在安装"} number={4} />
            </div>

            <div className="space-y-3 border-t border-slate-800/50 pt-4 flex flex-col items-center w-full">
                {/* Contact Text - Center aligned, no icon */}
                <div className="text-[10px] text-slate-500 font-medium text-center leading-tight mb-2">
                    <div className="mb-1">安装过程中遇到问题</div>
                    <div>可扫码提交</div>
                </div>
                {/* QR Code Container with Dark Styling */}
                <div className="p-2 bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-inner group transition-all hover:bg-slate-800 hover:shadow-lg w-24 h-24 flex items-center justify-center">
                    <div className="w-20 h-20 bg-white p-1 rounded-md overflow-hidden opacity-90 group-hover:opacity-100 transition-opacity">
                        <img 
                          src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https%3A%2F%2Fu.wechat.com%2FMKS80D3l2Dv2lXL8nRgDcdw" 
                          alt="WeChat QR" 
                          className="w-full h-full object-contain" 
                        />
                    </div>
                </div>
                
                {config.publisher && (
                  <div className="text-[10px] text-slate-500 font-medium tracking-wide opacity-80 mt-1">
                    {config.publisher.replace(':', '·')}
                  </div>
                )}
            </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 p-10 flex flex-col relative overflow-hidden">
            
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/3"></div>

            {/* PAGE 1: WELCOME */}
            {previewPage === 'welcome' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out flex flex-col h-full relative z-10">
                <div className="mb-8 w-16 h-16 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-900/20">
                  <ShieldCheck size={36} strokeWidth={1.5} />
                </div>
                
                <h1 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  欢迎安装 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{config.appName}</span>
                </h1>
                
                <div className="text-sm text-slate-400 leading-relaxed space-y-4 max-w-md">
                  <p>{config.welcomeMessage || "本向导将引导您完成软件的安装过程。建议在继续之前关闭所有其他应用程序。"}</p>
                  
                   {/* ENCRYPTED BACKUP ASSURANCE */}
                  <div className="flex items-start gap-3 text-emerald-300 bg-emerald-950/40 p-3 rounded-lg border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                       <CloudUpload size={18} className="shrink-0 mt-0.5 text-emerald-400" />
                       <span className="text-xs font-medium leading-relaxed">
                         备份数据会自动加密上传至公司服务器中，其他人无法看到你的数据。
                       </span>
                  </div>

                  <p>点击“下一步”继续，或点击窗口关闭按钮退出安装程序。</p>
                </div>

                {config.warningMessage && (
                  <div className="mt-auto p-4 bg-orange-950/20 border border-orange-500/20 rounded-lg text-xs text-orange-200/80 backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500/50"></div>
                    <strong className="block mb-1 text-orange-400 flex items-center gap-2">
                      注意: {config.warningTitle}
                    </strong>
                    {config.warningMessage}
                  </div>
                )}
                
                {!config.warningMessage && <div className="mt-auto"></div>}

                <div className="flex justify-between pt-6 border-t border-slate-800/50 mt-auto">
                   <button className="px-6 py-2 rounded-lg bg-slate-800 text-slate-400 text-xs font-medium border border-slate-700 cursor-not-allowed opacity-50 flex items-center justify-center">上一步</button>
                   <button onClick={handleNextClick} className="px-6 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium shadow-lg hover:bg-blue-500 transition-colors flex items-center justify-center active:scale-95">下一步</button>
                </div>
              </div>
            )}

            {/* PAGE 2: INPUT */}
            {previewPage === 'input' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out flex flex-col h-full relative z-10">
                <h2 className="text-xl font-bold text-white mb-6">用户信息登记</h2>
                
                <div className="space-y-6 flex-1">
                  {/* Selectors - Using Custom Select */}
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-blue-400 tracking-wide uppercase">所属项目</label>
                        <SimpleCustomSelect 
                           value={selectedProject} 
                           onChange={setSelectedProject} 
                           options={config.projectList?.split(',')}
                           placeholder="请选择..."
                           icon={Building}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-blue-400 tracking-wide uppercase">所属部门</label>
                        {/* CASCADING LOGIC APPLIED HERE via getDepartmentOptions */}
                        <SimpleCustomSelect 
                           value={selectedDepartment} 
                           onChange={setSelectedDepartment} 
                           options={getDepartmentOptions(selectedProject)}
                           placeholder={selectedProject ? "请选择..." : "请先选择项目"}
                           icon={User}
                        />
                      </div>
                  </div>
                  
                  {/* Backup Grid (Standalone) */}
                  {config.enableBackupSelection && (
                    <div className="space-y-2 pt-2">
                       <div className="flex items-center justify-between">
                         <label className="text-[10px] font-semibold text-amber-500 tracking-wide uppercase flex items-center gap-1">
                           <AlertTriangle size={12} /> 需要备份的目录 <span className="text-slate-500 font-normal normal-case">(关键步骤)</span>
                         </label>
                         {!isBackupValid && <span className="text-[9px] text-amber-500">请选择至少一项</span>}
                       </div>
                       <div className="grid grid-cols-3 gap-3">
                          {['Desktop', 'C:', 'D:', 'E:', 'F:', 'G:'].map((item) => {
                             const isSelected = backupSelections.includes(item);
                             return (
                               <div 
                                 key={item} 
                                 onClick={() => toggleBackup(item)} 
                                 className={`cursor-pointer text-xs rounded-lg border flex items-center justify-center py-3 gap-2 transition-all duration-300 group select-none active:scale-95
                                 ${isSelected 
                                    ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.25)] text-emerald-400 font-bold' 
                                    : 'bg-[#0a101e] border-slate-800 text-slate-500 hover:border-amber-700/50 hover:text-slate-300'}`}
                               >
                                 {item === 'Desktop' ? <Monitor size={14} /> : <Folder size={14} />}
                                 {item === 'Desktop' ? '桌面' : `${item} 盘`}
                               </div>
                             )
                          })}
                       </div>
                    </div>
                  )}
                  
                  {/* Live Feedback (Bottom) */}
                  <div className={`mt-auto p-4 rounded-lg border flex gap-3 items-center transition-all duration-300 ${isInputPageValid ? 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'bg-slate-900/30 border-slate-800'}`}>
                     <div className={`p-2 rounded-full ${isInputPageValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-600'}`}>
                        {isInputPageValid ? <CheckCircle2 size={20} /> : <MonitorSmartphone size={20} />}
                     </div>
                     <div className="flex-1">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">预计设备连接标识</div>
                        <div className={`font-mono text-xs ${isInputPageValid ? 'text-emerald-300' : 'text-slate-500'}`}>
                           {isInputPageValid ? `${selectedProject}-${selectedDepartment}-DESKTOP-CN` : '等待配置...'}
                        </div>
                     </div>
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-slate-800/50 mt-auto">
                   <button onClick={handleBackClick} className="px-6 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium border border-slate-700 flex items-center justify-center active:scale-95">上一步</button>
                   <button onClick={handleNextClick} disabled={!isInputPageValid} className={`px-6 py-2 rounded-lg text-white text-xs font-medium shadow-lg transition-all flex items-center justify-center active:scale-95 ${isInputPageValid ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30' : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'}`}>下一步</button>
                </div>
              </div>
            )}

            {/* PAGE 3: SUMMARY (Optimized Single-Row Layout) */}
            {previewPage === 'summary' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 ease-out flex flex-col h-full relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-bold text-white">准备安装</h2>
                </div>

                {/* Summary Box - COMPACT SINGLE ROW LAYOUT */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl py-3 px-4 mb-4 shadow-inner">
                    <div className="flex items-center gap-4">
                        {/* 1. Connection ID */}
                        <div className="shrink-0 flex flex-col justify-start h-full">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1 h-4">
                              <MonitorSmartphone size={10}/> 连接标识
                            </div>
                            <div className="font-mono text-emerald-400 font-bold text-xs h-4 flex items-center">
                                {selectedProject}-{selectedDepartment}
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="w-px h-10 bg-slate-800 self-center"></div>

                        {/* 2. Sources (Flex grow to fill middle) */}
                        <div className="flex-1 flex flex-col justify-start h-full">
                             <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1 h-4">
                               <HardDrive size={10}/> 备份目录
                             </div>
                             <div className="flex flex-wrap gap-1.5">
                                 {backupSelections.length > 0 ? (
                                   backupSelections.map(d => (
                                     <div key={d} className="px-2 py-0 bg-slate-800 rounded text-slate-300 font-mono text-[9px] border border-slate-700 flex items-center gap-1 h-4">
                                        {d === 'Desktop' ? <Monitor size={10} /> : <Folder size={10} />}
                                        {d === 'Desktop' ? '桌面' : d}
                                     </div>
                                   ))
                                 ) : <span className="text-slate-500 text-[10px]">未选择</span>}
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="w-px h-10 bg-slate-800 self-center"></div>

                        {/* 3. Mode (Left Aligned) */}
                        <div className="shrink-0 flex flex-col justify-start h-full">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1 h-4">
                              <Clock size={10}/> 备份模式
                            </div>
                            <div className="flex justify-start h-4 items-center">
                                <div className="text-blue-300 font-medium text-xs px-2 py-0 bg-blue-900/20 rounded inline-block leading-4">
                                    {config.backupMode === 'continuous' ? '连续备份' : `计划: ${config.backupStartTime}`}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3 CATEGORIES - BLACKLIST STRATEGY DESIGN */}
                <div className="flex-1 flex flex-col">
                    <div className="mb-2 p-2 bg-amber-950/20 border border-amber-500/20 rounded-lg flex gap-2 items-center">
                         <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                         <span className="text-xs text-amber-200/80 leading-relaxed font-medium">
                            为避免无效数据占用服务器空间，以下非业务类文件不备份，其余文件均自动备份。
                         </span>
                    </div>

                    
                    <div className="space-y-2">
                        {/* 1. System Files */}
                        <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-2 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-1 bg-red-900/20 rounded text-red-400"><Trash2 size={14} /></div>
                                <span className="text-xs font-medium text-slate-300">系统文件</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">操作系统组件、应用程序、临时缓存及日志文件</span>
                        </div>

                        {/* 2. Chat Cache */}
                        <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-2 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-1 bg-orange-900/20 rounded text-orange-400"><MessageSquareOff size={14} /></div>
                                <span className="text-xs font-medium text-slate-300">聊天缓存</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">QQ、微信、企业微信、钉钉</span>
                        </div>

                        {/* 3. Huge Files */}
                        <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-2 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-1 bg-yellow-900/20 rounded text-yellow-400"><FileWarning size={14} /></div>
                                <span className="text-xs font-medium text-slate-300">超大文件</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">大于 2GB 的所有文件</span>
                        </div>
                    </div>

                    {/* CONFIRMATION CHECKBOX */}
                    <div 
                        onClick={() => setIsConfigConfirmed(!isConfigConfirmed)}
                        className={`mt-4 p-4 rounded-lg border flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 group select-none active:scale-95 ${isConfigConfirmed ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-[#0a101e] border-slate-700 hover:border-amber-500/50 animate-pulse'}`}
                    >
                         <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isConfigConfirmed ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-transparent border-slate-500 group-hover:border-amber-500'}`}>
                             {isConfigConfirmed && <Check size={12} strokeWidth={3} />}
                         </div>
                         <span className={`text-xs font-bold transition-colors ${isConfigConfirmed ? 'text-emerald-400' : 'text-slate-400 group-hover:text-amber-500'}`}>
                             我已确认上述配置信息准确无误
                         </span>
                    </div>
                </div>

                {/* BUTTON FOOTER */}
                <div className="flex justify-between pt-6 border-t border-slate-800/50 mt-auto">
                   <button onClick={handleBackClick} className="px-6 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium border border-slate-700 flex items-center justify-center active:scale-95">上一步</button>
                   <button 
                      onClick={handleNextClick} 
                      disabled={!isConfigConfirmed}
                      className={`px-6 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all border active:scale-95 ${isConfigConfirmed ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 border-transparent' : 'bg-slate-800 text-slate-500 cursor-not-allowed border-slate-700'}`}
                   >
                      开始安装
                   </button>
                </div>
              </div>
            )}

            {/* PAGE 4: INSTALLING */}
            {previewPage === 'installing' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out flex flex-col h-full justify-center relative z-10">
                <div className="text-center mb-10">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {config.useOnlineInstaller ? "正在下载资源..." : "正在安装..."}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {config.useOnlineInstaller ? "连接至服务器获取最新版本" : "请稍候，正在配置系统环境"}
                  </p>
                </div>
                
                <div className="space-y-8 max-w-lg mx-auto w-full">
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div className="text-right w-full">
                        {/* INCREASED FONT SIZE HERE */}
                        <span className="text-3xl font-black inline-block text-blue-500">
                          {Math.floor(simulatedProgress)}%
                        </span>
                      </div>
                    </div>
                    {/* UPDATED PROGRESS BAR: Removed Shimmer, Static Gradient */}
                    <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden mt-4 border border-slate-700/50 shadow-inner">
                      <div style={{ width: `${simulatedProgress}%` }} className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-300 w-0 relative overflow-hidden shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                         {/* Removed inner shimmering div */}
                      </div>
                    </div>
                  </div>
                  
                  {/* UPDATED LOG BOX: Taller, Larger Radius, Larger Font */}
                  <div className="h-48 rounded-xl bg-slate-950/50 border border-slate-800/50 font-mono text-xs p-5 space-y-2.5 text-slate-400 shadow-inner overflow-y-auto custom-scrollbar">
                    {config.useOnlineInstaller ? (
                      <>
                         <div className="flex items-center gap-2">
                           <span className="text-indigo-500">>></span> 正在连接: archive.synology.cn...
                        </div>
                         {simulatedProgress > 20 && (
                            <div className="flex items-center gap-2 text-slate-500">
                                <span className="text-slate-700">>></span> 目标文件: Setup.msi
                            </div>
                         )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                           <span className="text-blue-500">>></span> 解压中: app_core.dll
                        </div>
                        {simulatedProgress > 20 && (
                             <div className="flex items-center gap-2 text-slate-500">
                                <span className="text-slate-700">>></span> 等待中: {config.msiFileName}
                            </div>
                        )}
                      </>
                    )}
                    
                    {simulatedProgress > 40 && config.forceCleanInstall && (
                       <div className="flex items-center gap-2 text-red-400 animate-pulse">
                         <span className="text-red-500">>></span> 清理: 删除旧版本数据残留...
                       </div>
                    )}
                    {simulatedProgress > 60 && config.synologyConfig.enabled && (
                       <div className="flex items-center gap-2 text-slate-600 animate-pulse">
                         <span className="text-blue-500">>></span> 自动配置: config.json (注入服务器参数)
                       </div>
                    )}
                    {simulatedProgress > 80 && config.useInfoForDeviceName && (
                       <div className="flex items-center gap-2 text-emerald-500/70">
                         <span className="text-emerald-600">>></span> 重命名: [项目]-[部门]-DEVICE_ID
                       </div>
                    )}
                    {simulatedProgress > 90 && config.automationScripts.slice(0,2).map((s, i) => (
                       <div key={i} className="flex items-center gap-2 text-slate-600">
                         <span className="text-slate-700">>></span> 队列中: {s.name}
                       </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
