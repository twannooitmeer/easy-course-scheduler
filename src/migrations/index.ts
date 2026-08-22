import * as migration_20260821_233226_initial from './20260821_233226_initial';
import * as migration_20260822_020208_add_user_language_media_site_settings from './20260822_020208_add_user_language_media_site_settings';
import * as migration_20260822_093910_add_program_name_unique from './20260822_093910_add_program_name_unique';

export const migrations = [
  {
    up: migration_20260821_233226_initial.up,
    down: migration_20260821_233226_initial.down,
    name: '20260821_233226_initial',
  },
  {
    up: migration_20260822_020208_add_user_language_media_site_settings.up,
    down: migration_20260822_020208_add_user_language_media_site_settings.down,
    name: '20260822_020208_add_user_language_media_site_settings',
  },
  {
    up: migration_20260822_093910_add_program_name_unique.up,
    down: migration_20260822_093910_add_program_name_unique.down,
    name: '20260822_093910_add_program_name_unique'
  },
];
