import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n';
import { ThemeProvider } from './context/ThemeContext';
import PlaygroundAnalytics from './components/playground/PlaygroundAnalytics';

window.fetch = async () => new Response(JSON.stringify([
  { sale_date: '2026-09-18', tickets_sold: 18, free_tickets_redeemed: 2, total_sale: '36000' },
  { sale_date: '2026-09-19', tickets_sold: 27, free_tickets_redeemed: 3, total_sale: '54000' },
  { sale_date: '2026-09-20', tickets_sold: 14, free_tickets_redeemed: 1, total_sale: '28000' },
  { sale_date: '2026-09-21', tickets_sold: 31, free_tickets_redeemed: 4, total_sale: '62000' },
  { sale_date: '2026-09-22', tickets_sold: 22, free_tickets_redeemed: 2, total_sale: '44000' },
  { sale_date: '2026-09-23', tickets_sold: 36, free_tickets_redeemed: 5, total_sale: '72000' },
  { sale_date: '2026-09-24', tickets_sold: 25, free_tickets_redeemed: 2, total_sale: '50000' }
]), { status: 200, headers: { 'Content-Type': 'application/json' } });

createRoot(document.getElementById('root')).render(
  <ThemeProvider><main className="min-h-screen bg-app p-4 sm:p-6"><PlaygroundAnalytics start="2026-09-18" end="2026-09-24" days={7} /></main></ThemeProvider>
);
