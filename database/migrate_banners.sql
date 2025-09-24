-- Migration script to add banners/carousel functionality
-- Run this script to add the banners table to your existing database

-- Create banners table for hero section/carousel management
CREATE TABLE IF NOT EXISTS banners
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title character varying(200) COLLATE pg_catalog."default" NOT NULL,
    subtitle character varying(300) COLLATE pg_catalog."default",
    description text COLLATE pg_catalog."default",
    image_url character varying(500) COLLATE pg_catalog."default" NOT NULL,
    button_text character varying(100) COLLATE pg_catalog."default",
    button_link character varying(500) COLLATE pg_catalog."default",
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    background_color character varying(7) COLLATE pg_catalog."default" DEFAULT '#ffffff',
    text_color character varying(7) COLLATE pg_catalog."default" DEFAULT '#000000',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT banners_pkey PRIMARY KEY (id)
);

-- Add foreign key constraint for banner creator
ALTER TABLE IF EXISTS banners
    ADD CONSTRAINT banners_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES users (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_banners_is_active
    ON banners(is_active);

CREATE INDEX IF NOT EXISTS idx_banners_display_order
    ON banners(display_order);

CREATE INDEX IF NOT EXISTS idx_banners_created_at
    ON banners(created_at);

-- Insert sample banners for testing (optional)
-- You can uncomment these if you want sample data

/*
-- Sample banners (replace with actual admin user ID from your database)
INSERT INTO banners (title, subtitle, description, image_url, button_text, button_link, display_order, is_active, background_color, text_color, created_by) VALUES
(
    'Welcome to Selta Magic!',
    'Discover Amazing Products at Unbeatable Prices',
    'Shop our exclusive collection of premium products with fast delivery and excellent customer service.',
    '/uploads/products/sample-banner-1.jpg',
    'Shop Now',
    '/products',
    1,
    true,
    '#1a202c',
    '#ffffff',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
),
(
    'Special Summer Sale',
    'Up to 50% Off Selected Items',
    'Don''t miss out on our biggest sale of the year! Limited time offer on thousands of products.',
    '/uploads/products/sample-banner-2.jpg',
    'View Deals',
    '/products?sale=true',
    2,
    true,
    '#e53e3e',
    '#ffffff',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
),
(
    'New Arrivals',
    'Fresh Products Just In',
    'Check out our latest collection of trending products that everyone is talking about.',
    '/uploads/products/sample-banner-3.jpg',
    'Explore',
    '/products?new=true',
    3,
    true,
    '#38a169',
    '#ffffff',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
);
*/

-- Verification query to check if migration was successful
SELECT 
    'Banners migration completed successfully!' as status,
    COUNT(*) as banners_count 
FROM banners;

COMMENT ON TABLE banners IS 'Hero section banners and carousel slides for homepage display';
COMMENT ON COLUMN banners.title IS 'Main title/headline of the banner';
COMMENT ON COLUMN banners.subtitle IS 'Secondary text below the title';
COMMENT ON COLUMN banners.description IS 'Detailed description or promotional text';
COMMENT ON COLUMN banners.image_url IS 'URL/path to the banner background image';
COMMENT ON COLUMN banners.button_text IS 'Text for the call-to-action button';
COMMENT ON COLUMN banners.button_link IS 'URL that the button should link to';
COMMENT ON COLUMN banners.display_order IS 'Order in which banners should be displayed (lower numbers first)';
COMMENT ON COLUMN banners.is_active IS 'Whether this banner is currently active and should be displayed';
COMMENT ON COLUMN banners.background_color IS 'Hex color code for banner background overlay';
COMMENT ON COLUMN banners.text_color IS 'Hex color code for banner text';
COMMENT ON COLUMN banners.created_by IS 'Admin user who created this banner';
