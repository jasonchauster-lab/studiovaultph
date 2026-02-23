-- Add new sub-neighborhood locations to the location_area ENUM
ALTER TYPE location_area ADD VALUE IF NOT EXISTS 'Makati - CBD/Ayala';
ALTER TYPE location_area ADD VALUE IF NOT EXISTS 'Makati - Poblacion/Rockwell';
ALTER TYPE location_area ADD VALUE IF NOT EXISTS 'Makati - San Antonio/Gil Puyat';
ALTER TYPE location_area ADD VALUE IF NOT EXISTS 'Makati - Others';
ALTER TYPE location_area ADD VALUE IF NOT EXISTS 'Mandaluyong - Ortigas South';
ALTER TYPE location_area ADD VALUE IF NOT EXISTS 'Mandaluyong - Greenfield/Shaw';
ALTER TYPE location_area ADD VALUE IF NOT EXISTS 'Mandaluyong - Boni/Pioneer';
ALTER TYPE location_area ADD VALUE IF NOT EXISTS 'QC - Tomas Morato';
ALTER TYPE location_area ADD VALUE IF NOT EXISTS 'QC - Katipunan';
ALTER TYPE location_area ADD VALUE IF NOT EXISTS 'QC - Eastwood';
ALTER TYPE location_area ADD VALUE IF NOT EXISTS 'QC - Cubao';
ALTER TYPE location_area ADD VALUE IF NOT EXISTS 'QC - Fairview/Commonwealth';
ALTER TYPE location_area ADD VALUE IF NOT EXISTS 'QC - Novaliches';
ALTER TYPE location_area ADD VALUE IF NOT EXISTS 'QC - Diliman';
ALTER TYPE location_area ADD VALUE IF NOT EXISTS 'QC - Maginhawa/UP Village';
