import * as Joi from 'joi';
import { registerAs } from '@nestjs/config';

/**
 * App configuration including MongoDB URI
 * example value:
 * 'mongodb://user:password@localhost:27017/play_history_db?authSource=admin',
 */
export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  mongodbUri:
    process.env.MONGODB_URI
}));

/**
 * Environment variable validation schema using Joi
 */
export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  MONGODB_URI: Joi.string().uri().required(),
});
