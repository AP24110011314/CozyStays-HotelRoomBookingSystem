export { runSeed } from '../../seeds/seed.js';

// Also allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const { runSeed } = await import('../../seeds/seed.js');
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\nSeed error:', err.message || err);
      process.exit(1);
    });
}
