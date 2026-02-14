import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { command } = body;

  // Mock terminal responses
  const responses: Record<string, string> = {
    'ls': 'README.md\nnode_modules/\npackage.json\nsrc/\ntsconfig.json\nnext.config.js',
    'ls -la': 'total 128\ndrwxr-xr-x  12 user user  4096 Feb 14 12:00 .\ndrwxr-xr-x   3 user user  4096 Feb 14 11:00 ..\n-rw-r--r--   1 user user   285 Feb 14 12:00 .gitignore\ndrwxr-xr-x   8 user user  4096 Feb 14 12:00 .git\n-rw-r--r--   1 user user  1234 Feb 14 12:00 README.md\ndrwxr-xr-x 450 user user 16384 Feb 14 12:00 node_modules\n-rw-r--r--   1 user user   892 Feb 14 12:00 package.json\ndrwxr-xr-x   4 user user  4096 Feb 14 12:00 src\n-rw-r--r--   1 user user   532 Feb 14 12:00 tsconfig.json',
    'pwd': '/workspace/project',
    'whoami': 'copilot-agent',
    'node --version': 'v20.11.0',
    'npm --version': '10.2.4',
    'git status': 'On branch main\nYour branch is up to date with \'origin/main\'.\n\nnothing to commit, working tree clean',
    'git log --oneline -5': 'a1b2c3d feat: add agent builder canvas\ne4f5g6h fix: resolve drag-and-drop positioning\ni7j8k9l refactor: extract node components\nm0n1o2p docs: update README with setup instructions\nq3r4s5t initial commit',
    'cat package.json': '{\n  "name": "copilot-agent",\n  "version": "1.0.0",\n  "type": "module",\n  "scripts": {\n    "dev": "next dev",\n    "build": "next build",\n    "start": "next start"\n  },\n  "dependencies": {\n    "next": "^15.0.0",\n    "react": "^19.0.0"\n  }\n}',
    'echo $PATH': '/usr/local/bin:/usr/bin:/bin',
    'date': new Date().toUTCString(),
    'uname -a': 'Linux copilot-workspace 6.1.0 #1 SMP x86_64 GNU/Linux',
    'npm test': '> copilot-agent@1.0.0 test\n> jest\n\nPASS  src/__tests__/utils.test.ts\n  ✓ cn merges classes correctly (2 ms)\n  ✓ formatDate formats dates (1 ms)\n  ✓ sleep resolves after delay (502 ms)\n\nTest Suites: 1 passed, 1 total\nTests:       3 passed, 3 total\nTime:        1.234 s',
    'npm run build': '> copilot-agent@1.0.0 build\n> next build\n\n   ▲ Next.js 15.0.0\n\n   Creating an optimized production build...\n   ✓ Compiled successfully\n   ✓ Linting and checking validity\n   ✓ Collecting page data\n   ✓ Generating static pages (4/4)\n   ✓ Finalizing page optimization\n\nRoute (app)           Size     First Load JS\n┌ ○ /                 5.2 kB        89.1 kB\n├ ○ /builder          12.4 kB       96.3 kB\n├ ○ /chat             8.7 kB        92.6 kB\n└ ○ /ide              15.1 kB       99.0 kB\n\n✓ Build completed in 12.3s',
  };

  const cmd = command.trim();
  let output = responses[cmd];

  if (!output) {
    if (cmd.startsWith('echo ')) {
      output = cmd.substring(5);
    } else if (cmd.startsWith('cd ')) {
      output = '';
    } else if (cmd === 'clear') {
      output = '';
    } else {
      output = `$ ${cmd}\nCommand executed successfully.`;
    }
  }

  return NextResponse.json({ output, exitCode: 0 });
}
