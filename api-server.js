import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import pool from './database.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT;
const JWT_SECRET = process.env.JWT_SECRET;

// Stripe configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'products');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('MULTER DESTINATION:', uploadsDir); // Log the absolute path
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with timestamp
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${timestamp}-${name}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// Configure CORS to allow frontend on different ports
app.use(cors({
  origin: ['http://localhost:8080', 'https://selta-magic-fe.onrender.com', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));

// Initialize admin user on server start
const initializeAdminUser = async () => {
  try {
    const adminEmail = process.env.adminEmail;
    const adminPassword = process.env.adminPassword;
    
    // Check if admin user already exists
    const existingAdmin = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    
    if (existingAdmin.rows.length === 0) {
      // Create admin user
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
      
      await pool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5)',
        [adminEmail, passwordHash, 'Admin', 'User', 'admin']
      );
      
      console.log('✅ Admin user created successfully');
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error initializing admin user:', error);
  }
};

// Initialize admin user
initializeAdminUser();

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const result = await pool.query('SELECT id, email, first_name, last_name, role FROM users WHERE id = $1', [decoded.userId]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Auth routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ user: null, token: null, error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Determine role (admin for specific emails)
    const role = (email.toLowerCase() === 'roosseltam@gmail.com' || email.toLowerCase() === 'brandonladen486@gmail.com') ? 'admin' : 'user';

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, role',
      [email, passwordHash, firstName, lastName, role]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    // Store session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await pool.query(
      'INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      token,
      error: null
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ user: null, token: null, error: 'Internal server error' });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Signin attempt:', { email, password: 'hidden' });

    // Get user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    console.log('User found:', result.rows.length > 0 ? 'Yes' : 'No');
    
    if (result.rows.length === 0) {
      return res.status(400).json({ user: null, token: null, error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    console.log('User data:', { email: user.email, role: user.role });

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      return res.status(400).json({ user: null, token: null, error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    // Store session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await pool.query(
      'INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      token,
      error: null
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ user: null, token: null, error: 'Internal server error' });
  }
});

app.post('/api/auth/signout', authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      await pool.query('DELETE FROM user_sessions WHERE token = $1', [token]);
    }

    res.json({ error: null });
  } catch (error) {
    console.error('Signout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/session', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.first_name,
      lastName: req.user.last_name,
      role: req.user.role
    },
    error: null
  });
});

// Image upload endpoint
app.post('/api/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Return the relative path that can be used in the frontend
    const imagePath = `/uploads/products/${req.file.filename}`;
    
    console.log('Image uploaded successfully:', {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: imagePath,
      size: req.file.size
    });

    res.json({
      success: true,
      imagePath: imagePath,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Categories routes
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description, display_order FROM categories WHERE is_active = true ORDER BY display_order, name'
    );
    
    res.json({
      data: result.rows,
      error: null
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      data: null, 
      error: 'Failed to fetch categories' 
    });
  }
});

// Get all categories (including inactive ones) for admin
app.get('/api/admin/categories', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await pool.query(
      'SELECT id, name, description, display_order, is_active, created_at, updated_at FROM categories ORDER BY display_order, name'
    );
    
    res.json({
      data: result.rows,
      error: null
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      data: null, 
      error: 'Failed to fetch categories' 
    });
  }
});

// Create new category
app.post('/api/admin/categories', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, description, display_order, is_active } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const result = await pool.query(
      'INSERT INTO categories (name, description, display_order, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description || null, display_order || 0, is_active !== false]
    );

    res.json({
      data: result.rows[0],
      error: null
    });
  } catch (error) {
    console.error('Error creating category:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ 
        data: null, 
        error: 'Category name already exists' 
      });
    } else {
      res.status(500).json({ 
        data: null, 
        error: 'Failed to create category' 
      });
    }
  }
});

// Update category
app.put('/api/admin/categories/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { name, description, display_order, is_active } = req.body;

    console.log('Updating category:', { id, name, description, display_order, is_active });

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const result = await pool.query(
      'UPDATE categories SET name = $1, description = $2, display_order = $3, is_active = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
      [name, description || null, display_order || 0, is_active !== false, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({
      data: result.rows[0],
      error: null
    });
  } catch (error) {
    console.error('Error updating category:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ 
        data: null, 
        error: 'Category name already exists' 
      });
    } else {
      res.status(500).json({ 
        data: null, 
        error: 'Failed to update category' 
      });
    }
  }
});

// Delete category (hard delete - completely remove from database)
app.delete('/api/admin/categories/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    console.log('Hard deleting category with id:', id);

    // Check if category is being used by any products
    const productsUsingCategory = await pool.query(
      'SELECT COUNT(*) as count FROM products WHERE category = (SELECT name FROM categories WHERE id = $1)',
      [id]
    );

    console.log('Products using category check:', {
      categoryId: id,
      count: productsUsingCategory.rows[0].count
    });

    if (parseInt(productsUsingCategory.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category that is being used by products' 
      });
    }

    console.log('Proceeding with hard category deletion...');
    
    // HARD DELETE - completely removes from database
    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 RETURNING *',
      [id]
    );

    console.log('Hard delete query result:', {
      rowsAffected: result.rows.length,
      deletedCategory: result.rows[0]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({
      data: result.rows[0],
      error: null
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ 
      data: null, 
      error: 'Failed to delete category' 
    });
  }
});

// Products routes
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ data: [], error: 'Internal server error' });
  }
});

