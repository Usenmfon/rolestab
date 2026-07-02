import { app } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const defaultWorkspace = {
    projects: [],
    lastActiveProjectId: null,
};
function workspacePath() {
    return path.join(app.getPath('userData'), 'workspace.json');
}
function sanitizeWorkspace(data) {
    const projects = Array.isArray(data.projects) ? data.projects.filter(isValidProject) : [];
    const lastActiveProjectId = typeof data.lastActiveProjectId === 'string' &&
        projects.some((project) => project.id === data.lastActiveProjectId)
        ? data.lastActiveProjectId
        : projects[0]?.id ?? null;
    return { projects, lastActiveProjectId };
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
function isAllowedUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    }
    catch {
        return false;
    }
}
async function writeWorkspace(workspace) {
    const nextWorkspace = sanitizeWorkspace(workspace);
    const filePath = workspacePath();
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(nextWorkspace, null, 2)}\n`, 'utf8');
    return nextWorkspace;
}
export async function loadWorkspace() {
    try {
        const raw = await readFile(workspacePath(), 'utf8');
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
export async function saveProject(project) {
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
        lastActiveProjectId: project.id,
    });
}
export async function deleteProject(projectId) {
    const workspace = await loadWorkspace();
    const projects = workspace.projects.filter((project) => project.id !== projectId);
    const lastActiveProjectId = workspace.lastActiveProjectId === projectId ? projects[0]?.id ?? null : workspace.lastActiveProjectId;
    return writeWorkspace({ projects, lastActiveProjectId });
}
export async function setLastActiveProject(projectId) {
    const workspace = await loadWorkspace();
    const lastActiveProjectId = workspace.projects.some((project) => project.id === projectId)
        ? projectId
        : null;
    return writeWorkspace({ ...workspace, lastActiveProjectId });
}
//# sourceMappingURL=workspaceStore.js.map