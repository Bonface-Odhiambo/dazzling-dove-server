-- Migration script to add testimonials functionality
-- Run this script to add the testimonials table to your existing database

-- Create testimonials table
CREATE TABLE IF NOT EXISTS testimonials
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    product_id uuid,
    title character varying(200) COLLATE pg_catalog."default" NOT NULL,
    message text COLLATE pg_catalog."default" NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    status character varying(20) COLLATE pg_catalog."default" DEFAULT 'pending'::character varying,
    is_verified_purchase boolean DEFAULT false,
    is_featured boolean DEFAULT false,
    admin_notes text COLLATE pg_catalog."default",
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    approved_at timestamp with time zone,
    approved_by uuid,
    CONSTRAINT testimonials_pkey PRIMARY KEY (id),
    CONSTRAINT testimonials_rating_check CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT testimonials_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Add foreign key constraints
ALTER TABLE IF EXISTS testimonials
    ADD CONSTRAINT testimonials_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;

ALTER TABLE IF EXISTS testimonials
    ADD CONSTRAINT testimonials_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES products (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;

ALTER TABLE IF EXISTS testimonials
    ADD CONSTRAINT testimonials_approved_by_fkey FOREIGN KEY (approved_by)
    REFERENCES users (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_testimonials_user_id
    ON testimonials(user_id);

CREATE INDEX IF NOT EXISTS idx_testimonials_product_id
    ON testimonials(product_id);

CREATE INDEX IF NOT EXISTS idx_testimonials_status
    ON testimonials(status);

CREATE INDEX IF NOT EXISTS idx_testimonials_rating
    ON testimonials(rating);

CREATE INDEX IF NOT EXISTS idx_testimonials_created_at
    ON testimonials(created_at);

CREATE INDEX IF NOT EXISTS idx_testimonials_is_featured
    ON testimonials(is_featured);

-- Insert some sample testimonials for testing (optional)
-- You can uncomment these if you want sample data

/*
-- Sample testimonials (replace UUIDs with actual user and product IDs from your database)
INSERT INTO testimonials (user_id, product_id, title, message, rating, status, is_verified_purchase, is_featured) VALUES
(
    (SELECT id FROM users WHERE role = 'user' LIMIT 1),
    (SELECT id FROM products LIMIT 1),
    'Amazing Product!',
    'This product exceeded all my expectations. The quality is outstanding and delivery was super fast. Highly recommended!',
    5,
    'approved',
    true,
    true
),
(
    (SELECT id FROM users WHERE role = 'user' LIMIT 1 OFFSET 1),
    (SELECT id FROM products LIMIT 1),
    'Good value for money',
    'Really happy with this purchase. Good quality and arrived on time. Will definitely buy again.',
    4,
    'approved',
    true,
    false
),
(
    (SELECT id FROM users WHERE role = 'user' LIMIT 1),
    NULL,
    'Great shopping experience',
    'Overall excellent service from this store. Fast shipping, good customer service, and quality products.',
    5,
    'approved',
    false,
    true
);
*/

-- Verification query to check if migration was successful
SELECT 
    'Migration completed successfully!' as status,
    COUNT(*) as testimonials_count 
FROM testimonials;

COMMENT ON TABLE testimonials IS 'Customer testimonials and reviews for products and general store experience';
COMMENT ON COLUMN testimonials.user_id IS 'Reference to the user who wrote the testimonial';
COMMENT ON COLUMN testimonials.product_id IS 'Reference to the product being reviewed (NULL for general testimonials)';
COMMENT ON COLUMN testimonials.rating IS 'Rating from 1 to 5 stars';
COMMENT ON COLUMN testimonials.status IS 'Approval status: pending, approved, or rejected';
COMMENT ON COLUMN testimonials.is_verified_purchase IS 'Whether the user actually purchased this product';
COMMENT ON COLUMN testimonials.is_featured IS 'Whether this testimonial should be featured prominently';
COMMENT ON COLUMN testimonials.approved_by IS 'Admin user who approved this testimonial';