app.post('/api/products', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ data: null, error: 'Admin access required' });
    }

    const { name, brand, price, original_price, description, image, category, rating, reviews } = req.body;

    const result = await pool.query(
      'INSERT INTO products (name, brand, price, original_price, description, image, category, rating, reviews) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [name, brand, price, original_price, description, image, category, rating, reviews]
    );

    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ data: null, error: 'Internal server error' });
  }
});

app.put('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ data: null, error: 'Admin access required' });
    }

    const { id } = req.params;
    const { name, brand, price, original_price, description, image, category, rating, reviews } = req.body;

    const result = await pool.query(
      'UPDATE products SET name = $1, brand = $2, price = $3, original_price = $4, description = $5, image = $6, category = $7, rating = $8, reviews = $9, updated_at = NOW() WHERE id = $10 RETURNING *',
      [name, brand, price, original_price, description, image, category, rating, reviews, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Product not found' });
    }

    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ data: null, error: 'Internal server error' });
  }
});

app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ data: null, error: 'Admin access required' });
    }

    const { id } = req.params;

    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ data: null, error: 'Product not found' });
    }

    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ data: null, error: 'Internal server error' });
  }
});

// Debug route to reset admin password
app.post('/api/reset-admin', async (req, res) => {
  try {
    const password = 'admin123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email',
      [passwordHash, 'Roosseltam@gmail.com']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    res.json({ message: 'Admin password reset successfully', email: result.rows[0].email });
  } catch (error) {
    console.error('Reset admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================
// CART ITEMS ROUTES
// =============================================

// Get cart items for a user
app.get('/api/cart', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Fixed: use req.user.id instead of req.user.userId
    
    const result = await pool.query(`
      SELECT 
        ci.id,
        ci.quantity,
        ci.unit_price,
        ci.created_at,
        p.id as product_id,
        p.name as product_name,
        p.description as product_description,
        p.image as product_image,
        p.price as current_price
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = $1 AND p.is_active = true
      ORDER BY ci.created_at DESC
    `, [userId]);
    
    const cartItems = result.rows.map(row => ({
      id: row.product_id,
      name: row.product_name,
      description: row.product_description,
      price: parseFloat(row.current_price),
      quantity: row.quantity,
      image: row.product_image,
      cart_item_id: row.id,
      added_at: row.created_at
    }));
    
    res.json({ data: cartItems, error: null });
  } catch (error) {
    console.error('Get cart items error:', error);
    res.status(500).json({ error: 'Failed to fetch cart items' });
  }
});

// Add item to cart
app.post('/api/cart', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Fixed: use req.user.id instead of req.user.userId
    const { product_id, quantity = 1 } = req.body;
    
    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }
    
    // Get product details and current price
    const productResult = await pool.query(
      'SELECT id, name, price, is_active FROM products WHERE id = $1',
      [product_id]
    );
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const product = productResult.rows[0];
    if (!product.is_active) {
      return res.status(400).json({ error: 'Product is not available' });
    }
    
    // Check if item already exists in cart
    const existingItem = await pool.query(
      'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [userId, product_id]
    );
    
    if (existingItem.rows.length > 0) {
      // Update existing cart item
      const newQuantity = existingItem.rows[0].quantity + quantity;
      const updateResult = await pool.query(
        'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [newQuantity, existingItem.rows[0].id]
      );
      
      res.json({ 
        data: { 
          message: 'Cart item updated',
          cart_item: updateResult.rows[0],
          product: product
        }, 
        error: null 
      });
    } else {
      // Insert new cart item
      const insertResult = await pool.query(
        'INSERT INTO cart_items (user_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, product_id, quantity, product.price]
      );
      
      res.json({ 
        data: { 
          message: 'Item added to cart',
          cart_item: insertResult.rows[0],
          product: product
        }, 
        error: null 
      });
    }
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// Update cart item quantity
app.put('/api/cart/:product_id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Fixed: use req.user.id instead of req.user.userId
    const { product_id } = req.params;
    const { quantity } = req.body;
    
    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }
    
    const result = await pool.query(
      'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE user_id = $2 AND product_id = $3 RETURNING *',
      [quantity, userId, product_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

// Remove item from cart
app.delete('/api/cart/:product_id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Fixed: use req.user.id instead of req.user.userId
    const { product_id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2 RETURNING *',
      [userId, product_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    
    res.json({ data: { message: 'Item removed from cart' }, error: null });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
});

// Clear entire cart
app.delete('/api/cart', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Fixed: use req.user.id instead of req.user.userId
    
    const result = await pool.query(
      'DELETE FROM cart_items WHERE user_id = $1',
      [userId]
    );
    
    res.json({ data: { message: 'Cart cleared', items_removed: result.rowCount }, error: null });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

// =============================================
// USER ADDRESSES ROUTES
// =============================================

// Get user addresses
app.get('/api/addresses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT * FROM user_addresses 
       WHERE user_id = $1 
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );
    
    res.json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

// Add new address
app.post('/api/addresses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      type,
      first_name,
      last_name,
      phone,
      address,
      additional_info,
      country,
      county,
      region,
      is_default
    } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !phone || !address || !country) {
      return res.status(400).json({ error: 'Missing required address fields' });
    }

    // If this is set as default, unset other default addresses of the same type
    if (is_default) {
      await pool.query(
        'UPDATE user_addresses SET is_default = false WHERE user_id = $1 AND type = $2',
        [userId, type || 'shipping']
      );
    }

    const result = await pool.query(
      `INSERT INTO user_addresses 
       (user_id, type, first_name, last_name, phone, address, additional_info, 
        country, county, region, is_default) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING *`,
      [userId, type || 'shipping', first_name, last_name, phone, address, 
       additional_info, country, county, region, is_default || false]
    );

    res.json({ 
      data: { 
        message: 'Address added successfully', 
        address: result.rows[0] 
      }, 
      error: null 
    });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({ error: 'Failed to add address' });
  }
});

// Update address
app.put('/api/addresses/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;
    const {
      type,
      first_name,
      last_name,
      phone,
      address,
      additional_info,
      country,
      county,
      region,
      is_default
    } = req.body;

    // Check if address belongs to user
    const checkResult = await pool.query(
      'SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2',
      [addressId, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // If this is set as default, unset other default addresses of the same type
    if (is_default) {
      await pool.query(
        'UPDATE user_addresses SET is_default = false WHERE user_id = $1 AND type = $2 AND id != $3',
        [userId, type || 'shipping', addressId]
      );
    }

    const result = await pool.query(
      `UPDATE user_addresses SET 
       type = $1, first_name = $2, last_name = $3, phone = $4, address = $5, 
       additional_info = $6, country = $7, county = $8, region = $9, 
       is_default = $10, updated_at = NOW()
       WHERE id = $11 AND user_id = $12 
       RETURNING *`,
      [type, first_name, last_name, phone, address, additional_info, 
       country, county, region, is_default, addressId, userId]
    );

    res.json({ 
      data: { 
        message: 'Address updated successfully', 
        address: result.rows[0] 
      }, 
      error: null 
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ error: 'Failed to update address' });
  }
});

// Delete address
app.delete('/api/addresses/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.id;

    const result = await pool.query(
      'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING *',
      [addressId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json({ 
      data: { 
        message: 'Address deleted successfully', 
        deleted_address: result.rows[0] 
      }, 
      error: null 
    });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

// ================== STRIPE PAYMENT ENDPOINTS ==================

// Create payment intent
app.post('/api/stripe/create-payment-intent', authenticateToken, async (req, res) => {
  console.log('=== Payment Intent Request ===');
  console.log('User ID:', req.user.id);
  console.log('Request body:', req.body);
  
  try {
    const { amount, currency = 'usd', cartItems, shippingAddress } = req.body;
    const userId = req.user.id;

    console.log('Extracted data:', {
      amount,
      currency,
      cartItemsCount: cartItems?.length,
      hasShippingAddress: !!shippingAddress,
      userId
    });

    // Validate required fields
    if (!amount || !cartItems || !shippingAddress) {
      console.log('Missing required fields:', {
        amount: !!amount,
        cartItems: !!cartItems,
        shippingAddress: !!shippingAddress
      });
      return res.status(400).json({ error: 'Missing required payment information' });
    }

    console.log('Creating Stripe payment intent...');
    console.log('Amount in cents:', Math.round(amount * 100));

    // Create condensed cart items metadata to stay under Stripe's 500 char limit
    const condensedCartItems = cartItems.map(item => ({
      id: item.id,
      name: item.name.substring(0, 30), // Truncate name to save space
      qty: item.quantity,
      price: item.price
    }));

    // Create condensed shipping address metadata
    const condensedShippingAddress = {
      name: `${shippingAddress.first_name} ${shippingAddress.last_name}`,
      address: shippingAddress.address.substring(0, 50), // Truncate address
      country: shippingAddress.country
    };

    console.log('Condensed cart items length:', JSON.stringify(condensedCartItems).length);
    console.log('Condensed shipping address length:', JSON.stringify(condensedShippingAddress).length);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        userId: userId.toString(),
        cartItems: JSON.stringify(condensedCartItems),
        shippingAddress: JSON.stringify(condensedShippingAddress),
        itemCount: cartItems.length.toString()
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('Payment intent created successfully:', paymentIntent.id);

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('=== Payment Intent Error ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.type) {
      console.error('Stripe error type:', error.type);
      console.error('Stripe error code:', error.code);
    }
    
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Confirm payment and create order
app.post('/api/stripe/confirm-payment', authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.user.id;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Extract metadata (now in condensed format)
    const condensedCartItems = JSON.parse(paymentIntent.metadata.cartItems);
    const condensedShippingAddress = JSON.parse(paymentIntent.metadata.shippingAddress);
    const orderTotal = paymentIntent.amount / 100; // Convert back from cents

    // Fetch current cart items from database to get complete product details
    const cartResult = await pool.query(`
      SELECT
        ci.quantity,
        ci.unit_price,
        p.id as product_id,
        p.name as product_name,
        p.image as product_image
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = $1 AND p.is_active = true
      ORDER BY ci.created_at DESC
    `, [userId]);

    const cartItems = cartResult.rows;

    // Fetch user's shipping address from database
    const addressResult = await pool.query(
      'SELECT * FROM user_addresses WHERE user_id = $1 AND type = $2 AND is_default = true',
      [userId, 'shipping']
    );

    if (addressResult.rows.length === 0) {
      return res.status(400).json({ error: 'No shipping address found' });
    }

    const shippingAddress = addressResult.rows[0];

    // Create order in database
    const orderResult = await pool.query(
      `INSERT INTO orders (
        user_id, total_amount, subtotal, payment_intent_id, shipping_address, status,
        shipping_first_name, shipping_last_name, shipping_phone, shipping_address_line_1,
        shipping_city, shipping_state, shipping_postal_code, shipping_country,
        billing_first_name, billing_last_name, billing_phone, billing_address_line_1,
        billing_city, billing_state, billing_postal_code, billing_country,
        created_at
       )
       VALUES ($1, $2, $3, $4, $5, 'processing', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW()) RETURNING *`,
      [
        userId,
        orderTotal,
        orderTotal,
        paymentIntentId,
        JSON.stringify(shippingAddress),
        // Shipping address fields
        shippingAddress.first_name,
        shippingAddress.last_name,
        shippingAddress.phone,
        shippingAddress.address,
        shippingAddress.region || 'N/A',
        shippingAddress.county || 'N/A',
        '00000', // Default postal code
        shippingAddress.country,
        // Billing address fields (using shipping address as billing for now)
        shippingAddress.first_name,
        shippingAddress.last_name,
        shippingAddress.phone,
        shippingAddress.address,
        shippingAddress.region || 'N/A',
        shippingAddress.county || 'N/A',
        '00000', // Default postal code
        shippingAddress.country
      ]
    );

    const orderId = orderResult.rows[0].id;

    // Insert order items using data from database
    for (const item of cartItems) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, product_name, product_image)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orderId, item.product_id, item.quantity, item.unit_price, (item.unit_price * item.quantity), item.product_name, item.product_image]
      );
    }

    // Clear user's cart
    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

    res.json({
      success: true,
      orderId: orderId,
      order: orderResult.rows[0]
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Get order details
app.get('/api/orders/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    // Get order with items
    const orderResult = await pool.query(
      `SELECT o.*, 
       json_agg(
         json_build_object(
           'id', oi.id,
           'product_id', oi.product_id,
           'quantity', oi.quantity,
           'price', oi.unit_price,
           'product_name', oi.product_name,
           'product_image', oi.product_image
         )
       ) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.id = $1 AND o.user_id = $2
       GROUP BY o.id`,
      [orderId, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order: orderResult.rows[0] });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Get user's orders
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const ordersResult = await pool.query(
      `SELECT o.*, 
       json_agg(
         json_build_object(
           'id', oi.id,
           'product_id', oi.product_id,
           'quantity', oi.quantity,
           'price', oi.unit_price,
           'product_name', oi.product_name,
           'product_image', oi.product_image
         )
       ) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userId]
    );

    res.json({ orders: ordersResult.rows });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Admin: Get all orders for delivery management
app.get('/api/admin/orders', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, search, limit = 50, offset = 0 } = req.query;

    let whereClause = '';
    let queryParams = [];
    let paramIndex = 1;

    // Add status filter
    if (status && status !== 'all') {
      whereClause += ` WHERE o.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    // Add search filter (order number, customer name, email)
    if (search) {
      const searchCondition = whereClause ? ' AND' : ' WHERE';
      whereClause += `${searchCondition} (
        o.order_number ILIKE $${paramIndex} OR 
        CONCAT(o.shipping_first_name, ' ', o.shipping_last_name) ILIKE $${paramIndex} OR
        u.email ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Add limit and offset
    queryParams.push(parseInt(limit));
    queryParams.push(parseInt(offset));

    const ordersResult = await pool.query(
      `SELECT 
         o.id,
         o.order_number,
         o.status,
         o.total_amount as total,
         o.created_at as order_date,
         o.tracking_number,
         o.shipped_at,
         o.delivered_at,
         CONCAT(o.shipping_first_name, ' ', o.shipping_last_name) as customer_name,
         u.email as customer_email,
         u.phone as customer_phone,
         json_build_object(
           'street', CONCAT(o.shipping_address_line_1, COALESCE(' ' || o.shipping_address_line_2, '')),
           'city', o.shipping_city,
           'state', o.shipping_state,
           'zipCode', o.shipping_postal_code,
           'country', o.shipping_country
         ) as address,
         json_agg(
           json_build_object(
             'id', oi.id,
             'name', oi.product_name,
             'quantity', oi.quantity,
             'price', oi.unit_price
           )
         ) as items
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       ${whereClause}
       GROUP BY o.id, u.email, u.phone
       ORDER BY o.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );

    // Get total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT o.id) as total
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ${whereClause}`,
      queryParams.slice(0, -2) // Remove limit and offset for count query
    );

    res.json({ 
      orders: ordersResult.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Admin: Update order status
app.put('/api/admin/orders/:orderId/status', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { orderId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Update timestamps based on status
    let updateFields = 'status = $1, updated_at = NOW()';
    const params = [status, orderId];
    
    if (status === 'shipped') {
      updateFields += ', shipped_at = NOW()';
    } else if (status === 'delivered') {
      updateFields += ', delivered_at = NOW()';
    }

    const result = await pool.query(
      `UPDATE orders SET ${updateFields} WHERE id = $2 RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order: result.rows[0] });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Admin: Update order tracking information
app.put('/api/admin/orders/:orderId/tracking', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { orderId } = req.params;
    const { tracking_number, carrier, estimated_delivery } = req.body;

    const result = await pool.query(
      `UPDATE orders 
       SET tracking_number = $1, 
           admin_notes = COALESCE(admin_notes, '') || CASE 
             WHEN $2 IS NOT NULL THEN E'\nCarrier: ' || $2 
             ELSE '' 
           END ||
           CASE 
             WHEN $3 IS NOT NULL THEN E'\nEstimated Delivery: ' || $3 
             ELSE '' 
           END,
           updated_at = NOW()
       WHERE id = $4 
       RETURNING *`,
      [tracking_number, carrier, estimated_delivery, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order: result.rows[0] });
  } catch (error) {
    console.error('Error updating tracking info:', error);
    res.status(500).json({ error: 'Failed to update tracking information' });
  }
});

// Admin: Get all users (excluding the current logged-in user)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const currentUserId = req.user.id;

    // Get all users except the current logged-in user
    const usersResult = await pool.query(
      `SELECT 
         u.id,
         u.email,
         u.first_name,
         u.last_name,
         u.role,
         u.created_at,
         u.updated_at,
         COUNT(o.id) as orders_count,
         MAX(o.created_at) as last_order_date,
         COALESCE(SUM(o.total_amount), 0) as total_spent
       FROM users u
       LEFT JOIN orders o ON u.id = o.user_id
       WHERE u.id != $1
       GROUP BY u.id, u.email, u.first_name, u.last_name, u.role, u.created_at, u.updated_at
       ORDER BY u.created_at DESC`,
      [currentUserId]
    );

    const users = usersResult.rows.map(user => ({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      status: 'active', // We can add this field to the database later if needed
      lastLogin: user.last_order_date || user.created_at, // Using last order as proxy for activity
      ordersCount: parseInt(user.orders_count),
      totalSpent: parseFloat(user.total_spent),
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));

    res.json({ 
      users: users,
      total: users.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin: Update user role
app.put('/api/admin/users/:userId/role', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { role } = req.body;
    const currentUserId = req.user.id;

    // Prevent changing own role
    if (userId === currentUserId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    // Validate role
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, first_name, last_name, role',
      [role, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'User role updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// =============================================
// BANNERS/CAROUSEL ROUTES
// =============================================

// Get all active banners for public display (homepage carousel)
app.get('/api/banners', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        title,
        subtitle,
        description,
        image_url,
        button_text,
        button_link,
        background_color,
        text_color,
        display_order
      FROM banners 
      WHERE is_active = true 
      ORDER BY display_order ASC, created_at DESC
    `);

    res.json({
      data: result.rows,
      error: null
    });
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ data: [], error: 'Failed to fetch banners' });
  }
});

// =============================================
// ADMIN BANNERS ROUTES
// =============================================

// Get all banners for admin management
app.get('/api/admin/banners', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, limit = 50, offset = 0 } = req.query;

    let whereClause = '';
    let queryParams = [];
    let paramIndex = 1;

    // Filter by status if specified
    if (status && status !== 'all') {
      const isActive = status === 'active';
      whereClause = 'WHERE is_active = $1';
      queryParams.push(isActive);
      paramIndex++;
    }

    // Add limit and offset
    queryParams.push(parseInt(limit));
    queryParams.push(parseInt(offset));

    const result = await pool.query(`
      SELECT 
        b.*,
        u.first_name as created_by_name
      FROM banners b
      LEFT JOIN users u ON b.created_by = u.id
      ${whereClause}
      ORDER BY b.display_order ASC, b.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, queryParams);

    // Get total count for pagination
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM banners ${whereClause}
    `, queryParams.slice(0, -2));

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset),
      error: null
    });
  } catch (error) {
    console.error('Error fetching admin banners:', error);
    res.status(500).json({ data: [], error: 'Failed to fetch banners' });
  }
});

// Create new banner
app.post('/api/admin/banners', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      title,
      subtitle,
      description,
      image_url,
      button_text,
      button_link,
      display_order,
      is_active,
      background_color,
      text_color
    } = req.body;

    // Validate required fields
    if (!title || !image_url) {
      return res.status(400).json({ error: 'Title and image URL are required' });
    }

    // If no display_order provided, set it to be last
    let finalDisplayOrder = display_order;
    if (finalDisplayOrder === undefined || finalDisplayOrder === null) {
      const maxOrderResult = await pool.query('SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM banners');
      finalDisplayOrder = maxOrderResult.rows[0].next_order;
    }

    const result = await pool.query(`
      INSERT INTO banners (
        title, subtitle, description, image_url, button_text, button_link,
        display_order, is_active, background_color, text_color, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      title,
      subtitle || null,
      description || null,
      image_url,
      button_text || null,
      button_link || null,
      finalDisplayOrder,
      is_active !== false, // Default to true if not specified
      background_color || '#ffffff',
      text_color || '#000000',
      req.user.id
    ]);

    res.json({
      data: result.rows[0],
      message: 'Banner created successfully',
      error: null
    });
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({ error: 'Failed to create banner' });
  }
});

// Update banner
app.put('/api/admin/banners/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const {
      title,
      subtitle,
      description,
      image_url,
      button_text,
      button_link,
      display_order,
      is_active,
      background_color,
      text_color
    } = req.body;

    // Validate required fields
    if (!title || !image_url) {
      return res.status(400).json({ error: 'Title and image URL are required' });
    }

    const result = await pool.query(`
      UPDATE banners SET 
        title = $1,
        subtitle = $2,
        description = $3,
        image_url = $4,
        button_text = $5,
        button_link = $6,
        display_order = $7,
        is_active = $8,
        background_color = $9,
        text_color = $10,
        updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `, [
      title,
      subtitle || null,
      description || null,
      image_url,
      button_text || null,
      button_link || null,
      display_order || 0,
      is_active !== false,
      background_color || '#ffffff',
      text_color || '#000000',
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    res.json({
      data: result.rows[0],
      message: 'Banner updated successfully',
      error: null
    });
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({ error: 'Failed to update banner' });
  }
});

// Delete banner
app.delete('/api/admin/banners/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    const result = await pool.query('DELETE FROM banners WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    res.json({
      data: result.rows[0],
      message: 'Banner deleted successfully',
      error: null
    });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});

// Update banner status (activate/deactivate)
app.patch('/api/admin/banners/:id/status', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean value' });
    }

    const result = await pool.query(`
      UPDATE banners SET 
        is_active = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    res.json({
      data: result.rows[0],
      message: `Banner ${is_active ? 'activated' : 'deactivated'} successfully`,
      error: null
    });
  } catch (error) {
    console.error('Error updating banner status:', error);
    res.status(500).json({ error: 'Failed to update banner status' });
  }
});

// Reorder banners
app.patch('/api/admin/banners/reorder', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { banners } = req.body; // Array of {id, display_order}

    if (!Array.isArray(banners)) {
      return res.status(400).json({ error: 'Banners must be an array of {id, display_order} objects' });
    }

    // Update each banner's display order
    const updatePromises = banners.map(banner => {
      return pool.query(
        'UPDATE banners SET display_order = $1, updated_at = NOW() WHERE id = $2',
        [banner.display_order, banner.id]
      );
    });

    await Promise.all(updatePromises);

    // Return updated banners in new order
    const result = await pool.query(`
      SELECT * FROM banners 
      ORDER BY display_order ASC, created_at DESC
    `);

    res.json({
      data: result.rows,
      message: 'Banner order updated successfully',
      error: null
    });
  } catch (error) {
    console.error('Error reordering banners:', error);
    res.status(500).json({ error: 'Failed to reorder banners' });
  }
});

// Upload banner image
app.post('/api/admin/banners/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    // Return the relative path that can be used in the frontend
    const imagePath = `/uploads/products/${req.file.filename}`;
    
    console.log('Banner image uploaded successfully:', {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: imagePath,
      size: req.file.size
    });

    res.json({
      success: true,
      image_url: imagePath,
      filename: req.file.filename,
      message: 'Banner image uploaded successfully'
    });
  } catch (error) {
    console.error('Banner image upload error:', error);
    res.status(500).json({ error: 'Failed to upload banner image' });
  }
});

// Get banner statistics for admin dashboard
app.get('/api/admin/banners/stats', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_banners,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_banners,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_banners,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_banners
      FROM banners
    `);

    res.json({
      data: result.rows[0],
      error: null
    });
  } catch (error) {
    console.error('Error fetching banner stats:', error);
    res.status(500).json({ data: null, error: 'Failed to fetch banner statistics' });
  }
});

// =============================================
// TESTIMONIALS ROUTES
// =============================================

// Get all approved testimonials (public endpoint)
app.get('/api/testimonials', async (req, res) => {
  try {
    const { product_id, rating, limit = 50, offset = 0, featured_only = false } = req.query;
    
    let whereClause = "WHERE t.status = 'approved'";
    let queryParams = [];
    let paramIndex = 1;

    // Filter by product if specified
    if (product_id) {
      whereClause += ` AND t.product_id = $${paramIndex}`;
      queryParams.push(product_id);
      paramIndex++;
    }

    // Filter by rating if specified
    if (rating) {
      whereClause += ` AND t.rating = $${paramIndex}`;
      queryParams.push(parseInt(rating));
      paramIndex++;
    }

    // Filter featured only if specified
    if (featured_only === 'true') {
      whereClause += ` AND t.is_featured = true`;
    }

    // Add limit and offset
    queryParams.push(parseInt(limit));
    queryParams.push(parseInt(offset));

    const result = await pool.query(`
      SELECT 
        t.id,
        t.title,
        t.message,
        t.rating,
        t.is_verified_purchase,
        t.is_featured,
        t.created_at,
        t.product_id,
        CONCAT(u.first_name, ' ', u.last_name) as customer_name,
        u.first_name,
        p.name as product_name,
        p.image as product_image
      FROM testimonials t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN products p ON t.product_id = p.id
      ${whereClause}
      ORDER BY t.is_featured DESC, t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, queryParams);

    // Get total count for pagination
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM testimonials t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN products p ON t.product_id = p.id
      ${whereClause}
    `, queryParams.slice(0, -2));

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset),
      error: null
    });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    res.status(500).json({ data: [], error: 'Failed to fetch testimonials' });
  }
});

