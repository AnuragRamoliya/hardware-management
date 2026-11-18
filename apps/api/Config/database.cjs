'use strict';

require('dotenv').config();
const { z } = require('zod');

const emptyAsUndefined = (value) => (value === '' ? undefined : value);
const databaseEnv = z
  .object({
    DB_USERNAME: z.string().min(1),
    DB_PASSWORD: z.string().optional().default(''),
    DB_HOST: z.string().min(1),
    DB_PORT: z.preprocess(emptyAsUndefined, z.coerce.number().int().positive().default(3306)),
    DB_DATABASE: z.string().min(1),
    DB_CONNECTION: z.preprocess(emptyAsUndefined, z.literal('mysql').default('mysql')),
    DB_LOGGING: z.string().default('false'),
  })
  .parse(process.env);

module.exports = {
  development: {
    username: databaseEnv.DB_USERNAME,
    password: databaseEnv.DB_PASSWORD,
    database: databaseEnv.DB_DATABASE,
    host: databaseEnv.DB_HOST,
    port: databaseEnv.DB_PORT,
    dialect: databaseEnv.DB_CONNECTION,
    logging: databaseEnv.DB_LOGGING === 'true' ? console.log : false,
  },
};
