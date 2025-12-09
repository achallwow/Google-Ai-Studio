
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
  // New fields for Mass Deployment based on PDF
  asUser: string; // The "as_user" field (e.g., "$" or "DOMAIN\\$")
  shareFolder: string; // e.g., "home" or "TeamFolder"
  remotePath: string; // e.g., "/"
  localPath: string; // e.g., "C:\\Users\\$\\SynologyDrive"
  enableSsl: boolean;
  allowUntrustedCertificate: boolean;
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
  backupMode: 'continuous' | 'scheduled'; 
  backupStartTime: string; 
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
  appVersion: "1.0.0", // Fixed version internally
  publisher: "制作人 · 关新宇", 
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
  backupMode: 'scheduled', 
  backupStartTime: '12:00', 
  useOnlineInstaller: true,
  // Reverted to global URL as requested
  downloadUrl: "https://global.synologydownload.com/download/Utility/SynologyDriveClient/4.0.1-17885/Windows/Installer/x86_64/Synology%20Drive%20Client-4.0.1-17885-x64.msi",
  synologyConfig: {
    enabled: true,
    serverAddress: "101.205.19.235:6690", 
    username: "vansunadmin",
    password: "vansun20130423",
    asUser: "$", // Default to local user variable per PDF
    shareFolder: "home",
    remotePath: "/",
    localPath: "C:\\Users\\$\\SynologyDrive",
    enableSsl: true,
    allowUntrustedCertificate: true
  }
};
