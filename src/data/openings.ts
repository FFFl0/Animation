export type Opening = {
  seriesId: string;
  songTitle: string;
  artist: string;
};

// Text-only trivia facts (title/artist) — no audio, no lyrics.
export const OPENINGS: Opening[] = [
  { seriesId: 'naruto', songTitle: '«Rocks»', artist: 'Hound Dog' },
  { seriesId: 'aot', songTitle: '«Guren no Yumiya»', artist: 'Linked Horizon' },
  { seriesId: 'onepiece', songTitle: '«We Are!»', artist: 'Hiroshi Kitadani' },
  { seriesId: 'deathnote', songTitle: '«The World»', artist: 'Nightmare' },
  { seriesId: 'mha', songTitle: '«The Day»', artist: 'Porno Graffitti' },
  { seriesId: 'demonslayer', songTitle: '«Gurenge»', artist: 'LiSA' },
  { seriesId: 'jjk', songTitle: '«Kaikai Kitan»', artist: 'Eve' },
  { seriesId: 'fma', songTitle: '«Again»', artist: 'Yui' },
  { seriesId: 'bleach', songTitle: '«Asterisk»', artist: 'Orange Range' },
  { seriesId: 'hxh', songTitle: '«Departure!»', artist: 'Galneryus' },
  { seriesId: 'opm', songTitle: '«The Hero!!»', artist: 'JAM Project' },
  { seriesId: 'csm', songTitle: '«Kick Back»', artist: 'Kenshi Yonezu' },
  { seriesId: 'spyfamily', songTitle: '«Mixed Nuts»', artist: 'Official HIGE DANdism' },
  { seriesId: 'sao', songTitle: '«Crossing Field»', artist: 'LiSA' },
  { seriesId: 'codegeass', songTitle: '«Colors»', artist: 'FLOW' },
  { seriesId: 'frieren', songTitle: '«Yuusha»', artist: 'YOASOBI' },
  { seriesId: 'rezero', songTitle: '«Redo»', artist: 'Konomi Suzuki' },
  { seriesId: 'konosuba', songTitle: '«Fantastic Dreamer»', artist: 'Machico' },
  { seriesId: 'evangelion', songTitle: '«A Cruel Angel\'s Thesis»', artist: 'Yoko Takahashi' },
  { seriesId: 'tokyoghoul', songTitle: '«Unravel»', artist: 'TK from Ling Tosite Sigure' },
];

export function getOpening(seriesId: string): Opening | undefined {
  return OPENINGS.find((o) => o.seriesId === seriesId);
}
