import { generateSequence } from './src/services/vetoService/sequences';

// Verify different pool sizes produce different step counts
const pools = [7, 8, 9, 10, 12, 15];
const formats = [1, 3, 5] as const;

console.log('Pool | BO1 | BO3 | BO5');
console.log('-----|-----|-----|----');
for (const p of pools) {
    const counts = formats.map(f => {
        try {
            return generateSequence(p, f, 'pure_ban').length.toString();
        } catch { return 'N/A'; }
    });
    console.log(`  ${p}  | ${counts.join('  |  ')}`);
}

console.log('\n--- 9-map BO5 breakdown ---');
generateSequence(9, 5, 'pure_ban').forEach(s =>
    console.log(`  ${s.actionNumber}. ${s.action} ${s.team}${s.isDecider ? ' (decider)' : ''}`)
);

console.log('\n--- 7-map BO5 breakdown ---');
generateSequence(7, 5, 'pure_ban').forEach(s =>
    console.log(`  ${s.actionNumber}. ${s.action} ${s.team}${s.isDecider ? ' (decider)' : ''}`)
);
