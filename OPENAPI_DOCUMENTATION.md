# OpenAPI Documentation Summary

This document summarizes the OpenAPI documentation that has been added to all API endpoints in the project.

## Overview

All API endpoints now include `defineRouteMeta` with comprehensive OpenAPI specifications that document:

- Request parameters
- Request bodies with validation schemas
- Response structures
- Error responses
- Security requirements
- Descriptions and summaries

## Helper File

**Location:** `/server/utils/openapi.ts`

This file contains reusable OpenAPI components:

### Schemas

- `Pagination` - Standard pagination response
- `Error` - Error response format
- `UserBasic` - Basic user information
- `User` - Full user details with verification tokens
- `Lab` - Lab information
- `LabWithEquipment` - Lab with equipment array and availability
- `Equipment` - Equipment information
- `EquipmentWithLab` - Equipment with associated lab
- `Reservation` - Reservation information
- `ReservationWithDetails` - Reservation with user and equipment details
- `VerificationToken` - Verification token details
- `SuccessMessage` - Generic success response
- `LabStatistics` - Lab statistics response

### Parameters

- `id` - Resource ID path parameter
- `labId` - Lab ID path parameter
- `page` - Page number query parameter
- `resultsPerPage` - Results per page query parameter
- `token` - Verification token query parameter

### Responses

- `200` - Successful response
- `201` - Resource created
- `400` - Bad request / validation error
- `401` - Unauthorized
- `403` - Forbidden / insufficient permissions
- `404` - Not found
- `409` - Conflict
- `500` - Internal server error

### Security Schemes

- `sessionAuth` - Cookie-based session authentication

## Documented Endpoints

### Authentication (`/api/auth`)

1. **POST /api/auth/login**
   - Summary: User login
   - Body: email, password
   - Response: User ID and email with session cookie

2. **POST /api/auth/register**
   - Summary: Register new user
   - Body: name, email, password, verify_password
   - Response: Created user with verification email sent

3. **GET /api/auth/logout**
   - Summary: Logout user
   - Auth: Required
   - Response: Session cleared

4. **GET /api/auth/me**
   - Summary: Get current user
   - Auth: Required
   - Response: Current user information

5. **POST /api/auth/forgot_password**
   - Summary: Request password reset
   - Body: email
   - Response: Password reset email sent

6. **POST /api/auth/reset_password**
   - Summary: Reset password
   - Body: token, password, verify_password
   - Response: Password reset successful

7. **GET /api/auth/verify**
   - Summary: Verify email or password reset token
   - Query: token
   - Response: Redirect to appropriate page

### Equipment (`/api/equipment`)

1. **GET /api/equipment**
   - Summary: List all equipment
   - Query: page, results_per_page
   - Response: Paginated list of equipment with labs

2. **POST /api/equipment**
   - Summary: Create new equipment
   - Auth: Required (ADMIN/INSTRUCTOR)
   - Body: name, type, serialNumber, labId, description, status
   - Response: Created equipment

3. **GET /api/equipment/:id**
   - Summary: Get equipment by ID
   - Path: id
   - Response: Equipment details with lab and reservations

4. **PUT /api/equipment/:id**
   - Summary: Update equipment
   - Auth: Required (ADMIN/INSTRUCTOR)
   - Path: id
   - Body: name, type, serialNumber, labId, description, status
   - Response: Updated equipment

5. **DELETE /api/equipment/:id**
   - Summary: Delete equipment
   - Auth: Required (ADMIN/INSTRUCTOR)
   - Path: id
   - Response: Success message

6. **PUT /api/equipment/:id/status**
   - Summary: Update equipment status
   - Auth: Required
   - Path: id
   - Body: status
   - Response: Success boolean

7. **GET /api/equipment/lab/:labId**
   - Summary: Get equipment by lab
   - Path: labId
   - Response: Lab details and equipment list

### Labs (`/api/labs`)

1. **GET /api/labs**
   - Summary: List all labs
   - Query: page, results_per_page
   - Response: Paginated list of labs with availability

