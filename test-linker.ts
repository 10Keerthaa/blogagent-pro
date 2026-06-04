import { getGoogleAuth } from './lib/googleAuth';
import fs from 'fs';
import path from 'path';
import { SemanticLinker } from './lib/semanticLinker';
import { db } from './lib/firebaseAdmin';

const envStr = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
envStr.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        val = val.replace(/\\n/g, '\n');
        process.env[match[1].trim()] = val;
    }
});

async function runTest() {
    console.log("=== TESTING SEMANTIC LINKER ===");
    try {
        const linker = new SemanticLinker();
        await linker.init('wordpress');
        
        console.log("Testing paragraph with 'Data Analytics'...");
        const result = await linker.matchContext(
            "By integrating Data Analytics into the cloud infrastructure, organizations can unlock unprecedented value.",
            ["Data Analytics"],
            "wordpress"
        );
        console.log("Result:", result);
        
        console.log("\nTesting paragraph with 'Intelligent Automation'...");
        const result2 = await linker.matchContext(
            "Intelligent Automation is key to digital transformation.",
            ["Intelligent Automation"],
            "wordpress"
        );
        console.log("Result 2:", result2);
        
    } catch (e) {
        console.error("Linker failed:", e);
    }
    process.exit(0);
}
runTest();
