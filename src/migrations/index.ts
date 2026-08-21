import * as migration_20260821_233226_initial from './20260821_233226_initial';

export const migrations = [
  {
    up: migration_20260821_233226_initial.up,
    down: migration_20260821_233226_initial.down,
    name: '20260821_233226_initial'
  },
];
