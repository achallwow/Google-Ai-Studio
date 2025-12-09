
import React from 'react';
import { InstallerConfig, ScriptFile, WizardStep } from '../types';
import { Plus, Trash2, Settings, AlertTriangle, FileText, Terminal, CloudDownload, Link as LinkIcon, HardDrive, List, FolderInput, Server, Lock, User, MonitorSmartphone, Filter, Eraser, UserCheck, Building2, ShieldCheck, Clock, RefreshCw, Network, FolderSymlink, Globe, ShieldAlert } from 'lucide-react';

interface ConfigFormProps {
  config: InstallerConfig;
  setConfig: React.Dispatch<React.SetStateAction<InstallerConfig>>;
  currentStep: WizardStep;
  setStep: (step: WizardStep) => void;
}

// --- Helper Components ---

const InputGroup = ({ label, value, onChange, placeholder, icon: Icon, type = "text", helpText }: any) => (
  <div className="group">
    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 group-focus-within:text-blue-400 transition-colors">
      {label}
    </label>
    <div className="relative group-focus-within:shadow-[0_0_20px_rgba(59,130,246,0.15)] rounded-lg transition-shadow duration-300">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={16} />}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-slate-800/40 border border-slate-700/80 text-slate-200 text-sm rounded-lg py-2.5 px-3 ${Icon ? 'pl-10' : ''} focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-all placeholder-slate-600`}
        placeholder={placeholder}
      />
    </div>
    {helpText && <p className="text-[10px] text-slate-500 mt-1 leading-tight">{helpText}</p>}
  </div>
);

const TextAreaGroup = ({ label, value, onChange, placeholder }: any) => (
  <div className="group">
    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 group-focus-within:text-blue-400 transition-colors">
      {label}
    </label>
    <div className="group-focus-within:shadow-[0_0_20px_rgba(59,130,246,0.15)] rounded-lg transition-shadow duration-300">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full bg-slate-800/40 border border-slate-700/80 text-slate-200 text-xs rounded-lg py-2.5 px-3 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-all placeholder-slate-600 resize-none leading-relaxed"
        placeholder={placeholder}
      />
    </div>
  </div>
);

const ToggleItem = ({ label, subLabel, checked, onChange, activeColorClass = "checked:bg-blue-500 checked:border-blue-500" }: any) => (
  <label className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all duration-300 group ${checked ? 'bg-slate-800/80 border-slate-600 shadow-[0_0_15px_rgba(0,0,0,0.2)]' : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/60'}`}>
    <div className="relative flex items-center">
      <input 
        type="checkbox" 
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-600 bg-slate-700 transition-all shadow-sm ${activeColorClass} ${checked ? 'shadow-[0_0_8px_rgba(59,130,246,0.4)]' : ''}`}
      />
      <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" width="10" height="10"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </div>
    <div>
      <span className={`block text-xs font-medium transition-colors ${checked ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{label}</span>
      {subLabel && <span className="block text-[10px] text-slate-500">{subLabel}</span>}
    </div>
  </label>
);

const ShieldCheckIcon = ({size, className}: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
);

// --- Main Component ---

