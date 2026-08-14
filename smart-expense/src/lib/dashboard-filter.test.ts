import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeMonthFilter, monthRangeForFilter } from './dashboard-filter.ts';

test('normalizeMonthFilter accepts valid month values', () => {
  assert.equal(normalizeMonthFilter('2025-06'), '2025-06');
  assert.equal(normalizeMonthFilter('2025-1'), null);
  assert.equal(normalizeMonthFilter('not-a-month'), null);
  assert.equal(normalizeMonthFilter('2025-13'), null);
});

test('monthRangeForFilter returns a full-month date range', () => {
  const range = monthRangeForFilter('2025-06');
  assert.ok(range);
  assert.equal(range.start.toISOString(), '2025-06-01T00:00:00.000Z');
  assert.equal(range.end.toISOString(), '2025-06-30T23:59:59.999Z');
});
