import { NextResponse } from 'next/server'

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Brook API',
    version: '1.0.0',
    description: 'Personal & Business Cashflow Manager for Truck Transport Business',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'date-time' },
          status: { type: 'integer' },
          error: { type: 'string' },
          message: { type: 'string' },
          path: { type: 'string' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'BUSINESS', 'PERSONAL'] },
          name: { type: 'string' },
        },
      },
      Trip: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          brokerName: { type: 'string' },
          ratePerTon: { type: 'number' },
          agreedWeight: { type: 'number' },
          actualWeight: { type: 'number', nullable: true },
          shortagePenalty: { type: 'number' },
          brokeragePct: { type: 'number' },
          status: {
            type: 'string',
            enum: ['ORDER_RECEIVED', 'IN_TRANSIT', 'DELIVERED', 'DOCS_SENT', 'PAYMENT_PENDING', 'COMPLETED', 'IN_BETWEEN'],
          },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date', nullable: true },
          paymentReceived: { type: 'boolean' },
          truckId: { type: 'string', format: 'uuid' },
          createdBy: { type: 'string', nullable: true },
          updatedBy: { type: 'string', nullable: true },
        },
      },
      Expense: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          orgId: { type: 'string', format: 'uuid' },
          tripId: { type: 'string', format: 'uuid', nullable: true },
          amount: { type: 'number' },
          category: {
            type: 'string',
            enum: [
              'FUEL', 'TOLL', 'CLEANING', 'OTHER_TRIP',
              'MAINTENANCE', 'TYRE', 'BREAKDOWN', 'TAX', 'FASTAG', 'OTHER_TRUCK',
              'HOUSEHOLD', 'GROCERY', 'MEDICAL', 'OTHER_PERSONAL',
            ],
          },
          expenseDate: { type: 'string', format: 'date' },
          notes: { type: 'string', nullable: true },
          createdBy: { type: 'string', nullable: true },
        },
      },
      Payment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tripId: { type: 'string', format: 'uuid' },
          amount: { type: 'number' },
          type: { type: 'string', enum: ['ADVANCE', 'FINAL'] },
          receivedDate: { type: 'string', format: 'date' },
        },
      },
      Truck: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          regNumber: { type: 'string' },
          model: { type: 'string', nullable: true },
        },
      },
      OrgUser: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'BUSINESS', 'PERSONAL'] },
          phone: { type: 'string', nullable: true },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        summary: 'Login',
        tags: ['Auth'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 1 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    role: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { message: { type: 'string' } } },
              },
            },
          },
        },
      },
    },
    '/trips': {
      get: {
        summary: 'List trips (paginated)',
        tags: ['Trips'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } },
          { name: 'size', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          '200': {
            description: 'Trip list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    content: { type: 'array', items: { type: 'object' } },
                    page: { type: 'integer' },
                    size: { type: 'integer' },
                    totalElements: { type: 'integer' },
                    totalPages: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create trip',
        tags: ['Trips'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['truckId', 'brokerName', 'ratePerTon', 'agreedWeight', 'startDate'],
                properties: {
                  truckId: { type: 'string' },
                  brokerName: { type: 'string' },
                  ratePerTon: { type: 'number', minimum: 0 },
                  agreedWeight: { type: 'number', minimum: 0 },
                  startDate: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/trips/active': {
      get: {
        summary: 'List active trips (not completed)',
        tags: ['Trips'],
        responses: {
          '200': {
            description: 'Active trips',
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
    },
    '/expenses': {
      get: {
        summary: 'List expenses (role-filtered)',
        tags: ['Expenses'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } },
          { name: 'size', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          '200': {
            description: 'Expense list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    content: { type: 'array', items: { type: 'object' } },
                    page: { type: 'integer' },
                    size: { type: 'integer' },
                    totalElements: { type: 'integer' },
                    totalPages: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create expense',
        tags: ['Expenses'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount', 'category', 'expenseDate'],
                properties: {
                  amount: { type: 'number', minimum: 0.01 },
                  category: {
                    type: 'string',
                    enum: [
                      'FUEL', 'TOLL', 'CLEANING', 'OTHER_TRIP',
                      'MAINTENANCE', 'TYRE', 'BREAKDOWN', 'TAX', 'FASTAG', 'OTHER_TRUCK',
                      'HOUSEHOLD', 'GROCERY', 'MEDICAL', 'OTHER_PERSONAL',
                    ],
                  },
                  tripId: { type: 'string', format: 'uuid', nullable: true },
                  expenseDate: { type: 'string', format: 'date' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/health': {
      get: {
        summary: 'Health check',
        tags: ['System'],
        security: [],
        responses: {
          '200': { description: 'Database connected' },
          '503': { description: 'Database unavailable' },
        },
      },
    },
  },
}

export async function GET() {
  return NextResponse.json(openApiSpec)
}