import { useState, useRef, useEffect } from 'react';
import { IconSend, IconSparkles, IconDatabase, IconLoader2, IconBolt } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { toolDeclarations, runTool, systemPrompt } from '../services/aiTools';
import { QUICK_ACTIONS, runQuickAction } from '../services/quickActions';

const MAX_TOOL_ROUNDS = 5;

const askGemini = async (contents) => {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt() }] },
      tools: [{ functionDeclarations: toolDeclarations }],
      contents,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || data?.error || `AI request failed (${res.status})`);
  const content = data?.candidates?.[0]?.content;
  if (!content) throw new Error(data?.promptFeedback?.blockReason || 'Empty response from AI');
  return content;
};

export default function Assistant() {
  const { t } = useTranslation();
  const [contents, setContents] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [contents, busy]);

  const send = async (text) => {
    if (!text.trim() || busy) return;
    setInput('');
    setError('');
    setBusy(true);

    let next = [...contents, { role: 'user', parts: [{ text: text.trim() }] }];
    setContents(next);

    try {
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const reply = await askGemini(next);
        next = [...next, reply];
        setContents(next);

        const calls = (reply.parts ?? []).filter(p => p.functionCall).map(p => p.functionCall);
        if (!calls.length) break;

        const parts = await Promise.all(calls.map(async fc => ({
          functionResponse: {
            ...(fc.id ? { id: fc.id } : {}),
            name: fc.name,
            response: await runTool(fc.name, fc.args ?? {}),
          },
        })));
        next = [...next, { role: 'user', parts }];
        setContents(next);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const quick = async (action) => {
    if (busy) return;
    setError('');
    setBusy(true);
    const asked = { role: 'user', parts: [{ text: t(action.labelKey) }] };
    setContents(c => [...c, asked]);
    try {
      const text = await runQuickAction(action, t);
      // Kept in the transcript so a typed follow-up still has the numbers in context.
      setContents(c => [...c, { role: 'model', parts: [{ text }] }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const suggestions = [t('assistant.s1'), t('assistant.s2'), t('assistant.s3')];

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] gap-4">
      <div className="surface-card flex-1 overflow-y-auto p-5 space-y-4">
        {contents.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
            <IconSparkles size={32} stroke={1.2} className="text-brand" />
            <div>
              <p className="font-semibold text-ink">{t('assistant.emptyTitle')}</p>
              <p className="text-sm text-sub mt-1">{t('assistant.emptyBody')}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {suggestions.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-app text-sub hover:text-brand hover:bg-brand-light transition-colors">
                  {s}
                </button>
              ))}
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
              <div className={`max-w-[80%] space-y-1.5 ${mine ? 'items-end' : ''}`}>
                {tools.map(name => (
                  <p key={name} className="flex items-center gap-1.5 text-[11px] text-mute">
                    <IconDatabase size={13} stroke={1.5} />
                    {t('assistant.checking', { tool: t(`assistant.tool.${name}`, name) })}
                  </p>
                ))}
                {text && (
                  <div className={`px-4 py-2.5 rounded-xl text-[15px] whitespace-pre-wrap ${mine
                    ? 'bg-brand text-white rounded-br-sm'
                    : 'border border-app text-ink rounded-bl-sm'}`}>
                    {text}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {busy && (
          <p className="flex items-center gap-2 text-sm text-mute">
            <IconLoader2 size={15} stroke={1.5} className="animate-spin" /> {t('assistant.thinking')}
          </p>
        )}
        {error && <p className="text-sm text-[#EF4444]">{error}</p>}
        <div ref={endRef} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] text-mute pr-1">
          <IconBolt size={13} stroke={1.8} /> {t('quick.title')}
        </span>
        {QUICK_ACTIONS.map(a => (
          <button key={a.key} onClick={() => quick(a)} disabled={busy}
            className="px-2.5 py-1 text-xs rounded-lg border border-app text-sub hover:text-brand hover:border-brand disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
            {t(a.labelKey)}
          </button>
        ))}
      </div>

      <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t('assistant.placeholder')}
          className="flex-1 px-4 py-2.5 text-[15px] border border-app rounded-lg bg-card text-ink focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <button type="submit" disabled={busy || !input.trim()}
          className="px-4 py-2.5 bg-brand text-white rounded-lg hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <IconSend size={18} stroke={1.5} />
        </button>
      </form>
    </div>
  );
}
