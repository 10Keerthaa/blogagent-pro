/**
 * dev.mjs — Starts next dev and opens the browser after a short wait.
 * Works cross-platform (Windows PowerShell, cmd, macOS, Linux).
 */
import { spawn } from 'child_process';
import { createServer } from 'net';

const PORT = 3000;
const URL = `http://localhost:${PORT}`;

// Start next dev
const dev = spawn('npx', ['next', 'dev'], {
    stdio: 'inherit',
    shell: true,
});

dev.on('error', (err) => console.error('Failed to start dev server:', err));

// Poll until the port is ready, then open the browser
let tries = 0;
const MAX_TRIES = 40; // 20 seconds

const poll = () => {
    const client = createServer().listen(PORT);
    client.on('listening', () => {
        // Port still free — server not ready yet
        client.close();
        if (++tries < MAX_TRIES) setTimeout(poll, 500);
    });
    client.on('error', () => {
        // Port is taken → server is up → open browser
        import('open').then(({ default: open }) => open(URL)).catch(() => {
            // open-cli fallback
            spawn('npx', ['open-cli', URL], { stdio: 'inherit', shell: true });
        });
    });
};

setTimeout(poll, 1500);
