"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadWorkspace = loadWorkspace;
exports.saveProject = saveProject;
exports.deleteProject = deleteProject;
exports.setLastActiveProject = setLastActiveProject;
exports.saveRoleProfile = saveRoleProfile;
exports.deleteRoleProfile = deleteRoleProfile;
exports.saveSettings = saveSettings;
exports.saveRecentUrl = saveRecentUrl;
exports.saveRecentTabs = saveRecentTabs;
const electron_1 = __importDefault(require("electron"));
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const { app } = electron_1.default;
const workspaceSchemaVersion = 1;
const defaultSettings = {
    restoreTabsOnStartup: true,
    confirmBeforeClearingSessions: true,
    defaultHomepage: '',
};
const defaultWorkspace = {
    schemaVersion: workspaceSchemaVersion,
    projects: [],
    roleProfiles: [],
    settings: defaultSettings,
    recentUrls: [],
    recentTabs: [],
    lastActiveProjectId: null,
};
function workspacePath() {
    return node_path_1.default.join(app.getPath('userData'), 'workspace.json');
}
function sanitizeWorkspace(data) {
    const projects = Array.isArray(data.projects) ? data.projects.filter(isValidProject) : [];
    const roleProfiles = Array.isArray(data.roleProfiles)
        ? data.roleProfiles.filter((roleProfile) => isValidRoleProfile(roleProfile, projects))
        : [];
    const settings = sanitizeSettings(data.settings);
    const recentUrls = Array.isArray(data.recentUrls)
        ? data.recentUrls.filter((recentUrl) => isValidRecentUrl(recentUrl, projects, roleProfiles)).slice(0, 50)
        : [];
    const recentTabs = Array.isArray(data.recentTabs)
        ? data.recentTabs.filter((recentTab) => isValidSavedTab(recentTab, projects, roleProfiles)).slice(0, 20)
        : [];
    const lastActiveProjectId = typeof data.lastActiveProjectId === 'string' &&
        projects.some((project) => project.id === data.lastActiveProjectId)
        ? data.lastActiveProjectId
        : projects[0]?.id ?? null;
    return {
        schemaVersion: workspaceSchemaVersion,
        projects,
        roleProfiles,
        settings,
        recentUrls,
        recentTabs,
        lastActiveProjectId,
    };
}
function isValidProject(project) {
    return (typeof project.id === 'string' &&
        typeof project.name === 'string' &&
        typeof project.baseUrl === 'string' &&
        typeof project.description === 'string' &&
        typeof project.createdAt === 'string' &&
        typeof project.updatedAt === 'string' &&
        isAllowedUrl(project.baseUrl));
}
function isValidRoleProfile(roleProfile, projects) {
    return (typeof roleProfile.id === 'string' &&
        typeof roleProfile.projectId === 'string' &&
        projects.some((project) => project.id === roleProfile.projectId) &&
        typeof roleProfile.name === 'string' &&
        roleProfile.name.trim().length > 0 &&
        typeof roleProfile.color === 'string' &&
        /^#[\da-f]{6}$/i.test(roleProfile.color) &&
        typeof roleProfile.startUrl === 'string' &&
        isAllowedUrl(roleProfile.startUrl) &&
        typeof roleProfile.sessionPartition === 'string' &&
        roleProfile.sessionPartition.startsWith('persist:') &&
        typeof roleProfile.createdAt === 'string' &&
        typeof roleProfile.updatedAt === 'string');
}
function isAllowedUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    }
    catch {
        return false;
    }
}
function sanitizeSettings(settings) {
    return {
        restoreTabsOnStartup: typeof settings?.restoreTabsOnStartup === 'boolean'
            ? settings.restoreTabsOnStartup
            : defaultSettings.restoreTabsOnStartup,
        confirmBeforeClearingSessions: typeof settings?.confirmBeforeClearingSessions === 'boolean'
            ? settings.confirmBeforeClearingSessions
            : defaultSettings.confirmBeforeClearingSessions,
        defaultHomepage: typeof settings?.defaultHomepage === 'string' && (!settings.defaultHomepage || isAllowedUrl(settings.defaultHomepage))
            ? settings.defaultHomepage
            : defaultSettings.defaultHomepage,
    };
}
function isValidRecentUrl(recentUrl, projects, roleProfiles) {
    return (typeof recentUrl.id === 'string' &&
        typeof recentUrl.url === 'string' &&
        isAllowedUrl(recentUrl.url) &&
        typeof recentUrl.title === 'string' &&
        (recentUrl.projectId === null || projects.some((project) => project.id === recentUrl.projectId)) &&
        (recentUrl.roleProfileId === null ||
            roleProfiles.some((roleProfile) => roleProfile.id === recentUrl.roleProfileId)) &&
        typeof recentUrl.visitedAt === 'string');
}
function isValidSavedTab(recentTab, projects, roleProfiles) {
    return (typeof recentTab.id === 'string' &&
        projects.some((project) => project.id === recentTab.projectId) &&
        roleProfiles.some((roleProfile) => roleProfile.id === recentTab.roleProfileId) &&
        typeof recentTab.title === 'string' &&
        typeof recentTab.url === 'string' &&
        isAllowedUrl(recentTab.url) &&
        typeof recentTab.sessionPartition === 'string' &&
        recentTab.sessionPartition.startsWith('persist:') &&
        typeof recentTab.savedAt === 'string');
}
async function writeWorkspace(workspace) {
    const nextWorkspace = sanitizeWorkspace(workspace);
    const filePath = workspacePath();
    await (0, promises_1.mkdir)(node_path_1.default.dirname(filePath), { recursive: true });
    await (0, promises_1.writeFile)(filePath, `${JSON.stringify(nextWorkspace, null, 2)}\n`, 'utf8');
    return nextWorkspace;
}
async function loadWorkspace() {
    try {
        const raw = await (0, promises_1.readFile)(workspacePath(), 'utf8');
        const parsed = JSON.parse(raw);
        return sanitizeWorkspace(parsed);
    }
    catch (error) {
        const code = error.code;
        if (code === 'ENOENT') {
            return defaultWorkspace;
        }
        throw error;
    }
}
async function saveProject(project) {
    if (!isValidProject(project)) {
        throw new Error('Project name and a valid http(s) base URL are required.');
    }
    const workspace = await loadWorkspace();
    const existingIndex = workspace.projects.findIndex((currentProject) => currentProject.id === project.id);
    const projects = [...workspace.projects];
    if (existingIndex >= 0) {
        projects[existingIndex] = project;
    }
    else {
        projects.unshift(project);
    }
    return writeWorkspace({
        projects,
        roleProfiles: workspace.roleProfiles,
        settings: workspace.settings,
        recentUrls: workspace.recentUrls,
        recentTabs: workspace.recentTabs,
        lastActiveProjectId: project.id,
        schemaVersion: workspaceSchemaVersion,
    });
}
async function deleteProject(projectId) {
    const workspace = await loadWorkspace();
    const projects = workspace.projects.filter((project) => project.id !== projectId);
    const roleProfiles = workspace.roleProfiles.filter((roleProfile) => roleProfile.projectId !== projectId);
    const lastActiveProjectId = workspace.lastActiveProjectId === projectId ? projects[0]?.id ?? null : workspace.lastActiveProjectId;
    const recentUrls = workspace.recentUrls.filter((recentUrl) => recentUrl.projectId !== projectId);
    const recentTabs = workspace.recentTabs.filter((recentTab) => recentTab.projectId !== projectId);
    return writeWorkspace({ ...workspace, projects, roleProfiles, recentUrls, recentTabs, lastActiveProjectId });
}
async function setLastActiveProject(projectId) {
    const workspace = await loadWorkspace();
    const lastActiveProjectId = workspace.projects.some((project) => project.id === projectId)
        ? projectId
        : null;
    return writeWorkspace({ ...workspace, lastActiveProjectId });
}
async function saveRoleProfile(roleProfile) {
    const workspace = await loadWorkspace();
    if (!isValidRoleProfile(roleProfile, workspace.projects)) {
        throw new Error('Role name, color, session partition, and a valid start URL are required.');
    }
    const existingIndex = workspace.roleProfiles.findIndex((currentRole) => currentRole.id === roleProfile.id);
    const roleProfiles = [...workspace.roleProfiles];
    if (existingIndex >= 0) {
        roleProfiles[existingIndex] = roleProfile;
    }
    else {
        roleProfiles.unshift(roleProfile);
    }
    return writeWorkspace({ ...workspace, roleProfiles });
}
async function deleteRoleProfile(roleProfileId) {
    const workspace = await loadWorkspace();
    const roleProfiles = workspace.roleProfiles.filter((roleProfile) => roleProfile.id !== roleProfileId);
    const recentUrls = workspace.recentUrls.filter((recentUrl) => recentUrl.roleProfileId !== roleProfileId);
    const recentTabs = workspace.recentTabs.filter((recentTab) => recentTab.roleProfileId !== roleProfileId);
    return writeWorkspace({ ...workspace, roleProfiles, recentUrls, recentTabs });
}
async function saveSettings(settings) {
    const workspace = await loadWorkspace();
    return writeWorkspace({ ...workspace, settings: sanitizeSettings(settings) });
}
async function saveRecentUrl(recentUrl) {
    const workspace = await loadWorkspace();
    const nextRecentUrl = {
        ...recentUrl,
        visitedAt: recentUrl.visitedAt || new Date().toISOString(),
    };
    if (!isValidRecentUrl(nextRecentUrl, workspace.projects, workspace.roleProfiles)) {
        throw new Error('Recent URL must be a valid http(s) URL for an existing project and role.');
    }
    const recentUrls = [
        nextRecentUrl,
        ...workspace.recentUrls.filter((currentUrl) => currentUrl.url !== nextRecentUrl.url),
    ].slice(0, 50);
    return writeWorkspace({ ...workspace, recentUrls });
}
async function saveRecentTabs(recentTabs) {
    const workspace = await loadWorkspace();
    return writeWorkspace({ ...workspace, recentTabs });
}
//# sourceMappingURL=workspaceStore.js.map