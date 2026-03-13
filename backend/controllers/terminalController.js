import { exec } from 'child_process';
import path from 'path';

// Blocklist of dangerous commands
const BLOCKED_COMMANDS = [
    'rm -rf /',
    'format c:',
    'del /s /q c:',
    'mkfs',
    'dd if=',
    ':(){:|:&};:',
    'shutdown',
    'reboot',
    'halt',
    'poweroff',
    'taskkill /f /im',
];

const BLOCKED_PATTERNS = [
    /rm\s+-rf\s+\//i,
    /format\s+[a-z]:/i,
    /del\s+\/s\s+\/q/i,
    /shutdown/i,
    /reboot/i,
];

export const executeCommand = async (req, res) => {
    try {
        const { command, cwd } = req.body;

        if (!command || !command.trim()) {
            return res.status(400).json({ error: 'Command is required' });
        }

        const cmd = command.trim();

        // Security check
        for (const blocked of BLOCKED_COMMANDS) {
            if (cmd.toLowerCase().includes(blocked.toLowerCase())) {
                return res.status(403).json({ 
                    error: `Blocked: "${cmd}" contains a dangerous command pattern.` 
                });
            }
        }

        for (const pattern of BLOCKED_PATTERNS) {
            if (pattern.test(cmd)) {
                return res.status(403).json({ 
                    error: `Blocked: "${cmd}" matches a dangerous command pattern.` 
                });
            }
        }

        // Use a safe working directory
        const workingDir = cwd || process.cwd();

        console.log(`[Terminal] Executing: ${cmd} in ${workingDir}`);

        // Execute with timeout (15 seconds max)
        exec(cmd, { 
            cwd: workingDir, 
            timeout: 15000,
            maxBuffer: 1024 * 512, // 512KB output buffer
            shell: true
        }, (error, stdout, stderr) => {
            if (error && error.killed) {
                return res.status(408).json({ 
                    error: 'Command timed out (15s limit)',
                    output: stdout || '',
                    stderr: stderr || ''
                });
            }

            return res.status(200).json({
                output: stdout || '',
                stderr: stderr || '',
                exitCode: error ? error.code : 0
            });
        });

    } catch (error) {
        console.error('[Terminal] Error:', error.message);
        return res.status(500).json({ error: 'Failed to execute command' });
    }
};