// Get testimonials for a specific product
app.get('/api/products/:productId/testimonials', async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT 
        t.id,
        t.title,
        t.message,
        t.rating,
        t.is_verified_purchase,
        t.is_featured,
        t.created_at,
        CONCAT(u.first_name, ' ', u.last_name) as customer_name,
        u.first_name
      FROM testimonials t
      JOIN users u ON t.user_id = u.id
      WHERE t.product_id = $1 AND t.status = 'approved'
      ORDER BY t.is_featured DESC, t.created_at DESC
      LIMIT $2 OFFSET $3
    `, [productId, parseInt(limit), parseInt(offset)]);

    // Get rating statistics for this product
    const statsResult = await pool.query(`
      SELECT 
        AVG(rating)::numeric(3,2) as average_rating,
        COUNT(*) as total_reviews,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM testimonials 
      WHERE product_id = $1 AND status = 'approved'
    `, [productId]);

    res.json({
      data: result.rows,
      stats: statsResult.rows[0],
      error: null
    });
  } catch (error) {
    console.error('Error fetching product testimonials:', error);
    res.status(500).json({ data: [], error: 'Failed to fetch product testimonials' });
  }
});

// Submit a new testimonial (authenticated users only)
app.post('/api/testimonials', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, message, rating, product_id } = req.body;

    // Validate required fields
    if (!title || !message || !rating) {
      return res.status(400).json({ error: 'Title, message, and rating are required' });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if user has already reviewed this product (if product_id is provided)
    if (product_id) {
      const existingReview = await pool.query(
        'SELECT id FROM testimonials WHERE user_id = $1 AND product_id = $2',
        [userId, product_id]
      );

      if (existingReview.rows.length > 0) {
        return res.status(400).json({ error: 'You have already reviewed this product' });
      }

      // Check if user has purchased this product (for verified purchase badge)
      const purchaseCheck = await pool.query(`
        SELECT COUNT(*) as count
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.user_id = $1 AND oi.product_id = $2 AND o.status IN ('delivered', 'completed')
      `, [userId, product_id]);

      const isVerifiedPurchase = parseInt(purchaseCheck.rows[0].count) > 0;

      // Insert testimonial
      const result = await pool.query(`
        INSERT INTO testimonials (user_id, product_id, title, message, rating, is_verified_purchase)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [userId, product_id, title, message, rating, isVerifiedPurchase]);

      res.json({
        data: result.rows[0],
        message: 'Testimonial submitted successfully and is pending approval',
        error: null
      });
    } else {
      // General testimonial (not product-specific)
      const result = await pool.query(`
        INSERT INTO testimonials (user_id, title, message, rating)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [userId, title, message, rating]);

      res.json({
        data: result.rows[0],
        message: 'Testimonial submitted successfully and is pending approval',
        error: null
      });
    }
  } catch (error) {
    console.error('Error submitting testimonial:', error);
    res.status(500).json({ error: 'Failed to submit testimonial' });
  }
});

// Get user's own testimonials
app.get('/api/user/testimonials', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        t.*,
        p.name as product_name,
        p.image as product_image
      FROM testimonials t
      LEFT JOIN products p ON t.product_id = p.id
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC
    `, [userId]);

    res.json({
      data: result.rows,
      error: null
    });
  } catch (error) {
    console.error('Error fetching user testimonials:', error);
    res.status(500).json({ data: [], error: 'Failed to fetch your testimonials' });
  }
});

