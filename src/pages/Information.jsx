import { Link } from 'react-router-dom';
import InformationLinks from '../components/common/InformationLinks';
import { informationPages } from '../content/information';

export default function Information({ page }) {
  const content = informationPages[page];
  return (
    <div className="min-h-dvh px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link to="/" className="font-bold text-brand text-xl">Appleland</Link>
          <Link to="/" className="text-sm text-sub underline underline-offset-4">Back to dashboard / sign in</Link>
        </header>
        <main className="surface-card is-sheet p-6 sm:p-8">
          <p className="text-xs font-semibold text-brand mb-3">DRAFT · ENGLISH · DETAILS TO BE CONFIRMED</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink">{content.title}</h1>
          <p className="mt-3 text-sub leading-relaxed">{content.intro}</p>
          <div className="mt-8 space-y-7">
            {content.sections.map(([title, body]) => <section key={title}><h2 className="font-semibold text-lg text-ink">{title}</h2><p className="mt-2 text-sm leading-7 text-sub">{body}</p></section>)}
          </div>
        </main>
        <footer className="mt-6"><InformationLinks /></footer>
      </div>
    </div>
  );
}
