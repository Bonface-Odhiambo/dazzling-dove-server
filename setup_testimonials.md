# 🚀 Testimonials System Setup Guide

## Quick Start

### 1. Database Migration
First, run the database migration to create the testimonials table:

```sql
-- Connect to your PostgreSQL database and run:
\i database/migrate_testimonials.sql
```

Or copy and paste the contents of `database/migrate_testimonials.sql` into your database client.

### 2. Verify Database Setup
Check that the table was created successfully:

```sql
-- Verify testimonials table exists
\dt testimonials

-- Check table structure
\d testimonials

-- Verify indexes were created
\di testimonials*
```

### 3. Start Your Server
Make sure your API server is running:

```bash
npm start
# or
node api-server.js
```

### 4. Test the Endpoints

#### Option A: Use the Test Script
```bash
# Install node-fetch if not already installed
npm install node-fetch

# Run the comprehensive test suite
node test_testimonials.js
```

#### Option B: Manual Testing with curl

**Test public endpoint:**
```bash
curl http://localhost:3000/api/testimonials
```

**Test statistics:**
```bash
curl http://localhost:3000/api/testimonials/stats
```

**Submit a testimonial (requires authentication):**
```bash
# First, sign in to get a token
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'

# Then submit testimonial (replace YOUR_TOKEN with actual token)
curl -X POST http://localhost:3000/api/testimonials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Great product!",
    "message": "Really love this product. Excellent quality!",
    "rating": 5
  }'
```

## 📋 Frontend Integration Checklist

Your frontend should now work seamlessly with these endpoints:

### ✅ Public Pages
- [ ] `/testimonials` page displays all approved testimonials
- [ ] Product pages show product-specific reviews
- [ ] Rating statistics display correctly
- [ ] Filtering by rating works
- [ ] Pagination works for large datasets

### ✅ User Features
- [ ] Users can submit new testimonials
- [ ] Users can view their own testimonials
- [ ] Users can edit pending testimonials
- [ ] Verified purchase badges appear correctly
- [ ] Form validation works (rating 1-5, required fields)

### ✅ Admin Panel
- [ ] Admin can view all testimonials with filters
- [ ] Admin can approve/reject testimonials
- [ ] Admin can toggle featured status
- [ ] Admin can search testimonials
- [ ] Dashboard statistics display correctly
- [ ] Admin can delete testimonials

## 🔧 Configuration Notes

### Environment Variables
Make sure these are set in your `.env` file:
```env
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
PORT=3000
```

### CORS Settings
The API includes CORS settings for:
- `http://localhost:8080`
- `https://selta-magic-fe.onrender.com`
- `http://localhost:3000`

Add your frontend URL if different.

## 📊 API Endpoints Summary

### Public Endpoints
- `GET /api/testimonials` - Get approved testimonials
- `GET /api/products/:id/testimonials` - Product-specific testimonials
- `GET /api/testimonials/stats` - Statistics

### User Endpoints (Authenticated)
- `POST /api/testimonials` - Submit testimonial
- `GET /api/user/testimonials` - Get own testimonials
- `PUT /api/user/testimonials/:id` - Update own testimonial
- `DELETE /api/user/testimonials/:id` - Delete own testimonial

### Admin Endpoints (Admin Role Required)
- `GET /api/admin/testimonials` - Admin management
- `PATCH /api/admin/testimonials/:id/status` - Approve/reject
- `PATCH /api/admin/testimonials/:id/featured` - Toggle featured
- `DELETE /api/admin/testimonials/:id` - Delete testimonial
- `GET /api/admin/testimonials/dashboard` - Dashboard stats

## 🐛 Troubleshooting

### Common Issues

**1. Database connection errors:**
- Verify your `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Check database permissions

**2. Authentication errors:**
- Verify JWT_SECRET is set
- Check token format in Authorization header
- Ensure user has correct role for admin endpoints

**3. CORS errors:**
- Add your frontend URL to CORS configuration
- Check that credentials are included in requests

**4. Validation errors:**
- Rating must be 1-5
- Title and message are required
- Product ID must exist if provided

### Database Queries for Debugging

**Check testimonials:**
```sql
SELECT * FROM testimonials ORDER BY created_at DESC LIMIT 10;
```

**Check user permissions:**
```sql
SELECT id, email, role FROM users WHERE email = 'your-email@example.com';
```

**Check product associations:**
```sql
SELECT t.*, p.name as product_name 
FROM testimonials t 
LEFT JOIN products p ON t.product_id = p.id;
```

## 🎯 Next Steps

1. **Run the migration** to create the database table
2. **Test the endpoints** using the provided test script
3. **Verify frontend integration** works as expected
4. **Add sample data** if needed for demonstration
5. **Deploy** when ready!

Your testimonials system is now fully implemented and ready for production use! 🚀