// Update user's own testimonial (only if pending)
app.put('/api/user/testimonials/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, message, rating } = req.body;

    // Check if testimonial exists and belongs to user
    const checkResult = await pool.query(
      'SELECT status FROM testimonials WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }

    if (checkResult.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Can only edit pending testimonials' });
    }

    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const result = await pool.query(`
      UPDATE testimonials 
      SET title = COALESCE($1, title),
          message = COALESCE($2, message),
          rating = COALESCE($3, rating),
          updated_at = NOW()
      WHERE id = $4 AND user_id = $5
      RETURNING *
    `, [title, message, rating, id, userId]);

    res.json({
      data: result.rows[0],
      message: 'Testimonial updated successfully',
      error: null
    });
  } catch (error) {
    console.error('Error updating testimonial:', error);
    res.status(500).json({ error: 'Failed to update testimonial' });
  }
});

// Delete user's own testimonial (only if pending)
app.delete('/api/user/testimonials/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check if testimonial exists and belongs to user
    const checkResult = await pool.query(
      'SELECT status FROM testimonials WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }

    if (checkResult.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Can only delete pending testimonials' });
    }

    await pool.query('DELETE FROM testimonials WHERE id = $1 AND user_id = $2', [id, userId]);

    res.json({
      message: 'Testimonial deleted successfully',
      error: null
    });
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    res.status(500).json({ error: 'Failed to delete testimonial' });
  }
});

