import { NavLink } from 'react-router-dom';
import { informationPages } from '../../content/information';

export default function InformationLinks() {
  return (
    <nav aria-label="Help and information" className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
      {Object.entries(informationPages).map(([path, page]) => (
        <NavLink key={path} to={`/${path}`} className={({ isActive }) => `inline-flex items-center min-h-11 underline-offset-4 hover:underline ${isActive ? 'text-brand font-semibold' : 'text-sub'}`}>{page.title}</NavLink>
      ))}
    </nav>
  );
}
