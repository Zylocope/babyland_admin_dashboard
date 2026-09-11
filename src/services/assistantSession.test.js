import assert from 'node:assert/strict';
import { finishInterruptedTools, withSignal } from './assistantSession.js';

const transcript = [{ role: 'user', parts: [{ text: 'Sales and stock?' }] }, { role: 'model', parts: [
  { functionCall: { name: 'sales_summary', id: 'a', args: {} } },
  { functionCall: { name: 'low_stock', id: 'b', args: {} } },
] }];
const repaired = finishInterruptedTools(transcript, 'Stopped');
assert.equal(transcript.length, 2, 'repair must not mutate the visible transcript');
assert.deepEqual(repaired.at(-1).parts.map(p => p.functionResponse.id), ['a', 'b']);
assert.ok(repaired.at(-1).parts.every(p => p.functionResponse.response.error === 'Stopped'));
assert.equal(finishInterruptedTools(repaired, 'Stopped'), repaired, 'do not duplicate responses');

const controller = new AbortController();
let resolveRead;
const read = new Promise(resolve => { resolveRead = resolve; });
const waiting = withSignal(read, controller.signal);
controller.abort();
await assert.rejects(waiting, { name: 'AbortError' });
resolveRead('Late result');
assert.equal(await withSignal(Promise.resolve('Ready'), new AbortController().signal), 'Ready');
const timed = new AbortController();
timed.abort(new DOMException('Timed out', 'TimeoutError'));
await assert.rejects(withSignal(Promise.resolve('Ignored'), timed.signal), { name: 'TimeoutError' });
console.log('assistantSession ok');
