const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        if (f === 'node_modules' || f === '.git' || f === 'dist' || f === 'build' || f === '.next') return;
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

function analyze() {
    const issues = {
        fetchOnRender: [],
        brittleState: [],
        largeContext: [],
        reactiveMutations: [],
        blockingUI: []
    };

    const seenReactiveMutations = new Set();
    const seenContexts = new Set();

    const processFile = (file) => {
        if (!file.endsWith('.tsx') && !file.endsWith('.ts')) return;
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        const relativeFile = path.relative('d:\\frag-and-book-main', file);

        let inUseEffect = false;
        let effectStartLine = 0;

        lines.forEach((line, i) => {
            const lineNum = i + 1;

            // 1. Fetch on render
            if (line.includes('useEffect(') || line.includes('useEffect (')) {
                inUseEffect = true;
                effectStartLine = lineNum;
            }
            if (inUseEffect && (line.includes('supabase.from') || line.includes('supabase.auth') || line.includes(' fetch(') || line.includes('axios.'))) {
                issues.fetchOnRender.push({ file: relativeFile, line: effectStartLine, code: line.trim() });
                inUseEffect = false;
            }
            if (inUseEffect && (line.includes('}, [') || line.includes('})'))) {
                inUseEffect = false;
            }

            // 2. Brittle state
            if ((line.includes('const [data,') || line.includes('const [loading,') || line.includes('const [isLoading,')) && line.includes('useState')) {
                issues.brittleState.push({ file: relativeFile, line: lineNum, code: line.trim() });
            }

            // 3. Blocking UI
            const isBlocking = /if\s*\(\w*(loading|isLoading)\w*\)\s*return\s*</i.test(line) ||
                (line.includes('return') && line.includes('isLoading') && line.includes('? <') && (line.includes('Spinner') || line.includes('Loader')));
            if (isBlocking) {
                issues.blockingUI.push({ file: relativeFile, line: lineNum, code: line.trim() });
            }

            // 4. Reactive mutations
            if ((line.includes('useMutation(') || line.includes('useMutation<')) && !seenReactiveMutations.has(file)) {
                if (!content.includes('onMutate') && !content.includes('setQueryData') && !content.includes('cancelQueries')) {
                    issues.reactiveMutations.push({ file: relativeFile, line: lineNum, code: line.trim() });
                    seenReactiveMutations.add(file);
                }
            }

            // 5. Context providers (check for Provider and large content)
            if ((line.includes('createContext(') || line.includes('createContext<')) && !seenContexts.has(file)) {
                issues.largeContext.push({ file: relativeFile, line: lineNum, code: line.trim() });
                seenContexts.add(file);
            }
        });
    };

    walkDir('d:\\frag-and-book-main\\src', processFile);
    if (fs.existsSync('d:\\frag-and-book-main\\partner-portal\\src')) {
        walkDir('d:\\frag-and-book-main\\partner-portal\\src', processFile);
    }

    console.log(JSON.stringify(issues, null, 2));
}

analyze();