2. **POST /api/labs**
   - Summary: Create new lab
   - Auth: Required (ADMIN)
   - Body: building, roomNumber, capacity, description
   - Response: Created lab

3. **GET /api/labs/:id**
   - Summary: Get lab by ID
   - Path: id
   - Response: Lab details with equipment and availability

4. **PUT /api/labs/:id**
   - Summary: Update lab
   - Auth: Required (ADMIN)
   - Path: id
   - Body: building, roomNumber, capacity, description
   - Response: Updated lab

5. **DELETE /api/labs/:id**
   - Summary: Delete lab
   - Auth: Required (ADMIN)
   - Path: id
   - Response: Success message

6. **GET /api/labs/:id/stats**
   - Summary: Get lab statistics
   - Path: id
   - Response: Equipment status, utilization, and reservation statistics

### Reservations (`/api/reservations`)

1. **GET /api/reservations**
   - Summary: List reservations
   - Auth: Required
   - Query: page, results_per_page
   - Response: Paginated list of reservations (filtered by user if not admin)

2. **POST /api/reservations**
   - Summary: Create reservation
   - Auth: Required
   - Body: equipmentIds[], startTime, endTime, purpose, notes
   - Response: Created reservation
   - Notes: Times must be on 15-minute blocks, max 8 hours

3. **GET /api/reservations/:id**
   - Summary: Get reservation by ID
   - Auth: Required
   - Path: id
   - Response: Reservation details

4. **PUT /api/reservations/:id/cancel**
   - Summary: Cancel reservation
   - Auth: Required
   - Path: id
   - Response: Success boolean

5. **PUT /api/reservations/:id/confirm**
   - Summary: Confirm reservation
   - Auth: Required (INSTRUCTOR/ADMIN)
   - Path: id
   - Response: Success boolean

6. **PUT /api/reservations/:id/complete**
   - Summary: Complete reservation
   - Auth: Required
   - Path: id
   - Response: Success boolean

### Users (`/api/users`)

1. **GET /api/users**
   - Summary: List all users
   - Auth: Required (ADMIN)
   - Query: page, results_per_page
   - Response: Paginated list of users

2. **GET /api/users/:id**
   - Summary: Get user by ID
   - Auth: Required (ADMIN)
   - Path: id
   - Response: User details with verification tokens

3. **DELETE /api/users/:id**
   - Summary: Delete user
   - Auth: Required (ADMIN)
   - Path: id
   - Response: Success boolean

4. **PUT /api/users/:id/email**
   - Summary: Update user email
   - Auth: Required (ADMIN)
   - Path: id
   - Body: email
   - Response: Success boolean

5. **PUT /api/users/:id/verify**
   - Summary: Verify user email
   - Auth: Required (ADMIN)
   - Path: id
   - Response: Success boolean

6. **POST /api/users/:id/send_password_reset**
   - Summary: Send password reset email
   - Auth: Required (ADMIN)
   - Path: id
   - Response: Success boolean

## Accessing the Documentation

### In Development

1. **Nuxt DevTools**
   - Open Nuxt DevTools in your browser
   - Navigate to the "Open API" or "Server Routes" tab
   - You'll see all documented routes with a playground to test them

2. **NuxtHub Admin**
   - After deploying, visit your NuxtHub Admin dashboard
   - The API documentation will be displayed using Scalar

### Configuration

The OpenAPI feature is enabled in `nuxt.config.ts`:

```typescript
nitro: {
  experimental: {
    openAPI: true
  }
}
```

## Benefits

1. **Auto-generated Documentation**: Your API is now fully documented and discoverable
2. **Type Safety**: Request/response schemas are clearly defined
3. **Testing**: Use the playground in Nuxt DevTools to test endpoints
4. **Developer Experience**: New developers can quickly understand the API
5. **Client Generation**: Can be used to generate API clients in various languages
6. **Validation**: Helps validate that implementations match specifications

## Notes

- All endpoints use Prisma-generated types where appropriate
- Common response patterns are defined in the helper file
- Security requirements are clearly marked (session authentication)
- Error responses follow a consistent format
- Pagination is standardized across list endpoints
