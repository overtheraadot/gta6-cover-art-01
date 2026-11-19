// The colour grades: each one washes the whole cover in a Vice City mood and
// picks the accent the caption shadow and the slanted bar are drawn in.
export const GRADES = {
  sunset: {
    name: 'Vice Sunset',
    // Warm orange low, hot pink high, laid over the photos.
    wash: [
      [0.0, 'rgba(255, 94, 77, 0.00)'],
      [0.45, 'rgba(255, 94, 77, 0.10)'],
      [1.0, 'rgba(214, 51, 132, 0.38)'],
    ],
    washMode: 'overlay',
    photoFilter: 'saturate(1.25) contrast(1.05)',
    accent: '#ff2e88',
    band: 'rgba(12, 4, 24, 0.88)',
  },
  neon: {
    name: 'Neon Night',
    // Magenta from the top, electric cyan from the bottom.
    wash: [
      [0.0, 'rgba(255, 0, 128, 0.30)'],
      [0.5, 'rgba(120, 40, 200, 0.10)'],
      [1.0, 'rgba(0, 229, 255, 0.28)'],
    ],
    washMode: 'overlay',
    photoFilter: 'saturate(1.35) contrast(1.08)',
    accent: '#00e5ff',
    band: 'rgba(6, 2, 20, 0.88)',
  },
  pastel: {
    name: 'Pastel Vice',
    // Soft pink and lavender, light and dreamy.
    wash: [
      [0.0, 'rgba(255, 183, 213, 0.22)'],
      [0.55, 'rgba(196, 141, 255, 0.12)'],
      [1.0, 'rgba(255, 120, 160, 0.26)'],
    ],
    washMode: 'soft-light',
    photoFilter: 'saturate(1.1) brightness(1.06)',
    accent: '#ff7ab8',
    band: 'rgba(40, 16, 52, 0.82)',
  },
  noir: {
    name: 'Noir',
    // Drained of colour, hard contrast, a single hot accent.
    wash: [
      [0.0, 'rgba(0, 0, 0, 0.30)'],
      [1.0, 'rgba(0, 0, 0, 0.45)'],
    ],
    washMode: 'source-over',
    photoFilter: 'grayscale(0.95) contrast(1.22) brightness(0.94)',
    accent: '#ff3b30',
    band: 'rgba(0, 0, 0, 0.9)',
  },
};

export const GRADE_IDS = Object.keys(GRADES);