// Get testimonial statistics (public endpoint)
app.get('/api/testimonials/stats', async (req, res) => {
  try {
    const { product_id } = req.query;

    let whereClause = "WHERE status = 'approved'";
    let queryParams = [];

    if (product_id) {
      whereClause += " AND product_id = $1";
      queryParams.push(product_id);
    }

    const result = await pool.query(`
      SELECT 
        AVG(rating)::numeric(3,2) as average_rating,
        COUNT(*) as total_reviews,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star,
        COUNT(CASE WHEN is_verified_purchase = true THEN 1 END) as verified_purchases
      FROM testimonials 
      ${whereClause}
    `, queryParams);

    res.json({
      data: result.rows[0],
      error: null
    });
  } catch (error) {
    console.error('Error fetching testimonial stats:', error);
    res.status(500).json({ data: null, error: 'Failed to fetch testimonial statistics' });
  }
});

// =============================================
// ADMIN TESTIMONIALS ROUTES
// =============================================

// Get all testimonials for admin management
app.get('/api/admin/testimonials', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, rating, product_id, search, limit = 50, offset = 0 } = req.query;

    let whereClause = '';
    let queryParams = [];
    let paramIndex = 1;

    // Filter by status
    if (status && status !== 'all') {
      whereClause += ` WHERE t.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    // Filter by rating
    if (rating) {
      const condition = whereClause ? ' AND' : ' WHERE';
      whereClause += `${condition} t.rating = $${paramIndex}`;
      queryParams.push(parseInt(rating));
      paramIndex++;
    }

    // Filter by product
    if (product_id) {
      const condition = whereClause ? ' AND' : ' WHERE';
      whereClause += `${condition} t.product_id = $${paramIndex}`;
      queryParams.push(product_id);
      paramIndex++;
    }

    // Search functionality
    if (search) {
      const condition = whereClause ? ' AND' : ' WHERE';
      whereClause += `${condition} (
        t.title ILIKE $${paramIndex} OR 
        t.message ILIKE $${paramIndex} OR
        CONCAT(u.first_name, ' ', u.last_name) ILIKE $${paramIndex} OR
        p.name ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Add limit and offset
    queryParams.push(parseInt(limit));
    queryParams.push(parseInt(offset));

    const result = await pool.query(`
      SELECT 
        t.id,
        t.title,
        t.message,
        t.rating,
        t.status,
        t.is_verified_purchase,
        t.is_featured,
        t.admin_notes,
        t.created_at,
        t.updated_at,
        t.approved_at,
        CONCAT(u.first_name, ' ', u.last_name) as customer_name,
        u.email as customer_email,
        t.product_id,
        p.name as product_name,
        p.image as product_image,
        approver.first_name as approved_by_name
      FROM testimonials t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN products p ON t.product_id = p.id
      LEFT JOIN users approver ON t.approved_by = approver.id
      ${whereClause}
      ORDER BY 
        CASE t.status 
          WHEN 'pending' THEN 1 
          WHEN 'approved' THEN 2 
          WHEN 'rejected' THEN 3 
        END,
        t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, queryParams);

    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM testimonials t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN products p ON t.product_id = p.id
      ${whereClause}
    `, queryParams.slice(0, -2));

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset),
      error: null
    });
  } catch (error) {
    console.error('Error fetching admin testimonials:', error);
    res.status(500).json({ data: [], error: 'Failed to fetch testimonials' });
  }
});

