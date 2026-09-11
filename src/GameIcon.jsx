// Small original stroke icons; no icon-font or asset requests.
const paths = {
  field: 'M19 4C10 3 4 7 5 13c1 6 10 7 13 0 1-3 1-6 1-9ZM5 20 14 9',
  goal: 'm12 3 2.7 5.6L21 9.5l-4.5 4.4 1 6.2-5.5-3-5.5 3 1-6.2L3 9.5l6.3-.9Z',
  log: 'M7 5h13M7 12h13M7 19h13M3 5h.1M3 12h.1M3 19h.1',
  wildlife: 'M3 13c3-6 6-6 9 0 3-6 6-6 9 0M12 13v5',
  plots: 'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',
  economy: 'm12 3 9 9-9 9-9-9Z',
  target: 'M12 2v4M12 18v4M2 12h4M18 12h4M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM12 12h.01',
  photo: 'M3 7h4l2-3h6l2 3h4v13H3ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  sound: 'M9 18V5l11-2v12M9 6l11-2M9 18a3 2 0 1 1-6 0 3 2 0 0 1 6 0ZM20 15a3 2 0 1 1-6 0 3 2 0 0 1 6 0Z',
}
export default function GameIcon({ name }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.field} /></svg>
}
