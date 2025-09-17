// Simple migration runner for sales card IDs
import { migrateSalesCardIds } from './src/lib/scripts/migrateSalesCardIds.ts';

console.log('🚀 Starting sales card ID migration...');

migrateSalesCardIds()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
