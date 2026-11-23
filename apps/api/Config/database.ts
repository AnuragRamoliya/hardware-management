import { Sequelize } from 'sequelize';
import { env } from './env';

export const sequelize = new Sequelize(env.DB_DATABASE, env.DB_USERNAME, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'mysql',
  logging: env.DB_LOGGING ? (message) => console.log(message) : false,
  dialectOptions: { decimalNumbers: true },
  define: { underscored: false, timestamps: true },
});