// Update testimonial status (approve/reject)
app.patch('/api/admin/testimonials/:id/status', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const adminId = req.user.id;

    // Validate status
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be approved, rejected, or pending' });
    }

    let updateFields = 'status = $1, updated_at = NOW()';
    let queryParams = [status, id];
    let paramIndex = 3;

    // Add admin notes if provided
    if (admin_notes !== undefined) {
      updateFields += `, admin_notes = $${paramIndex}`;
      queryParams.splice(-1, 0, admin_notes);
      paramIndex++;
    }

    // Set approval timestamp and admin if approving
    if (status === 'approved') {
      updateFields += `, approved_at = NOW(), approved_by = $${paramIndex}`;
      queryParams.splice(-1, 0, adminId);
    } else if (status === 'rejected' || status === 'pending') {
      updateFields += ', approved_at = NULL, approved_by = NULL';
    }

    const result = await pool.query(`
      UPDATE testimonials 
      SET ${updateFields}
      WHERE id = $${queryParams.length}
      RETURNING *
    `, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }

    res.json({
      data: result.rows[0],
      message: `Testimonial ${status} successfully`,
      error: null
    });
  } catch (error) {
    console.error('Error updating testimonial status:', error);
    res.status(500).json({ error: 'Failed to update testimonial status' });
  }
});

