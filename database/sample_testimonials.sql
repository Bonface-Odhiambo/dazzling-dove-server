-- Sample Testimonials Data
-- Run this AFTER running the migration script
-- This will populate your testimonials table with realistic sample data

-- First, let's check if we have users and products to work with
DO $$
DECLARE
    user_count INTEGER;
    product_count INTEGER;
    admin_id UUID;
    sample_user_id UUID;
    sample_product_id UUID;
BEGIN
    -- Check if we have users and products
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO product_count FROM products;
    
    IF user_count = 0 THEN
        RAISE NOTICE 'No users found. Please create some users first.';
        RETURN;
    END IF;
    
    IF product_count = 0 THEN
        RAISE NOTICE 'No products found. Please create some products first.';
        RETURN;
    END IF;
    
    -- Get admin and sample user IDs
    SELECT id INTO admin_id FROM users WHERE role = 'admin' LIMIT 1;
    SELECT id INTO sample_user_id FROM users WHERE role = 'user' LIMIT 1;
    SELECT id INTO sample_product_id FROM products LIMIT 1;
    
    -- Insert sample testimonials only if none exist
    IF NOT EXISTS (SELECT 1 FROM testimonials) THEN
        
        -- General testimonials (not product-specific)
        INSERT INTO testimonials (user_id, title, message, rating, status, is_featured, approved_at, approved_by) VALUES
        (
            sample_user_id,
            'Outstanding Customer Service!',
            'I had an amazing shopping experience with this store. The customer service team was incredibly helpful and responsive. They answered all my questions promptly and made sure I was completely satisfied with my purchase. The delivery was fast and the packaging was excellent. I will definitely be shopping here again!',
            5,
            'approved',
            true,
            NOW(),
            admin_id
        ),
        (
            sample_user_id,
            'Fast Delivery and Great Quality',
            'Really impressed with the quality of products and how quickly my order arrived. Everything was exactly as described and the packaging was very professional. Great value for money!',
            5,
            'approved',
            true,
            NOW(),
            admin_id
        ),
        (
            sample_user_id,
            'Reliable Online Store',
            'This has become my go-to online store. Consistent quality, fair prices, and reliable service. Never had any issues with my orders.',
            4,
            'approved',
            false,
            NOW(),
            admin_id
        );
        
        -- Product-specific testimonials (if we have products)
        IF sample_product_id IS NOT NULL THEN
            INSERT INTO testimonials (user_id, product_id, title, message, rating, status, is_verified_purchase, is_featured, approved_at, approved_by) VALUES
            (
                sample_user_id,
                sample_product_id,
                'Exceeded My Expectations!',
                'This product is absolutely fantastic! The quality is even better than I expected from the description. It arrived quickly and was packaged perfectly. I have been using it for a few weeks now and it works flawlessly. Highly recommend this to anyone considering a purchase!',
                5,
                'approved',
                true,
                true,
                NOW(),
                admin_id
            ),
            (
                sample_user_id,
                sample_product_id,
                'Great Value for Money',
                'Really happy with this purchase. The product does exactly what it promises and the price point is very reasonable. Good build quality and it feels durable. Would definitely buy from this brand again.',
                4,
                'approved',
                true,
                false,
                NOW(),
                admin_id
            ),
            (
                sample_user_id,
                sample_product_id,
                'Good Product, Minor Issues',
                'Overall satisfied with the product. It works well and meets most of my needs. There are a couple of minor issues but nothing that would prevent me from recommending it. Good customer support when I had questions.',
                3,
                'approved',
                true,
                false,
                NOW(),
                admin_id
            );
        END IF;
        
        -- Add some pending testimonials for admin testing
        INSERT INTO testimonials (user_id, product_id, title, message, rating, status, is_verified_purchase) VALUES
        (
            sample_user_id,
            sample_product_id,
            'Pending Review - Waiting for Approval',
            'This is a pending testimonial that admins can use to test the approval workflow. It should appear in the admin panel as pending.',
            4,
            'pending',
            false
        ),
        (
            sample_user_id,
            NULL,
            'Another Pending General Review',
            'This is a general testimonial (not product-specific) that is pending approval. Admins can approve, reject, or leave it pending.',
            5,
            'pending',
            false
        );
        
        RAISE NOTICE 'Sample testimonials inserted successfully!';
        
    ELSE
        RAISE NOTICE 'Testimonials already exist. Skipping sample data insertion.';
    END IF;
    
END $$;

-- Verify the sample data was inserted
SELECT 
    'Sample Data Summary' as info,
    COUNT(*) as total_testimonials,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN is_featured = true THEN 1 END) as featured,
    COUNT(CASE WHEN product_id IS NOT NULL THEN 1 END) as product_specific,
    COUNT(CASE WHEN product_id IS NULL THEN 1 END) as general_testimonials
FROM testimonials;

-- Show the sample testimonials
SELECT 
    t.title,
    t.rating,
    t.status,
    t.is_featured,
    t.is_verified_purchase,
    CASE 
        WHEN t.product_id IS NOT NULL THEN 'Product Review'
        ELSE 'General Review'
    END as review_type,
    t.created_at
FROM testimonials t
ORDER BY t.created_at DESC;

COMMENT ON SCRIPT IS 'Sample testimonials data for testing the testimonials system. Includes both general and product-specific reviews with various statuses.';
