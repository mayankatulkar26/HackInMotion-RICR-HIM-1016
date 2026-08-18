import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeBankStatement, compareBankStatements } from './statement-comparison';

test('statement comparison scores the statement with better savings and lower expense ratio higher', () => {
  const left = analyzeBankStatement([
    { amount: 85000, type: 'credit' },
    { amount: 60000, type: 'debit' },
    { amount: 5000, type: 'debit' },
  ]);

  const right = analyzeBankStatement([
    { amount: 85000, type: 'credit' },
    { amount: 70000, type: 'debit' },
    { amount: 4000, type: 'debit' },
  ]);

  const comparison = compareBankStatements(left, right);

  assert.equal(comparison.winner, 'left');
  assert.ok(comparison.left.score > comparison.right.score);
  assert.match(comparison.summary, /better/i);
});
