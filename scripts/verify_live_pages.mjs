import { runVerification } from '../qa-rc-v03/verify-https.mjs';
// Reads the configured target; never deploys or rolls back.
await runVerification();
