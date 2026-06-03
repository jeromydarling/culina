-- Geo coordinates for the public kitchen-discovery map.
ALTER TABLE kitchens ADD COLUMN latitude REAL;
ALTER TABLE kitchens ADD COLUMN longitude REAL;

-- Backfill the seeded demo kitchens so the map has pins out of the box.
UPDATE kitchens SET latitude = 44.9778, longitude = -93.2650 WHERE slug = 'midwest-food-hub';
UPDATE kitchens SET latitude = 43.0731, longitude = -89.4012 WHERE slug = 'lakeside-commissary';
UPDATE kitchens SET latitude = 41.8910, longitude = -87.6480 WHERE slug = 'river-north-kitchens';
