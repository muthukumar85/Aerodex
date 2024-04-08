
import dotenv from 'dotenv';
dotenv.config();

export const retrieveEnvVariable = (variableName: string, logger: any) => {
  const variable = process.env[variableName] || '';
  if (!variable) {
    logger.error(`${variableName} is not set`);
    process.exit(1);
  }
  return variable;
}
