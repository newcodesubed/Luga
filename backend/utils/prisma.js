const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const context = require('./context');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prismaInstance = new PrismaClient({ adapter });

// Multi-tenant automatic scoping Prisma extension
const prisma = prismaInstance.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Apply tenancy constraints to models with userId relation
        const multiTenantModels = ['ClothingItem', 'Outfit'];
        if (!multiTenantModels.includes(model)) {
          return query(args);
        }

        const ctx = context.getStore();
        if (ctx && ctx.userId) {
          // Scope READ, UPDATE, and DELETE operations to the active tenant/userId
          if (['findMany', 'findFirst', 'findUnique', 'count', 'update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
            args.where = args.where || {};
            args.where.userId = ctx.userId;
          }
          // Force active tenant/userId on CREATE operations
          else if (operation === 'create') {
            args.data = args.data || {};
            args.data.userId = ctx.userId;
          }
        }
        return query(args);
      },
    },
  },
});

module.exports = prisma;
