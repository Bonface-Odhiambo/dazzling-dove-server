CREATE TABLE IF NOT EXISTS cart_items
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    product_id uuid,
    quantity integer NOT NULL DEFAULT 1,
    added_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    unit_price numeric(10, 2) NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cart_items_pkey PRIMARY KEY (id),
    CONSTRAINT cart_items_user_id_product_id_key UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS categories
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default",
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT categories_pkey PRIMARY KEY (id),
    CONSTRAINT categories_name_key UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS order_items
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    order_id uuid,
    product_id uuid,
    quantity integer NOT NULL,
    product_name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    product_image character varying(500) COLLATE pg_catalog."default",
    created_at timestamp with time zone DEFAULT now(),
    unit_price numeric(10, 2) NOT NULL DEFAULT 0,
    total_price numeric(10, 2) NOT NULL DEFAULT 0,
    CONSTRAINT order_items_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS orders
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    total_amount numeric(10, 2) NOT NULL,
    payment_intent_id character varying(255) COLLATE pg_catalog."default" NOT NULL,
    shipping_address jsonb NOT NULL,
    status character varying(50) COLLATE pg_catalog."default" DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    order_number character varying(50) COLLATE pg_catalog."default",
    tracking_number character varying(100) COLLATE pg_catalog."default",
    shipped_at character varying(100) COLLATE pg_catalog."default",
    delivered_at character varying(100) COLLATE pg_catalog."default",
    shipping_first_name character varying(100) COLLATE pg_catalog."default",
    shipping_last_name character varying(100) COLLATE pg_catalog."default",
    shipping_address_line_1 character varying(255) COLLATE pg_catalog."default",
    shipping_address_line_2 character varying(255) COLLATE pg_catalog."default",
    shipping_city character varying(255) COLLATE pg_catalog."default",
    shipping_state character varying(255) COLLATE pg_catalog."default",
    shipping_postal_code character varying(255) COLLATE pg_catalog."default",
    shipping_country character varying(255) COLLATE pg_catalog."default",
    subtotal numeric(10, 2) NOT NULL DEFAULT 0,
    shipping_phone character varying(30) COLLATE pg_catalog."default",
    billing_first_name character varying(100) COLLATE pg_catalog."default",
    billing_last_name character varying(100) COLLATE pg_catalog."default",
    billing_phone character varying(30) COLLATE pg_catalog."default",
    billing_address_line_1 character varying(255) COLLATE pg_catalog."default",
    billing_city character varying(100) COLLATE pg_catalog."default",
    billing_state character varying(100) COLLATE pg_catalog."default",
    billing_postal_code character varying(20) COLLATE pg_catalog."default",
    billing_country character varying(100) COLLATE pg_catalog."default",
    CONSTRAINT orders_pkey PRIMARY KEY (id),
    CONSTRAINT orders_order_number_key UNIQUE (order_number),
    CONSTRAINT orders_payment_intent_id_key UNIQUE (payment_intent_id)
);

CREATE TABLE IF NOT EXISTS products
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    brand character varying(100) COLLATE pg_catalog."default",
    price numeric(10, 2) NOT NULL,
    original_price numeric(10, 2),
    description text COLLATE pg_catalog."default",
    image character varying(500) COLLATE pg_catalog."default",
    category character varying(100) COLLATE pg_catalog."default",
    rating numeric(2, 1) DEFAULT 0.0,
    reviews integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    CONSTRAINT products_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS user_addresses
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    type character varying(30) COLLATE pg_catalog."default" DEFAULT 'shipping'::character varying,
    first_name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    last_name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    phone character varying(30) COLLATE pg_catalog."default" NOT NULL,
    address text COLLATE pg_catalog."default" NOT NULL,
    additional_info text COLLATE pg_catalog."default",
    country character varying(100) COLLATE pg_catalog."default" NOT NULL,
    county character varying(100) COLLATE pg_catalog."default",
    region character varying(100) COLLATE pg_catalog."default",
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_addresses_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS user_payment_methods
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    type character varying(20) COLLATE pg_catalog."default" NOT NULL,
    provider character varying(50) COLLATE pg_catalog."default",
    provider_customer_id character varying(255) COLLATE pg_catalog."default",
    provider_payment_method_id character varying(255) COLLATE pg_catalog."default",
    card_last_four character varying(4) COLLATE pg_catalog."default",
    card_brand character varying(20) COLLATE pg_catalog."default",
    card_exp_month integer,
    card_exp_year integer,
    paypal_email character varying(255) COLLATE pg_catalog."default",
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_payment_methods_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS user_sessions
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    token character varying(500) COLLATE pg_catalog."default" NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_sessions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS users
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email character varying(255) COLLATE pg_catalog."default" NOT NULL,
    password_hash character varying(255) COLLATE pg_catalog."default" NOT NULL,
    first_name character varying(100) COLLATE pg_catalog."default",
    last_name character varying(100) COLLATE pg_catalog."default",
    role character varying(20) COLLATE pg_catalog."default" DEFAULT 'user'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    phone character varying(30) COLLATE pg_catalog."default",
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
);

ALTER TABLE IF EXISTS cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES products (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cart_product_id
    ON cart_items(product_id);


ALTER TABLE IF EXISTS cart_items
    ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cart_user_id
    ON cart_items(user_id);


ALTER TABLE IF EXISTS order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id)
    REFERENCES orders (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_order_items_order_id
    ON order_items(order_id);


ALTER TABLE IF EXISTS order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES products (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;
CREATE INDEX IF NOT EXISTS idx_order_items_product_id
    ON order_items(product_id);


ALTER TABLE IF EXISTS orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_orders_user_id
    ON orders(user_id);


ALTER TABLE IF EXISTS user_addresses
    ADD CONSTRAINT user_addresses_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;


ALTER TABLE IF EXISTS user_payment_methods
    ADD CONSTRAINT user_payment_methods_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id
    ON user_payment_methods(user_id);


ALTER TABLE IF EXISTS user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_sessions_user_id
    ON user_sessions(user_id);

-- Testimonials table for customer reviews
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

-- Add foreign key constraints for testimonials
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

-- Hero Banners/Carousel table for homepage management
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