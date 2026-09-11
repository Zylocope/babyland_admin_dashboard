export const withSignal = (promise, signal) => new Promise((resolve, reject) => {
  const cancel = () => reject(signal.reason ?? new DOMException('Stopped', 'AbortError'));
  if (signal.aborted) { promise.catch(() => {}); cancel(); return; }
  signal.addEventListener('abort', cancel, { once: true });
  promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', cancel));
});

// A stopped tool round still needs matching responses before the next question.
export const finishInterruptedTools = (contents, message) => {
  const calls = contents.at(-1)?.parts?.filter(p => p.functionCall).map(p => p.functionCall) ?? [];
  if (!calls.length) return contents;
  return [...contents, { role: 'user', parts: calls.map(fc => ({ functionResponse: {
    ...(fc.id ? { id: fc.id } : {}), name: fc.name, response: { error: message },
  } })) }];
};
