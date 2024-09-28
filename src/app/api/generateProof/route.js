import { execSync } from 'child_process';
import path from 'path';

export async function POST(req) {
    const { voteChoice, voteLimit } = await req.json();

    const zokratesPath = '/home/thor/.zokrates/bin/zokrates';  // Full path to the ZoKrates binary
    const circuitPath = '/home/thor/ZKP/zokrates/vote.zok';  // Path to your vote.zok file

    try {
        // Compile the ZoKrates program
        execSync(`${zokratesPath} compile -i ${circuitPath}`, { stdio: 'inherit', shell: true });

        // Compute witness
        execSync(`${zokratesPath} compute-witness -a ${voteChoice} ${voteLimit}`, { stdio: 'inherit', shell: true });

        // Run setup to generate proving.key and verification.key
        execSync(`${zokratesPath} setup`, { stdio: 'inherit', shell: true });

        // Generate proof
        execSync(`${zokratesPath} generate-proof`, { stdio: 'inherit', shell: true });

        // Read the proof from proof.json
        const proof = require('../../../../../zokrates/proof.json');

        // Return the generated proof
        return new Response(JSON.stringify(proof), { status: 200 });

    } catch (error) {
        console.error('Error generating proof:', error);
        return new Response(JSON.stringify({ error: 'Proof generation failed' }), { status: 500 });
    }
}
