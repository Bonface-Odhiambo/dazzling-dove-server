-- Sample Banners Data
-- Run this AFTER running the migration script
-- This will populate your banners table with realistic sample data

-- First, let's check if we have admin users to work with
DO $$
DECLARE
    admin_count INTEGER;
    admin_id UUID;
BEGIN
    -- Check if we have admin users
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
    
    IF admin_count = 0 THEN
        RAISE NOTICE 'No admin users found. Please create an admin user first.';
        RETURN;
    END IF;
    
    -- Get admin user ID
    SELECT id INTO admin_id FROM users WHERE role = 'admin' LIMIT 1;
    
    -- Insert sample banners only if none exist
    IF NOT EXISTS (SELECT 1 FROM banners) THEN
        
        INSERT INTO banners (title, subtitle, description, image_url, button_text, button_link, display_order, is_active, background_color, text_color, created_by) VALUES
        (
            'Welcome to Selta Magic!',
            'Discover Amazing Products at Unbeatable Prices',
            'Shop our exclusive collection of premium products with fast delivery and excellent customer service. From electronics to fashion, we have everything you need.',
            '/uploads/products/hero-banner-1.jpg',
            'Shop Now',
            '/products',
            1,
            true,
            '#1a202c',
            '#ffffff',
            admin_id
        ),
        (
            'Special Summer Sale',
            'Up to 50% Off Selected Items',
            'Don''t miss out on our biggest sale of the year! Limited time offer on thousands of products across all categories. Free shipping on orders over $50.',
            '/uploads/products/hero-banner-2.jpg',
            'View Deals',
            '/products?sale=true',
            2,
            true,
            '#e53e3e',
            '#ffffff',
            admin_id
        ),
        (
            'New Arrivals Collection',
            'Fresh Products Just In',
            'Check out our latest collection of trending products that everyone is talking about. Be the first to get your hands on these amazing items.',
            '/uploads/products/hero-banner-3.jpg',
            'Explore New',
            '/products?new=true',
            3,
            true,
            '#38a169',
            '#ffffff',
            admin_id
        ),
        (
            'Premium Quality Guarantee',
            'Quality You Can Trust',
            'All our products come with a satisfaction guarantee. If you''re not completely happy with your purchase, we''ll make it right.',
            '/uploads/products/hero-banner-4.jpg',
            'Learn More',
            '/about',
            4,
            true,
            '#3182ce',
            '#ffffff',
            admin_id
        ),
        (
            'Free Shipping Worldwide',
            'No Extra Costs, No Surprises',
            'Enjoy free shipping on all orders worldwide. Fast, reliable delivery to your doorstep with full tracking and insurance.',
            '/uploads/products/hero-banner-5.jpg',
            'Start Shopping',
            '/products',
            5,
            false, -- Inactive banner for testing
            '#805ad5',
            '#ffffff',
            admin_id
        );
        
        RAISE NOTICE 'Sample banners inserted successfully!';
        
    ELSE
        RAISE NOTICE 'Banners already exist. Skipping sample data insertion.';
    END IF;
    
END $$;

-- Verify the sample data was inserted
SELECT 
    'Sample Banner Data Summary' as info,
    COUNT(*) as total_banners,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_banners,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_banners
FROM banners;

-- Show the sample banners
SELECT 
    title,
    subtitle,
    button_text,
    button_link,
    display_order,
    is_active,
    background_color,
    text_color,
    created_at
FROM banners
ORDER BY display_order ASC;

-- Show banner statistics
SELECT 
    'Banner Statistics' as category,
    'Total Banners' as metric,
    COUNT(*)::text as value
FROM banners
UNION ALL
SELECT 
    'Banner Statistics' as category,
    'Active Banners' as metric,
    COUNT(CASE WHEN is_active = true THEN 1 END)::text as value
FROM banners
UNION ALL
SELECT 
    'Banner Statistics' as category,
    'Inactive Banners' as metric,
    COUNT(CASE WHEN is_active = false THEN 1 END)::text as value
FROM banners
UNION ALL
SELECT 
    'Banner Statistics' as category,
    'Average Display Order' as metric,
    ROUND(AVG(display_order), 2)::text as value
FROM banners;

COMMENT ON SCRIPT IS 'Sample banner data for testing the hero section/carousel system. Includes various banner types with different styles and purposes.';
