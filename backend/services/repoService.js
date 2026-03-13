import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const cloneRepo = async (repoUrl) => {
    // Extract owner and repo name from url (e.g., https://github.com/owner/repo)
    const parts = repoUrl.split('/');
    let repoName = parts.pop();
    if (repoName.endsWith('.git')) repoName = repoName.slice(0, -4);
    const owner = parts.pop();

    const reposDir = path.resolve(__dirname, '../repos');
    if (!fs.existsSync(reposDir)) {
        fs.mkdirSync(reposDir, { recursive: true });
    }

    const localPath = path.join(reposDir, `${owner}_${repoName}`);

    // If already cloned, we could just pull or return it. For now, let's remove and clone fresh or just return it.
    if (!fs.existsSync(localPath)) {
        console.log(`Cloning ${repoUrl} to ${localPath}...`);
        await simpleGit().clone(repoUrl, localPath);
    } else {
        console.log(`Repo already exists at ${localPath}`);
    }

    return { localPath, owner, repoName };
};

export const getFileTree = (dirPath, basePath = dirPath) => {
    const skipDirs = ['node_modules', '.git', 'dist', 'build'];
    let results = [];
    const list = fs.readdirSync(dirPath);

    list.forEach((file) => {
        if (skipDirs.includes(file)) return;

        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        if (stat && stat.isDirectory()) {
            results.push({
                name: file,
                type: 'directory',
                path: path.relative(basePath, fullPath).replace(/\\/g, '/'),
                children: getFileTree(fullPath, basePath)
            });
        } else {
            results.push({
                name: file,
                type: 'file',
                path: path.relative(basePath, fullPath).replace(/\\/g, '/')
            });
        }
    });

    return results;
};

export const getSourceFiles = (dirPath, maxFiles = 5) => {
    const validExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.html'];
    const skipDirs = ['node_modules', '.git', 'dist', 'build', 'public', 'assets', 'vendor'];
    
    let sourceFiles = [];

    const walkSync = (currentDirPath) => {
        if (sourceFiles.length >= maxFiles) return;
        
        const list = fs.readdirSync(currentDirPath);
        
        for (const file of list) {
            if (sourceFiles.length >= maxFiles) break;
            if (skipDirs.includes(file)) continue;

            const fullPath = path.join(currentDirPath, file);
            const stat = fs.statSync(fullPath);

            if (stat && stat.isDirectory()) {
                walkSync(fullPath);
            } else {
                const ext = path.extname(file).toLowerCase();
                if (validExtensions.includes(ext)) {
                    // Filter out likely minified or config files
                    if (file.includes('.min.') || file.includes('config') || file.includes('test')) continue;
                    
                    try {
                        let content = fs.readFileSync(fullPath, 'utf8');
                        // Cap file read length context limit
                        if (content.length > 50000) content = content.substring(0, 50000);
                        sourceFiles.push({
                            fileName: file,
                            path: fullPath,
                            code: content
                        });
                    } catch (e) {
                        // ignore broken files
                    }
                }
            }
        }
    };

    walkSync(dirPath);
    return sourceFiles;
};