// Toggle featured status
app.patch('/api/admin/testimonials/:id/featured', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { is_featured } = req.body;

    const result = await pool.query(`
      UPDATE testimonials 
      SET is_featured = $1, updated_at = NOW()
      WHERE id = $2 AND status = 'approved'
      RETURNING *
    `, [is_featured, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Testimonial not found or not approved' });
    }

    res.json({
      data: result.rows[0],
      message: `Testimonial ${is_featured ? 'featured' : 'unfeatured'} successfully`,
      error: null
    });
  } catch (error) {
    console.error('Error updating featured status:', error);
    res.status(500).json({ error: 'Failed to update featured status' });
  }
});

// Delete testimonial (admin only)
app.delete('/api/admin/testimonials/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    const result = await pool.query('DELETE FROM testimonials WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }

    res.json({
      data: result.rows[0],
      message: 'Testimonial deleted successfully',
      error: null
    });
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    res.status(500).json({ error: 'Failed to delete testimonial' });
  }
});

// Get admin testimonial dashboard stats
app.get('/api/admin/testimonials/dashboard', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get overall statistics
    const overallStats = await pool.query(`
      SELECT 
        COUNT(*) as total_testimonials,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN is_featured = true THEN 1 END) as featured_count,
        AVG(rating)::numeric(3,2) as average_rating,
        COUNT(CASE WHEN is_verified_purchase = true THEN 1 END) as verified_purchases
      FROM testimonials
    `);

    // Get recent testimonials (last 30 days)
    const recentStats = await pool.query(`
      SELECT 
        COUNT(*) as recent_total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as recent_pending
      FROM testimonials 
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

    // Get rating distribution
    const ratingDistribution = await pool.query(`
      SELECT 
        rating,
        COUNT(*) as count
      FROM testimonials 
      WHERE status = 'approved'
      GROUP BY rating
      ORDER BY rating DESC
    `);

    // Get top products by testimonial count
    const topProducts = await pool.query(`
      SELECT 
        p.id,
        p.name,
        COUNT(t.id) as testimonial_count,
        AVG(t.rating)::numeric(3,2) as average_rating
      FROM products p
      LEFT JOIN testimonials t ON p.id = t.product_id AND t.status = 'approved'
      GROUP BY p.id, p.name
      HAVING COUNT(t.id) > 0
      ORDER BY testimonial_count DESC, average_rating DESC
      LIMIT 10
    `);

    res.json({
      data: {
        overall: overallStats.rows[0],
        recent: recentStats.rows[0],
        rating_distribution: ratingDistribution.rows,
        top_products: topProducts.rows
      },
      error: null
    });
  } catch (error) {
    console.error('Error fetching testimonial dashboard:', error);
    res.status(500).json({ data: null, error: 'Failed to fetch dashboard statistics' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
