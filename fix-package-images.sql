-- Fix wrong package images in the database
-- Run this against your PostgreSQL database to immediately update the live images.
-- Usage: psql $DATABASE_URL -f fix-package-images.sql

UPDATE packages
SET image_url = '/images/gallery/resort-03.jpg',
    updated_at = NOW()
WHERE slug = 'chitwan-at-a-glance';

UPDATE packages
SET image_url = '/images/gallery/resort-06.jpg',
    updated_at = NOW()
WHERE slug = 'close-up-chitwan';

UPDATE packages
SET image_url = '/images/gallery/resort-09.jpg',
    updated_at = NOW()
WHERE slug = 'explore-chitwan';

-- Verify
SELECT slug, name, image_url FROM packages ORDER BY sort_order;