export const ConfigForm: React.FC<ConfigFormProps> = ({ config, setConfig, currentStep }) => {
  
  const handleChange = (field: keyof InstallerConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSynologyChange = (field: keyof InstallerConfig['synologyConfig'], value: any) => {
    setConfig(prev => ({
        ...prev,
        synologyConfig: { ...prev.synologyConfig, [field]: value }
    }));
  };

  const addScript = () => {
    const newScript: ScriptFile = {
      id: Date.now().toString(),
      name: `script_${config.automationScripts.length + 1}.ps1`,
      content: "",
      type: 'powershell'
    };
    setConfig(prev => ({ ...prev, automationScripts: [...prev.automationScripts, newScript] }));
  };

  const removeScript = (id: string) => {
    setConfig(prev => ({ ...prev, automationScripts: prev.automationScripts.filter(s => s.id !== id) }));
  };

  const updateScript = (id: string, field: keyof ScriptFile, value: string) => {
    setConfig(prev => ({
      ...prev,
      automationScripts: prev.automationScripts.map(s => s.id === id ? { ...s, [field]: value } : s)
    }));
  };

  // STEP 1: Details
  const renderStepDetails = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-4">
        <InputGroup 
          label="应用程序名称" 
          value={config.appName} 
          onChange={(v: string) => handleChange('appName', v)} 
          placeholder="如：企业助手客户端"
          icon={FileText}
        />
        {/* Version input removed as requested */}
        <div className="grid grid-cols-1 gap-4">
           <InputGroup 
            label="发布厂商" 
            value={config.publisher} 
            onChange={(v: string) => handleChange('publisher', v)} 
            placeholder="公司名称"
            icon={Building2}
          />
        </div>
      </div>
      
      {/* Synology Server Configuration Block */}
      <div className={`bg-slate-800/20 border rounded-xl p-4 space-y-4 transition-all duration-300 ${config.synologyConfig.enabled ? 'border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.05)]' : 'border-slate-700/50 hover:border-blue-500/20'}`}>
         <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                <Server size={14} /> Synology 服务器配置 (大规模部署)
            </h3>
            <ToggleItem 
                label="启用自动化部署" 
                subLabel="生成 config.json 并注入 MSI"
                checked={config.synologyConfig.enabled} 
                onChange={(c: boolean) => handleSynologyChange('enabled', c)} 
                activeColorClass="checked:bg-blue-600 checked:border-blue-600"
            />
         </div>
         
         {config.synologyConfig.enabled && (
             <div className="grid grid-cols-1 gap-4 pt-2 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-4">
                    <InputGroup 
                        label="服务器地址 (IP / QC)" 
                        value={config.synologyConfig.serverAddress} 
                        onChange={(v: string) => handleSynologyChange('serverAddress', v)} 
                        placeholder="例如: 192.168.1.100"
                        icon={LinkIcon}
                    />
                     <InputGroup 
                        label="远程路径 (Remote Path)" 
                        value={config.synologyConfig.remotePath} 
                        onChange={(v: string) => handleSynologyChange('remotePath', v)} 
                        placeholder="/"
                        helpText="服务器端的挂载根目录，通常为 '/'"
                        icon={Globe}
                    />
                </div>
                
                <div className="flex gap-4">
                    <div className="flex-1">
                        <ToggleItem 
                            label="启用 SSL (HTTPS)" 
                            checked={config.synologyConfig.enableSsl} 
                            onChange={(c: boolean) => handleSynologyChange('enableSsl', c)} 
                        />
                    </div>
                    <div className="flex-1">
                        <ToggleItem 
                            label="允许不信任证书" 
                            checked={config.synologyConfig.allowUntrustedCertificate} 
                            onChange={(c: boolean) => handleSynologyChange('allowUntrustedCertificate', c)} 
                            activeColorClass="checked:bg-amber-600 checked:border-amber-600"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <InputGroup 
                        label="管理员账号 (Admin)" 
                        value={config.synologyConfig.username} 
                        onChange={(v: string) => handleSynologyChange('username', v)} 
                        placeholder="admin"
                        icon={User}
                    />
                    <InputGroup 
                        label="管理员密码" 
                        value={config.synologyConfig.password} 
                        onChange={(v: string) => handleSynologyChange('password', v)} 
                        placeholder="部署专用密码"
                        type="password"
                        icon={Lock}
                    />
                </div>

                {/* Mass Deployment Specifics (PDF Pages 8-10) */}
                <div className="border-t border-slate-700/50 pt-4 mt-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                        <Network size={12} /> 连接映射策略 (as_user)
                    </div>
                    <div className="space-y-4">
                        <InputGroup 
                            label="目标用户模式 (as_user)" 
                            value={config.synologyConfig.asUser} 
                            onChange={(v: string) => handleSynologyChange('asUser', v)} 
                            placeholder="$"
                            helpText="使用 '$' 代表当前 Windows 登录用户。域用户请使用 'DOMAIN\\$' 格式。"
                            icon={UserCheck}
                        />
                        <div className="grid grid-cols-2 gap-4">
                             <InputGroup 
                                label="远程同步文件夹 (Share Folder)" 
                                value={config.synologyConfig.shareFolder} 
                                onChange={(v: string) => handleSynologyChange('shareFolder', v)} 
                                placeholder="home"
                                helpText="输入 'home' 代表个人空间，或输入团队文件夹名称。"
                                icon={CloudDownload}
                            />
                             <InputGroup 
                                label="本地同步路径 (Local Path)" 
                                value={config.synologyConfig.localPath} 
                                onChange={(v: string) => handleSynologyChange('localPath', v)} 
                                placeholder="C:\Users\$\SynologyDrive"
                                helpText="使用 '$' 作为用户目录变量。建议保留默认值。"
                                icon={FolderSymlink}
                            />
                        </div>
                    </div>
                </div>

                {/* Force Clean Install Toggle */}
                <div className="bg-red-900/10 border border-red-500/20 rounded-lg p-3 mt-2">
                   <div className="flex items-start gap-2">
                       <Eraser className="text-red-400 mt-0.5" size={14} />
                       <div className="flex-1">
                           <ToggleItem 
                                label="强制清理旧版本数据 (推荐)" 
                                subLabel="卸载旧版并删除 %localappdata%\SynologyDrive"
                                checked={config.forceCleanInstall} 
                                onChange={(c: boolean) => handleChange('forceCleanInstall', c)} 
                                activeColorClass="checked:bg-red-600 checked:border-red-600"
                            />
                            <p className="text-[10px] text-red-300/60 mt-2 pl-1 leading-relaxed">
                                开启后，安装程序将先尝试卸载旧版本，并强制删除本地残留的账号配置文件。这能有效防止新旧账号冲突，确保连接到新服务器。
                            </p>
                       </div>
                   </div>
                </div>
             </div>
         )}
      </div>

      <div className="pt-2">
         <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
           <ShieldCheckIcon className="text-blue-500" size={14} /> 安装行为配置
         </div>
         <div className="grid grid-cols-1 gap-2">
           <ToggleItem 
              label="请求管理员权限 (Admin)" 
              subLabel="建议开启，以便写入 Program Files"
              checked={config.runAsAdmin} 
              onChange={(c: boolean) => handleChange('runAsAdmin', c)} 
            />
           <ToggleItem 
              label="静默运行 MSI (Silent)" 
              subLabel="隐藏 MSI 自带界面，统一使用 Inno 界面"
              checked={config.silentInstall} 
              onChange={(c: boolean) => handleChange('silentInstall', c)} 
            />
         </div>
      </div>
    </div>
  );

  // STEP 2: Files
  const renderStepFiles = () => (
    <div className="space-y-6 animate-fade-in">
      
      {/* MSI Source Selection */}
      <div className={`bg-slate-800/30 border p-4 rounded-xl space-y-4 transition-all duration-300 ${config.useOnlineInstaller ? 'border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.05)]' : 'border-slate-700/50'}`}>
        <div className="flex justify-between items-center">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">核心安装源</label>
            <ToggleItem 
              label="在线下载模式" 
              subLabel="自动从网络下载 MSI"
              checked={config.useOnlineInstaller} 
              onChange={(c: boolean) => handleChange('useOnlineInstaller', c)}
              activeColorClass="checked:bg-indigo-500 checked:border-indigo-500"
            />
        </div>

        {config.useOnlineInstaller ? (
           <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">
              <div className="relative group-focus-within:shadow-[0_0_15px_rgba(99,102,241,0.2)] rounded-lg transition-shadow">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" size={16} />
                <input
                  type="text"
                  value={config.downloadUrl}
                  onChange={(e) => handleChange('downloadUrl', e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-indigo-950/30 border border-indigo-500/30 rounded-lg p-2.5 pl-10 text-indigo-100 text-xs focus:border-indigo-400 focus:outline-none font-mono"
                />
              </div>
              <div className="flex items-center gap-2 text-[10px] text-indigo-300/70 px-1">
                <CloudDownload size={12} />
                <span>安装时将下载此文件到临时目录</span>
              </div>
           </div>
        ) : (
           <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="w-9 h-9 rounded bg-slate-700/50 flex items-center justify-center text-slate-400 border border-slate-600/50 shrink-0">
              <HardDrive size={18} />
            </div>
            <input
              type="text"
              value={config.msiFileName}
              onChange={(e) => handleChange('msiFileName', e.target.value)}
              placeholder="Setup.msi (本地文件名)"
              className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:border-blue-500 focus:outline-none font-mono text-sm focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-shadow"
            />
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between items-end mb-3">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">后置脚本 (Post-Install)</label>
          <button 
            onClick={addScript}
            className="text-[10px] bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white px-2.5 py-1 rounded border border-blue-600/20 hover:border-blue-600 transition-all flex items-center gap-1"
          >
            <Plus size={12} /> 添加脚本
          </button>
        </div>

        <div className="space-y-2.5">
          {config.automationScripts.length === 0 && (
            <div className="h-20 flex flex-col items-center justify-center border border-dashed border-slate-700 rounded-xl text-slate-600 text-xs bg-slate-800/10">
              <span>暂无脚本</span>
              <span className="text-[10px] opacity-70">脚本将在 MSI 安装完成后运行</span>
            </div>
          )}
          {config.automationScripts.map((script, index) => (
            <div key={script.id} className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-2.5 flex items-center gap-2 group hover:border-blue-500/30 transition-all focus-within:border-blue-500/50">
               <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center text-[10px] font-mono border border-slate-700">
                 {index + 1}
               </div>
               <select 
                 value={script.type}
                 onChange={(e) => updateScript(script.id, 'type', e.target.value as any)}
                 className="bg-slate-950 border border-slate-700 rounded text-[10px] text-blue-300 py-1 px-1.5 focus:outline-none cursor-pointer"
               >
                 <option value="powershell">PS1</option>
                 <option value="batch">BAT</option>
                 <option value="vbs">VBS</option>
               </select>
               <Terminal size={12} className="text-slate-600" />
               <input 
                  type="text" 
                  value={script.name}
                  onChange={(e) => updateScript(script.id, 'name', e.target.value)}
                  className="bg-transparent border-b border-transparent hover:border-slate-600 focus:border-blue-500 text-xs text-slate-300 px-1 flex-1 focus:outline-none transition-colors font-mono"
               />
               <button 
                 onClick={() => removeScript(script.id)}
                 className="w-6 h-6 flex items-center justify-center rounded text-slate-600 hover:bg-red-900/30 hover:text-red-400 transition-colors"
               >
                 <Trash2 size={14} />
               </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // STEP 3: Messages & Logic
  const renderStepMessages = () => (
    <div className="space-y-6 animate-fade-in">
       {/* User Info Collection Feature */}
      <div className={`bg-gradient-to-br from-emerald-900/20 to-emerald-900/5 border rounded-xl p-4 transition-all duration-300 group ${config.collectUserInfo ? 'border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : 'border-emerald-500/20 hover:border-emerald-500/40'}`}>
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
             <div className="mt-1 p-1.5 rounded bg-emerald-500/10 text-emerald-400">
                <UserCheck size={16} />
             </div>
             <div>
               <h3 className="text-sm font-bold text-emerald-100">用户信息采集</h3>
               <p className="text-[11px] text-emerald-200/60 mt-0.5 leading-relaxed">
                 安装向导中增加一页，要求用户填写“所属项目”和“部门”。
               </p>
             </div>
          </div>
          <div className="relative flex items-center mt-1 pl-2">
               <input 
                 type="checkbox" 
                 checked={config.collectUserInfo}
                 onChange={(e) => handleChange('collectUserInfo', e.target.checked)}
                 className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-emerald-600 bg-emerald-900/50 transition-all checked:border-emerald-500 checked:bg-emerald-500 checked:shadow-[0_0_10px_rgba(16,185,129,0.4)]"
               />
               <svg className="pointer-events-none absolute left-1/2 top-1/2 pl-2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
        </div>

        {config.collectUserInfo && (
          <div className="mt-4 pt-4 border-t border-emerald-500/10 space-y-3 animate-in fade-in slide-in-from-top-2">
            
            {/* Device Renaming Toggle */}
            <label className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${config.useInfoForDeviceName ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-emerald-950/20 border-emerald-500/10 hover:bg-emerald-900/30'}`}>
              <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400">
                  <MonitorSmartphone size={14} />
              </div>
              <div className="flex-1">
                 <span className="block text-xs font-bold text-emerald-100">服务器端连接标识 (Connection ID)</span>
                 <span className="block text-[10px] text-emerald-400/70 font-mono mt-0.5">项目-部门-DESKTOP-XXX</span>
              </div>
              <div className="relative flex items-center">
                 <input 
                    type="checkbox" 
                    checked={config.useInfoForDeviceName}
                    onChange={(e) => handleChange('useInfoForDeviceName', e.target.checked)}
                    className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-emerald-600/50 bg-emerald-900/30 transition-all checked:border-emerald-500 checked:bg-emerald-500"
                  />
                  <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" width="10" height="10"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
            </label>

            <div className="flex items-center gap-2 text-[10px] text-emerald-500/80 mb-1 pt-2">
              <List size={12} /> 定义下拉菜单选项 (英文逗号分隔)
            </div>
            <TextAreaGroup 
               label="项目列表 (Project Options)" 
               value={config.projectList} 
               onChange={(v: string) => handleChange('projectList', v)} 
               placeholder="例如: 项目A, 项目B, 项目C"
            />
            <TextAreaGroup 
               label="部门列表 (Department Options)" 
               value={config.departmentList} 
               onChange={(v: string) => handleChange('departmentList', v)} 
               placeholder="例如: 研发部, 市场部, 运维部"
            />
             
             {/* Backup Selection Toggle */}
             <div className="pt-3 mt-3 border-t border-emerald-500/10 space-y-2">
                 <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">备份策略</div>
                 <label className="flex items-center gap-3 p-2 rounded hover:bg-emerald-900/20 cursor-pointer transition-colors">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        checked={config.enableBackupSelection}
                        onChange={(e) => handleChange('enableBackupSelection', e.target.checked)}
                        className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-emerald-600/50 bg-emerald-900/30 transition-all checked:border-emerald-500 checked:bg-emerald-500"
                      />
                      <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" width="10" height="10"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-emerald-200/80">
                       <FolderInput size={14} />
                       开启“备份目录选择” (桌面、C-G盘)
                    </div>
                 </label>

                 {config.enableBackupSelection && (
                    <div className="pl-6 space-y-3 animate-in fade-in slide-in-from-top-1">
                      {/* Backup Mode Selector */}
                      <div className="bg-emerald-950/30 border border-emerald-500/10 rounded-lg p-3">
                         <div className="text-[10px] text-emerald-400 font-bold mb-2 flex items-center gap-2">
                            <Clock size={12} /> 备份频率模式
                         </div>
                         <div className="flex gap-2">
                            <button 
                               onClick={() => handleChange('backupMode', 'continuous')}
                               className={`flex-1 py-1.5 px-2 rounded text-[10px] transition-all border ${config.backupMode === 'continuous' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:text-white'}`}
                            >
                               连续备份 (实时)
                            </button>
                            <button 
                               onClick={() => handleChange('backupMode', 'scheduled')}
                               className={`flex-1 py-1.5 px-2 rounded text-[10px] transition-all border ${config.backupMode === 'scheduled' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:text-white'}`}
                            >
                               计划备份 (定时)
                            </button>
                         </div>
                         {config.backupMode === 'scheduled' && (
                             <div className="mt-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                <span className="text-[10px] text-emerald-300">启动时间:</span>
                                <input 
                                   type="time" 
                                   value={config.backupStartTime} 
                                   onChange={(e) => handleChange('backupStartTime', e.target.value)}
                                   className="bg-slate-900/50 border border-emerald-500/30 rounded px-2 py-1 text-xs text-emerald-100 focus:outline-none focus:border-emerald-500"
                                />
                             </div>
                         )}
                      </div>

                      <label className="flex items-center gap-3 p-2 rounded hover:bg-emerald-900/20 cursor-pointer transition-colors border border-transparent hover:border-emerald-500/10">
                        <div className="relative flex items-center">
                          <input 
                            type="checkbox" 
                            checked={config.enableSmartFilters}
                            onChange={(e) => handleChange('enableSmartFilters', e.target.checked)}
                            className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-emerald-600/50 bg-emerald-900/30 transition-all checked:border-emerald-500 checked:bg-emerald-500"
                          />
                          <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" width="10" height="10"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs text-emerald-200/80">
                              <Filter size={14} />
                              启用物业行业智能过滤 (v2.0 黑名单模式)
                          </div>
                          <span className="text-[9px] text-emerald-400/60 leading-tight">
                              已启用黑名单策略：<br/>
                              1. 🛡️ 系统垃圾 (.tmp .lnk .log)<br/>
                              2. 🚫 聊天缓存 (屏蔽视频/数据库，保留图片)<br/>
                              3. ⛔ 超大文件 (&gt;2GB)<br/>
                              * 除黑名单外，所有业务格式均会自动备份
                          </span>
                        </div>
                      </label>
                    </div>
                 )}
             </div>
          </div>
        )}
      </div>

      <div className="space-y-4 pt-2">
         <InputGroup 
            label="欢迎页副标题/文本" 
            value={config.welcomeMessage} 
            onChange={(v: string) => handleChange('welcomeMessage', v)} 
            placeholder="默认：欢迎使用安装向导..."
          />
      </div>

      <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4">
        <h3 className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider mb-3 flex items-center gap-2">
          <AlertTriangle size={12} /> 安装前警告 (可选)
        </h3>
        <div className="space-y-3">
          <div className="focus-within:shadow-[0_0_15px_rgba(202,138,4,0.15)] rounded transition-shadow">
            <input
                type="text"
                value={config.warningTitle}
                onChange={(e) => handleChange('warningTitle', e.target.value)}
                className="w-full bg-slate-900/40 border border-slate-700/50 rounded p-2 text-slate-200 text-xs focus:border-yellow-600/50 focus:outline-none"
                placeholder="警告标题"
              />
          </div>
          <div className="focus-within:shadow-[0_0_15px_rgba(202,138,4,0.15)] rounded transition-shadow">
            <textarea
              value={config.warningMessage}
              onChange={(e) => handleChange('warningMessage', e.target.value)}
              rows={2}
              className="w-full bg-slate-900/40 border border-slate-700/50 rounded p-2 text-slate-300 text-xs focus:border-yellow-600/50 focus:outline-none resize-none"
              placeholder="内容（留空则不显示警告页）"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStepReview = () => (
    <div className="flex flex-col items-center justify-center h-64 text-center space-y-6 animate-fade-in">
        <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
            <div className="relative w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700 shadow-2xl rotate-3 transition-transform hover:rotate-6">
                <FileText size={32} className="text-white" />
            </div>
        </div>
        <div>
            <h3 className="text-xl font-bold text-white">准备就绪</h3>
            <p className="text-slate-400 text-sm mt-2 max-w-[240px] mx-auto leading-relaxed">
                配置已完成。点击下方按钮，AI 将为您生成完整的 Inno Setup 脚本代码。
            </p>
        </div>
    </div>
  );

  return (
    <div className="h-full">
         {currentStep === WizardStep.DETAILS && renderStepDetails()}
         {currentStep === WizardStep.FILES && renderStepFiles()}
         {currentStep === WizardStep.MESSAGES && renderStepMessages()}
         {currentStep === WizardStep.REVIEW && renderStepReview()}
    </div>
  );
};
