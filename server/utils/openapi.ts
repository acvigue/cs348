// Common response schemas
export const schemas = {
  // Pagination
  Pagination: {
    type: 'object',
    properties: {
      page: { type: 'number', description: 'Current page number' },
      total_pages: { type: 'number', description: 'Total number of pages' },
      total_results: { type: 'number', description: 'Total number of results' }
    }
  },

  // Error response
  Error: {
    type: 'object',
    properties: {
      statusCode: { type: 'number' },
      statusMessage: { type: 'string' },
      data: { type: 'object' }
    }
  },

  // User schemas
  UserBasic: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'User ID' },
      email: { type: 'string', format: 'email', description: 'User email address' },
      name: { type: 'string', nullable: true, description: 'User full name' },
      role: {
        type: 'string',
        enum: ['STUDENT', 'INSTRUCTOR', 'ADMIN'],
        description: 'User role in the system'
      }
    }
  },

  User: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'User ID' },
      email: { type: 'string', format: 'email' },
      name: { type: 'string', nullable: true },
      role: { type: 'string', enum: ['STUDENT', 'INSTRUCTOR', 'ADMIN'] },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      verificationTokens: {
        type: 'array',
        items: { $ref: '#/components/schemas/VerificationToken' }
      }
    }
  },

  // Lab schemas
  Lab: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Lab ID' },
      building: { type: 'string', description: 'Building name' },
      roomNumber: { type: 'string', description: 'Room number' },
      capacity: { type: 'number', description: 'Maximum capacity' },
      description: { type: 'string', nullable: true, description: 'Lab description' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },

  LabWithEquipment: {
    allOf: [
      { $ref: '#/components/schemas/Lab' },
      {
        type: 'object',
        properties: {
          equipment: {
            type: 'array',
            items: { $ref: '#/components/schemas/Equipment' }
          },
          availability: {
            type: 'string',
            enum: ['EMPTY', 'IN_USE', 'FULL'],
            description: 'Lab availability status'
          }
        }
      }
    ]
  },

  // Equipment schemas
  Equipment: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Equipment ID' },
      name: { type: 'string', description: 'Equipment name' },
      type: { type: 'string', description: 'Equipment type' },
      serialNumber: { type: 'string', description: 'Serial number' },
      status: {
        type: 'string',
        enum: ['OPERATIONAL', 'MAINTENANCE', 'OUT_OF_ORDER'],
        description: 'Equipment operational status (stored in database)'
      },
      computedStatus: {
        type: 'string',
        enum: ['AVAILABLE', 'IN_USE', 'OPERATIONAL', 'MAINTENANCE', 'OUT_OF_ORDER'],
        description:
          'Computed equipment status. AVAILABLE/IN_USE are computed based on active reservations. OPERATIONAL/MAINTENANCE/OUT_OF_ORDER come from the database.'
      },
      description: { type: 'string', nullable: true, description: 'Equipment description' },
      labId: { type: 'number', description: 'Lab ID where equipment is located' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },

  EquipmentWithLab: {
    allOf: [
      { $ref: '#/components/schemas/Equipment' },
      {
        type: 'object',
        properties: {
          lab: { $ref: '#/components/schemas/Lab' }
        }
      }
    ]
  },

  // Reservation schemas
  Reservation: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Reservation ID' },
      userId: { type: 'number', description: 'User ID who made the reservation' },
      startTime: { type: 'string', format: 'date-time', description: 'Reservation start time' },
      endTime: { type: 'string', format: 'date-time', description: 'Reservation end time' },
      purpose: { type: 'string', description: 'Purpose of the reservation' },
      status: {
        type: 'string',
        enum: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
        description: 'Reservation status'
      },
      notes: { type: 'string', nullable: true, description: 'Additional notes' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },

  ReservationWithDetails: {
    allOf: [
      { $ref: '#/components/schemas/Reservation' },
      {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/UserBasic' },
          equipment: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                equipment: { $ref: '#/components/schemas/Equipment' }
              }
            }
          }
        }
      }
    ]
  },

  // Verification Token
  VerificationToken: {
    type: 'object',
    properties: {
      id: { type: 'number' },
      token: { type: 'string' },
      expires: { type: 'string', format: 'date-time' },
      type: {
        type: 'string',
        enum: ['EMAIL_VERIFICATION', 'PASSWORD_RESET']
      },
      createdAt: { type: 'string', format: 'date-time' },
      userId: { type: 'number' }
    }
  },

  // Success responses
  SuccessMessage: {
    type: 'object',
    properties: {
      message: { type: 'string' },
      success: { type: 'boolean' }
    }
  },

  // Statistics
  LabStatistics: {
    type: 'object',
    properties: {
      lab: { $ref: '#/components/schemas/Lab' },
      statistics: {
        type: 'object',
        properties: {
          equipmentByStatus: {
            type: 'object',
            additionalProperties: { type: 'number' }
          },
          totalEquipment: { type: 'number' },
          recentReservations: { type: 'number', description: 'Reservations in last 30 days' },
          activeReservations: { type: 'number', description: 'Currently active reservations' },
          utilizationRate: { type: 'number', description: 'Percentage utilization rate' }
        }
      }
    }
  }
}

// Common parameters
export const parameters = {
  id: {
    in: 'path' as const,
    name: 'id',
    required: true,
    schema: { type: 'number' as const },
    description: 'Resource ID'
  },

  labId: {
    in: 'path' as const,
    name: 'labId',
    required: true,
    schema: { type: 'number' as const },
    description: 'Lab ID'
  },

  page: {
    in: 'query' as const,
    name: 'page',
    required: false,
    schema: { type: 'number' as const, default: 1 },
    description: 'Page number for pagination'
  },

  resultsPerPage: {
    in: 'query' as const,
    name: 'results_per_page',
    required: false,
    schema: { type: 'number' as const, default: 20 },
    description: 'Number of results per page'
  },

  token: {
    in: 'query' as const,
    name: 'token',
    required: true,
    schema: { type: 'string' as const },
    description: 'Verification token'
  }
}

// Common security schemes
export const securitySchemes = {
  sessionAuth: {
    type: 'apiKey' as const,
    in: 'cookie' as const,
    name: 'session'
  }
}

// Common responses
export const responses = {
  200: {
    description: 'Successful response'
  },
  201: {
    description: 'Resource created successfully'
  },
  400: {
    description: 'Bad request - validation error',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' }
      }
    }
  },
  401: {
    description: 'Unauthorized - authentication required',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' }
      }
    }
  },
  403: {
    description: 'Forbidden - insufficient permissions',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' }
      }
    }
  },
  404: {
    description: 'Resource not found',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' }
      }
    }
  },
  409: {
    description: 'Conflict - resource already exists or time conflict',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' }
      }
    }
  },
  500: {
    description: 'Internal server error',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' }
      }
    }
  }
}
