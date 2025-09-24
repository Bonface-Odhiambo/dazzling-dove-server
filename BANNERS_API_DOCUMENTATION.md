# Banners/Carousel API Documentation

## Overview
Complete banner management system for hero section/carousel functionality. This system allows admins to create, manage, and organize homepage banners with full customization options.

## Database Schema
The banners table includes:
- Title, subtitle, and description text
- Image URL for banner background
- Call-to-action button with custom text and link
- Display order management
- Active/inactive status control
- Custom background and text colors
- Admin user tracking

## Public Endpoints (No Authentication Required)

### 1. Get Active Banners for Homepage
```
GET /api/banners
```

**Description:** Returns all active banners ordered by display_order for homepage carousel display.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Welcome to Selta Magic!",
      "subtitle": "Discover Amazing Products",
      "description": "Shop our exclusive collection...",
      "image_url": "/uploads/products/banner-1.jpg",
      "button_text": "Shop Now",
      "button_link": "/products",
      "background_color": "#1a202c",
      "text_color": "#ffffff",
      "display_order": 1
    }
  ],
  "error": null
}
```

## Admin Endpoints (Admin Authentication Required)

### 2. Get All Banners (Admin Management)
```
GET /api/admin/banners
```

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Query Parameters:**
- `status` (optional) - Filter by status: 'active', 'inactive', 'all'
- `limit` (optional) - Default: 50
- `offset` (optional) - Default: 0

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Welcome to Selta Magic!",
      "subtitle": "Discover Amazing Products",
      "description": "Shop our exclusive collection...",
      "image_url": "/uploads/products/banner-1.jpg",
      "button_text": "Shop Now",
      "button_link": "/products",
      "display_order": 1,
      "is_active": true,
      "background_color": "#1a202c",
      "text_color": "#ffffff",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "created_by": "uuid",
      "created_by_name": "Admin User"
    }
  ],
  "total": 5,
  "limit": 50,
  "offset": 0,
  "error": null
}
```

### 3. Create New Banner
```
POST /api/admin/banners
```

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Request Body:**
```json
{
  "title": "New Banner Title",
  "subtitle": "Optional subtitle",
  "description": "Detailed description of the banner",
  "image_url": "/uploads/products/banner-image.jpg",
  "button_text": "Call to Action",
  "button_link": "/target-page",
  "display_order": 1,
  "is_active": true,
  "background_color": "#1a202c",
  "text_color": "#ffffff"
}
```

**Required Fields:**
- `title` - Banner main title
- `image_url` - Path to banner image

**Optional Fields:**
- `subtitle` - Secondary text
- `description` - Detailed description
- `button_text` - CTA button text
- `button_link` - CTA button URL
- `display_order` - Order position (auto-assigned if not provided)
- `is_active` - Active status (defaults to true)
- `background_color` - Hex color (defaults to #ffffff)
- `text_color` - Hex color (defaults to #000000)

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "title": "New Banner Title",
    "subtitle": "Optional subtitle",
    "description": "Detailed description...",
    "image_url": "/uploads/products/banner-image.jpg",
    "button_text": "Call to Action",
    "button_link": "/target-page",
    "display_order": 1,
    "is_active": true,
    "background_color": "#1a202c",
    "text_color": "#ffffff",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "created_by": "uuid"
  },
  "message": "Banner created successfully",
  "error": null
}
```

### 4. Update Banner
```
PUT /api/admin/banners/:id
```

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Request Body:** Same as create banner (all fields optional except title and image_url)

**Response:** Same format as create banner

### 5. Delete Banner
```
DELETE /api/admin/banners/:id
```

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "title": "Deleted Banner Title",
    ...
  },
  "message": "Banner deleted successfully",
  "error": null
}
```

### 6. Update Banner Status
```
PATCH /api/admin/banners/:id/status
```

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Request Body:**
```json
{
  "is_active": true
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "is_active": true,
    ...
  },
  "message": "Banner activated successfully",
  "error": null
}
```

### 7. Reorder Banners
```
PATCH /api/admin/banners/reorder
```

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Request Body:**
```json
{
  "banners": [
    {"id": "uuid1", "display_order": 1},
    {"id": "uuid2", "display_order": 2},
    {"id": "uuid3", "display_order": 3}
  ]
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid1",
      "display_order": 1,
      ...
    },
    {
      "id": "uuid2", 
      "display_order": 2,
      ...
    }
  ],
  "message": "Banner order updated successfully",
  "error": null
}
```

### 8. Upload Banner Image
```
POST /api/admin/banners/upload-image
```

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
Content-Type: multipart/form-data
```

**Request Body:**
- `image` (file) - Image file (JPEG, PNG, GIF, WebP)

**File Restrictions:**
- Max size: 5MB
- Allowed types: JPEG, PNG, GIF, WebP

**Response:**
```json
{
  "success": true,
  "image_url": "/uploads/products/1234567890-banner-image.jpg",
  "filename": "1234567890-banner-image.jpg",
  "message": "Banner image uploaded successfully"
}
```

### 9. Get Banner Statistics
```
GET /api/admin/banners/stats
```

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Response:**
```json
{
  "data": {
    "total_banners": "10",
    "active_banners": "7",
    "inactive_banners": "3",
    "recent_banners": "2"
  },
  "error": null
}
```

## Key Features

### 1. **Complete Banner Management**
- Full CRUD operations for banners
- Rich content support (title, subtitle, description)
- Call-to-action buttons with custom text and links
- Image upload and management

### 2. **Display Control**
- Active/inactive status management
- Custom display order with drag-and-drop support
- Automatic ordering for new banners

### 3. **Visual Customization**
- Custom background colors (hex codes)
- Custom text colors for readability
- Responsive image handling

### 4. **Admin Features**
- User tracking (who created each banner)
- Timestamp tracking (created/updated dates)
- Bulk reordering capabilities
- Statistics dashboard

### 5. **Security & Validation**
- Admin-only access for management endpoints
- File upload validation and size limits
- Required field validation
- Proper error handling

## Frontend Integration

### Homepage Carousel
```javascript
// Fetch active banners for homepage
const response = await fetch('/api/banners');
const { data: banners } = await response.json();

// Display in carousel/slider component
banners.forEach(banner => {
  // Use banner.image_url, banner.title, banner.subtitle, etc.
});
```

### Admin Panel
```javascript
// Get all banners for admin management
const response = await fetch('/api/admin/banners', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});

// Create new banner
const newBanner = await fetch('/api/admin/banners', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(bannerData)
});

// Upload banner image
const formData = new FormData();
formData.append('image', imageFile);

const uploadResponse = await fetch('/api/admin/banners/upload-image', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${adminToken}` },
  body: formData
});
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message description",
  "data": null
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors, missing required fields)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (banner doesn't exist)
- `500` - Internal Server Error

## Database Migration

Run the migration script to create the banners table:

```sql
\i database/migrate_banners.sql
```

## Use Cases

### 1. **Homepage Hero Section**
- Display rotating banners with promotional content
- Feature new products or sales
- Drive traffic to specific pages

### 2. **Marketing Campaigns**
- Seasonal promotions
- Product launches
- Special events

### 3. **Content Management**
- Easy banner updates without code changes
- A/B testing with active/inactive toggles
- Quick reordering for priority changes

This banner system provides complete control over your homepage carousel with enterprise-level features for content management and customization!
