import type { TestSession } from '../types';
import { computeSessionResults } from './formulas';

function csvRow(cells: (string | number)[]): string {
  return cells.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',');
}

export function exportSessionCSV(session: TestSession): string {
  const r = computeSessionResults(session);
  const lines: string[] = [];

  lines.push(csvRow(['Tennis Precision Test — Sessione']));
  lines.push(csvRow(['Giocatore', session.playerName]));
  lines.push(csvRow(['Data', session.date]));
  lines.push(csvRow(['Categoria', session.category]));
  lines.push(csvRow(['Coach', session.coach]));
  if (session.dateOfBirth) lines.push(csvRow(['Data di Nascita', session.dateOfBirth]));
  if (session.note) lines.push(csvRow(['Nota', session.note]));
  lines.push('');

  lines.push(csvRow(['Stroke', 'Label', 'Ave', 'Dev', 'N Serie']));
  for (const s of r.stats) {
    lines.push(csvRow([s.stroke, s.label, s.ave.toFixed(3), s.dev.toFixed(3), s.scores.length]));
  }
  lines.push('');

  lines.push(csvRow(['Area Radar', r.radarArea.toFixed(3)]));
  lines.push(csvRow(['% Ideale', r.percentOfIdeal.toFixed(2) + '%']));
  lines.push('');

  lines.push(csvRow(['Test', 'Serie', 'Score', 'Direzione', 'Tipo Servizio', 'Striscia', 'Lato']));
  for (const s of session.series) {
    lines.push(
      csvRow([
        s.testType,
        s.seriesIndex + 1,
        s.score,
        s.direction ?? '',
        s.serveType ?? '',
        s.targetStrip ?? '',
        s.side ?? '',
      ])
    );
  }

  return lines.join('\n');
}

export function exportHistoryCSV(sessions: TestSession[]): string {
  const lines: string[] = [];
  lines.push(
    csvRow([
      'Giocatore',
      'Data',
      'Categoria',
      'Coach',
      'DataNascita',
      'Nota',
      'Serve_Ave',
      'Serve_Dev',
      'FH_Ave',
      'FH_Dev',
      'Combined_Ave',
      'Combined_Dev',
      'Return_Ave',
      'Return_Dev',
      'BH_Ave',
      'BH_Dev',
      'Volley_Ave',
      'Volley_Dev',
      'Area',
      '%Ideale',
    ])
  );

  for (const session of sessions) {
    const r = computeSessionResults(session);
    const m = Object.fromEntries(r.stats.map(s => [s.stroke, s]));
    lines.push(
      csvRow([
        session.playerName,
        session.date,
        session.category,
        session.coach,
        session.dateOfBirth ?? '',
        session.note ?? '',
        m.serve?.ave.toFixed(3) ?? '',
        m.serve?.dev.toFixed(3) ?? '',
        m.forehand?.ave.toFixed(3) ?? '',
        m.forehand?.dev.toFixed(3) ?? '',
        m.combined?.ave.toFixed(3) ?? '',
        m.combined?.dev.toFixed(3) ?? '',
        m.return?.ave.toFixed(3) ?? '',
        m.return?.dev.toFixed(3) ?? '',
        m.backhand?.ave.toFixed(3) ?? '',
        m.backhand?.dev.toFixed(3) ?? '',
        m.volley?.ave.toFixed(3) ?? '',
        m.volley?.dev.toFixed(3) ?? '',
        r.radarArea.toFixed(3),
        r.percentOfIdeal.toFixed(2) + '%',
      ])
    );
  }

  return lines.join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
