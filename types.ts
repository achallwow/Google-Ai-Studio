

export interface ScriptFile {
  id: string;
  name: string;
  content: string;
  type: 'powershell' | 'batch' | 'vbs';
}

export interface SynologyConfig {
  enabled: boolean;
  serverAddress: string;
  username: string; // Usually an admin account for deployment
  password: string;
}

export interface InstallerConfig {
  appName: string;
  appVersion: string;
  publisher: string;
  msiFileName: string;
  welcomeMessage: string;
  warningTitle: string;
  warningMessage: string;
  licenseText: string;
  automationScripts: ScriptFile[];
  runAsAdmin: boolean;
  silentInstall: boolean;
  forceCleanInstall: boolean; 
  collectUserInfo: boolean;
  useInfoForDeviceName: boolean;
  projectList: string;
  departmentList: string;
  enableBackupSelection: boolean;
  enableSmartFilters: boolean;
  backupMode: 'continuous' | 'scheduled'; // New
  backupStartTime: string; // New
  useOnlineInstaller: boolean;
  downloadUrl: string;
  synologyConfig: SynologyConfig;
}

export enum WizardStep {
  DETAILS = 0,
  FILES = 1,
  MESSAGES = 2,
  REVIEW = 3,
}

export const DEFAULT_CONFIG: InstallerConfig = {
  appName: "Synology Drive 助手",
  appVersion: "3.5.1",
  publisher: "制作人关新宇",
  msiFileName: "SynologyDrive.msi",
  welcomeMessage: "本向导将自动下载并安装最新的 Synology Drive Client。",
  warningTitle: "安装前须知",
  warningMessage: "安装过程中将连接服务器配置环境，请确保网络畅通。",
  licenseText: "",
  automationScripts: [],
  runAsAdmin: true,
  silentInstall: true,
  forceCleanInstall: true,
  collectUserInfo: true,
  useInfoForDeviceName: true,
  projectList: "总经办,职能部门,卖场,万晟汇,峰景,峰阁,华府,丽府,雲府,观岭雲庭,江山墅,清溪樾,科创园,翰林苑,书香门第A区,天府智慧城（北）,天府智慧城（南）",
  departmentList: "项目综合部,客户服务部,工程维护部,秩序维护部,环境维护部",
  enableBackupSelection: true,
  enableSmartFilters: true,
  backupMode: 'continuous',
  backupStartTime: '22:00',
  useOnlineInstaller: true,
  downloadUrl: "https://archive.synology.cn/download/Utility/SynologyDriveClient/3.5.1-12888/Windows/Installer/Synology%20Drive%20Client-3.5.1-12888.msi",
  synologyConfig: {
    enabled: true,
    serverAddress: "192.168.1.100", 
    username: "vansunadmin",
    password: "vansun20130423"
  }
};