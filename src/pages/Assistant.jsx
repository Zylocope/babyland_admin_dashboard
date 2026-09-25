import { useState, useRef, useEffect } from 'react';
import { IconSend, IconSparkles, IconDatabase, IconLoader2, IconBolt, IconArrowDown } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { toolDeclarations, runTool, systemPrompt } from '../services/aiTools';
import { QUICK_ACTIONS, runQuickAction } from '../services/quickActions';
import { chartFromTool } from '../services/aiCharts';
import { finishInterruptedTools, withSignal } from '../services/assistantSession.js';
import { askGeminiViaBackend, AiError } from '../services/aiService';
import AssistantChart from '../components/common/AssistantChart';

const MAX_TOOL_ROUNDS = 5;
// Per request, not per run. One 60s budget for the whole loop meant a five-round
// answer, or any answer at all against a cold backend, reported a timeout while
// nothing was wrong. Gemini hops measure 2-4.5s; the Render free tier's cold
// start is documented at 30-60s, which is why the tool budget is the larger one.
const GEMINI_TIMEOUT_MS = 45_000;
const TOOL_TIMEOUT_MS = 90_000;
const deadline = (signal, ms) => AbortSignal.any([signal, AbortSignal.timeout(ms)]);
// Goes to the backend now, not the public Vercel function. Same body, same
// response — the relay passes both through untouched — so everything below
// this line is unchanged.
const askGemini = (contents, signal) => askGeminiViaBackend({
  systemInstruction: { parts: [{ text: systemPrompt() }] },
  tools: [{ functionDeclarations: toolDeclarations }],
  contents,
}, signal);

