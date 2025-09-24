# Testimonials API Documentation

## Overview
Complete testimonial/review system API endpoints that align with your frontend implementation. This system supports product-specific and general testimonials with admin approval workflow.

## Database Schema
The testimonials table includes:
- User authentication and verification
- Product-specific or general reviews
- 1-5 star rating system
- Admin approval workflow (pending/approved/rejected)
- Verified purchase badges
- Featured testimonials
- Admin notes and audit trail

## Public Endpoints (No Authentication Required)

### 1. Get All Approved Testimonials
```
GET /api/testimonials
```

**Query Parameters:**
- `product_id` (optional) - Filter by specific product
- `rating` (optional) - Filter by rating (1-5)
- `featured_only` (optional) - Set to 'true' for featured only
- `limit` (optional) - Default: 50
- `offset` (optional) - Default: 0

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Great product!",
      "message": "Really loved this product...",
      "rating": 5,
      "is_verified_purchase": true,
      "is_featured": false,
      "created_at": "2024-01-01T00:00:00Z",
      "product_id": "uuid",
      "customer_name": "John Doe",
      "first_name": "John",
      "product_name": "Product Name",
      "product_image": "/uploads/products/image.jpg"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0,
  "error": null
}
```

### 2. Get Product-Specific Testimonials
```
GET /api/products/:productId/testimonials
```

**Query Parameters:**
- `limit` (optional) - Default: 20
- `offset` (optional) - Default: 0

**Response:**
```json
{
  "data": [...testimonials],
  "stats": {
    "average_rating": "4.50",
    "total_reviews": 25,
    "five_star": 15,
    "four_star": 8,
    "three_star": 2,
    "two_star": 0,
    "one_star": 0
  },
  "error": null
}
```

### 3. Get Testimonial Statistics
```
GET /api/testimonials/stats
```

**Query Parameters:**
- `product_id` (optional) - Get stats for specific product

**Response:**
```json
{
  "data": {
    "average_rating": "4.25",
    "total_reviews": 150,
    "five_star": 75,
    "four_star": 45,
    "three_star": 20,
    "two_star": 8,
    "one_star": 2,
    "verified_purchases": 120
  },
  "error": null
}
```

## User Endpoints (Authentication Required)

### 4. Submit New Testimonial
```
POST /api/testimonials
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "title": "Amazing product!",
  "message": "This product exceeded my expectations...",
  "rating": 5,
  "product_id": "uuid" // Optional - for product-specific reviews
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "product_id": "uuid",
    "title": "Amazing product!",
    "message": "This product exceeded my expectations...",
    "rating": 5,
    "status": "pending",
    "is_verified_purchase": true,
    "is_featured": false,
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "Testimonial submitted successfully and is pending approval",
  "error": null
}
```

### 5. Get User's Own Testimonials
```
GET /api/user/testimonials
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Great product",
      "message": "Really loved it",
      "rating": 5,
      "status": "approved",
      "is_verified_purchase": true,
      "is_featured": false,
      "created_at": "2024-01-01T00:00:00Z",
      "product_name": "Product Name",
      "product_image": "/uploads/products/image.jpg"
    }
  ],
  "error": null
}
```

### 6. Update User's Own Testimonial
```
PUT /api/user/testimonials/:id
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "title": "Updated title",
  "message": "Updated message",
  "rating": 4
}
```

**Note:** Only pending testimonials can be edited.

### 7. Delete User's Own Testimonial
```
DELETE /api/user/testimonials/:id
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Note:** Only pending testimonials can be deleted.

## Admin Endpoints (Admin Authentication Required)

### 8. Get All Testimonials (Admin Management)
```
GET /api/admin/testimonials
```

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Query Parameters:**
- `status` (optional) - Filter by status: 'pending', 'approved', 'rejected', 'all'
- `rating` (optional) - Filter by rating (1-5)
- `product_id` (optional) - Filter by product
- `search` (optional) - Search in title, message, customer name, product name
- `limit` (optional) - Default: 50
- `offset` (optional) - Default: 0

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Great product",
      "message": "Really loved it",
      "rating": 5,
      "status": "pending",
      "is_verified_purchase": true,
      "is_featured": false,
      "admin_notes": null,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "approved_at": null,
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "product_id": "uuid",
      "product_name": "Product Name",
      "product_image": "/uploads/products/image.jpg",
      "approved_by_name": null
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0,
  "error": null
}
```

### 9. Update Testimonial Status
```
PATCH /api/admin/testimonials/:id/status
```

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Request Body:**
```json
{
  "status": "approved", // 'approved', 'rejected', or 'pending'
  "admin_notes": "Approved - great review" // Optional
}
```

### 10. Toggle Featured Status
```
PATCH /api/admin/testimonials/:id/featured
```

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Request Body:**
```json
{
  "is_featured": true
}
```

**Note:** Only approved testimonials can be featured.

### 11. Delete Testimonial (Admin)
```
DELETE /api/admin/testimonials/:id
```

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

### 12. Get Admin Dashboard Statistics
```
GET /api/admin/testimonials/dashboard
```

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Response:**
```json
{
  "data": {
    "overall": {
      "total_testimonials": "150",
      "pending_count": "25",
      "approved_count": "120",
      "rejected_count": "5",
      "featured_count": "15",
      "average_rating": "4.25",
      "verified_purchases": "130"
    },
    "recent": {
      "recent_total": "20",
      "recent_pending": "8"
    },
    "rating_distribution": [
      {"rating": 5, "count": "75"},
      {"rating": 4, "count": "45"},
      {"rating": 3, "count": "20"},
      {"rating": 2, "count": "8"},
      {"rating": 1, "count": "2"}
    ],
    "top_products": [
      {
        "id": "uuid",
        "name": "Product Name",
        "testimonial_count": "25",
        "average_rating": "4.80"
      }
    ]
  },
  "error": null
}
```

## Key Features

### 1. Verified Purchase System
- Automatically checks if user has purchased the product
- Sets `is_verified_purchase` flag based on order history
- Only considers delivered/completed orders

### 2. Admin Approval Workflow
- All testimonials start as 'pending'
- Admins can approve, reject, or reset to pending
- Approval timestamp and admin tracking
- Admin notes for internal tracking

### 3. Featured Testimonials
- Admins can mark approved testimonials as featured
- Featured testimonials appear first in listings
- Only approved testimonials can be featured

### 4. Comprehensive Filtering
- Filter by product, rating, status
- Search functionality across multiple fields
- Pagination support for all endpoints

### 5. Statistics and Analytics
- Overall and product-specific statistics
- Rating distribution breakdowns
- Recent activity tracking
- Top products by review count

### 6. Security Features
- JWT authentication for user actions
- Admin role verification for admin endpoints
- Users can only edit/delete their own pending testimonials
- Prevents duplicate reviews per product per user

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message description",
  "data": null
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Integration Notes

1. **Frontend Alignment**: These endpoints match your frontend TypeScript interfaces and service methods.

2. **Database Migration**: Run the updated schema.sql to create the testimonials table and indexes.

3. **Existing Data**: The system integrates with your existing users, products, and orders tables.

4. **Performance**: Proper indexing on frequently queried fields (user_id, product_id, status, rating).

5. **Scalability**: Pagination support for all list endpoints to handle large datasets.

This API provides a complete foundation for your testimonial system with all the features your frontend expects!
