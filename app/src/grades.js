// The four colour grades. Each grade is a set of translucent gradient washes drawn
// over a panel's photo with 'overlay' / 'soft-light' blending, plus a warm or cool
// tint and a vignette, so the same photo reads as a different Vice City mood.
// Stops are [position, colour, alpha] triples; the scrim is the dark wash behind
// the caption at the foot of the cover.

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    washes: [
      { mode: 'overlay', stops: [[0, '#ff9a3d', 0.55], [0.55, '#ff4d6d', 0.5], [1, '#7b2fff', 0.55]] },
      { mode: 'soft-light', stops: [[0, '#ffd166', 0.5], [1, '#ff2e88', 0.5]] },
    ],
    tint: 'rgba(255, 110, 60, 0.10)',
    scrim: ['rgba(20, 4, 40, 0)', 'rgba(20, 4, 40, 0.82)'],
    accent: '#ffd166',
  },
  neon: {
    label: 'Neon Night',
    washes: [
      { mode: 'overlay', stops: [[0, '#00e5ff', 0.5], [0.5, '#7b2fff', 0.55], [1, '#ff2e88', 0.5]] },
      { mode: 'soft-light', stops: [[0, '#0b1030', 0.55], [1, '#ff7edb', 0.4]] },
    ],
    tint: 'rgba(20, 40, 160, 0.14)',
    scrim: ['rgba(2, 6, 26, 0)', 'rgba(2, 6, 26, 0.88)'],
    accent: '#40e0ff',
  },
  pastel: {
    label: 'Pastel Vice',
    washes: [
      { mode: 'soft-light', stops: [[0, '#ffb3d9', 0.6], [0.5, '#c9b8ff', 0.55], [1, '#8fe3ff', 0.55]] },
      { mode: 'overlay', stops: [[0, '#ff8fc7', 0.22], [1, '#7fd8ff', 0.22]] },
    ],
    tint: 'rgba(255, 180, 220, 0.08)',
    scrim: ['rgba(40, 16, 60, 0)', 'rgba(40, 16, 60, 0.66)'],
    accent: '#ffb3d9',
  },
  noir: {
    label: 'Noir',
    washes: [
      { mode: 'saturation', stops: [[0, '#808080', 1], [1, '#808080', 1]] },
      { mode: 'overlay', stops: [[0, '#ffffff', 0.16], [1, '#000000', 0.42]] },
    ],
    tint: 'rgba(0, 0, 0, 0.10)',
    scrim: ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.9)'],
    accent: '#ffffff',
  },
};

export const GRADE_IDS = Object.keys(GRADES);