export default function Assistant() {
  const { t } = useTranslation();
  const [contents, setContents] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [charts, setCharts] = useState({});
  const [retry, setRetry] = useState(null);
  const [progress, setProgress] = useState('');
  const [following, setFollowing] = useState(true);
  const scrollRef = useRef(null);
  const messagesRef = useRef(null);
  const followRef = useRef(true);
  const abortRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const scroll = scrollRef.current;
    const observer = new ResizeObserver(() => {
      if (followRef.current) scroll.scrollTop = scroll.scrollHeight;
    });
    observer.observe(messagesRef.current);
    return () => { observer.disconnect(); const current = abortRef.current; abortRef.current = null; current?.abort(); };
  }, []);

  const run = async ({ text, action }) => {
    if (abortRef.current || (!action && !text.trim())) return;
    const abort = new AbortController();
    abortRef.current = abort;
    setBusy(true); setError(''); setRetry(null);
    followRef.current = true; setFollowing(true);
    if (!action) setInput('');
    let next = [...contents, { role: 'user', parts: [{ text: action ? t(action.labelKey) : text.trim() }] }];
    setContents(next);
    const question = { text, action };
    try {
      if (action) {
        setProgress(t('assistant.checking', { tool: t(`assistant.tool.${action.tool}`) }));
        const result = await withSignal(runQuickAction(action, t), deadline(abort.signal, TOOL_TIMEOUT_MS));
        next = [...next, { role: 'model', parts: [{ text: result.text }] }];
        setContents(next);
        const answerIndex = next.length - 1;
        if (result.chart) setCharts(prev => ({ ...prev, [answerIndex]: [result.chart] }));
        if (result.status === 'failed') setRetry(question);
      } else {
        let finished = false;
        // One chart per tool result, held until the answer they belong to exists.
        // Attaching them to the tool-call message drew them ABOVE the prose.
        let pending = [];
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          setProgress(t('assistant.thinking'));
          const geminiSignal = deadline(abort.signal, GEMINI_TIMEOUT_MS);
          const reply = await withSignal(askGemini(next, geminiSignal), geminiSignal);
          next = [...next, reply];
          setContents(next);
          const calls = (reply.parts ?? []).filter(p => p.functionCall).map(p => p.functionCall);
          if (!calls.length) {
            finished = true;
            if (pending.length) setCharts(prev => ({ ...prev, [next.length - 1]: pending }));
            break;
          }
          setProgress(t('assistant.checking', { tool: calls.map(fc => t(`assistant.tool.${fc.name}`, fc.name)).join(', ') }));
          const results = await withSignal(Promise.all(calls.map(async fc => ({ fc, response: await runTool(fc.name, fc.args ?? {}) }))), deadline(abort.signal, TOOL_TIMEOUT_MS));
          pending = [...pending, ...results.map(({ fc, response }) => chartFromTool(fc.name, response)).filter(Boolean)];
          next = [...next, { role: 'user', parts: results.map(({ fc, response }) => ({ functionResponse: {
            ...(fc.id ? { id: fc.id } : {}), name: fc.name, response,
          } })) }];
          setContents(next);
        }
        if (!finished) {
          const capped = [...next, { role: 'model', parts: [{ text: t('assistant.roundLimit', { rounds: MAX_TOOL_ROUNDS }) }] }];
          setContents(capped);
          if (pending.length) setCharts(prev => ({ ...prev, [capped.length - 1]: pending }));
        }
      }
    } catch (err) {
      if (abortRef.current !== abort) return;
      setContents(finishInterruptedTools(next, 'Report interrupted; do not infer values from this call.'));
      // The backend refuses before Gemini is ever reached, so those cases get
      // their own words — "AI request failed (403)" tells a manager nothing
      // about what to do next.
      setError(abort.signal.aborted ? t('assistant.stopped')
        : err.name === 'TimeoutError' ? t('assistant.timeout')
        : err instanceof AiError && err.kind === 'quota' ? t('assistant.quota')
        : err instanceof AiError && err.kind === 'auth' ? t('assistant.signedOut')
        : err instanceof AiError && err.kind === 'role' ? t('assistant.managerOnly')
        : err instanceof AiError && err.kind === 'timeout' ? t('assistant.timeout')
        : err.message);
      setRetry(question);
    } finally {
      if (abortRef.current === abort) {
        abortRef.current = null;
        setBusy(false); setProgress('');
      }
    }
  };
  const send = text => run({ text });
  const stop = () => abortRef.current?.abort();
  const jump = () => {
    followRef.current = true; setFollowing(true);
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      <div className="relative flex-1 min-h-0">
        <div ref={scrollRef} className="surface-card is-sheet h-full overflow-y-auto p-3 sm:p-5"
          onScroll={e => { const el = e.currentTarget; const near = el.scrollHeight - el.scrollTop - el.clientHeight < 64; followRef.current = near; setFollowing(near); }}>
          <div ref={messagesRef} className="space-y-4">
            {contents.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-4 text-center py-10 sm:py-16">
                <IconSparkles size={32} stroke={1.2} className="text-brand" />
                <div><h2 className="font-semibold text-ink">{t('assistant.emptyTitle')}</h2><p className="text-sm text-sub mt-1 max-w-md">{t('assistant.emptyBody')}</p></div>
                <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                  {[t('assistant.s1'), t('assistant.s2'), t('assistant.s3')].map(s => <button key={s} onClick={() => send(s)} className="px-3 py-2 text-xs rounded-lg border border-app text-sub hover:text-brand hover:bg-brand-light">{s}</button>)}
                </div>
              </div>
            )}
            {contents.map((m, i) => {
              const text = (m.parts ?? []).filter(p => p.text).map(p => p.text).join('\n');
              const tools = (m.parts ?? []).filter(p => p.functionCall).map(p => p.functionCall.name);
              if (!text && !tools.length) return null;
              const mine = m.role === 'user';
              return (
                <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`${mine ? 'max-w-[85%]' : 'w-full min-w-0'} space-y-2`}>
                    {tools.length > 0 && <p className="flex items-center gap-1.5 text-[11px] text-mute"><IconDatabase size={13} className="shrink-0" />{t('assistant.sources', { tools: tools.map(name => t(`assistant.tool.${name}`, name)).join(', ') })}</p>}
                    {text && <div className={`px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-words ${mine ? 'bg-brand text-white rounded-br-sm' : 'border border-app text-ink rounded-bl-sm'}`}>{text}</div>}
                    {!mine && charts[i]?.map((spec, ci) => <AssistantChart key={ci} spec={spec} />)}
                  </div>
                </div>
              );
            })}
            {busy && <div className="flex items-center gap-3" role="status"><IconLoader2 size={16} className="animate-spin text-mute shrink-0" /><span className="text-sm text-sub">{progress}</span></div>}
            {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
            {retry && !busy && <button onClick={() => run(retry)} className="px-3 py-2 text-xs rounded-lg border border-app text-sub hover:text-brand">{t('assistant.retry')}</button>}
          </div>
        </div>
        {!following && <button onClick={jump} className="absolute right-4 bottom-3 surface-menu px-3 py-2 text-xs text-ink inline-flex items-center gap-2"><IconArrowDown size={14} />{t('assistant.latest')}</button>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        <span className="inline-flex items-center gap-1 text-[11px] text-mute pr-1"><IconBolt size={13} />{t('quick.title')}</span>
        {QUICK_ACTIONS.map(action => <button key={action.key} onClick={() => run({ action })} disabled={busy} className="px-2.5 py-1.5 text-xs rounded-lg border border-app text-sub hover:text-brand hover:border-brand disabled:opacity-40 disabled:cursor-not-allowed">{t(action.labelKey)}</button>)}
      </div>
      <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex items-end gap-2 shrink-0">
        <textarea ref={inputRef} rows={2} value={input} onChange={e => setInput(e.target.value)} aria-label={t('assistant.placeholder')} placeholder={t('assistant.placeholder')}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); } }}
          className="flex-1 min-w-0 resize-none px-4 py-2.5 text-sm border border-app rounded-xl bg-card text-ink focus:outline-none focus:ring-2 focus:ring-brand" />
        {busy ? <button type="button" onClick={stop} className="px-4 py-3 rounded-xl border border-app text-sub hover:text-brand">{t('assistant.stop')}</button>
          : <button type="submit" aria-label={t('assistant.send')} disabled={!input.trim()} className="p-3 bg-brand text-white rounded-xl hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed"><IconSend size={20} /></button>}
      </form>
    </div>
  );
}
