import type { NextRequest } from 'next/server';
import Logger from './logger';

const isProduction = process.env.NODE_ENV === 'production';

function extractContext(args: unknown[]): Record<string, unknown> | undefined {
  if (args.length === 0) {
    return undefined;
  }

  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
    return args[0] as Record<string, unknown>;
  }

  return { args };
}

function normalizeMessage(message: unknown): string {
  if (typeof message === 'string') {
    return message;
  }

  try {
    return JSON.stringify(message);
  } catch {
    return String(message);
  }
}

function normalizeError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }

  return new Error(normalizeMessage(value));
}

export const productionLogger = {
  info(message: unknown, ...rest: unknown[]) {
    if (isProduction) {
      return;
    }

    Logger.info(normalizeMessage(message), extractContext(rest));
  },

  warn(message: unknown, ...rest: unknown[]) {
    Logger.warn(normalizeMessage(message), extractContext(rest));
  },

  error(message: unknown, error?: unknown, context?: Record<string, unknown>, request?: NextRequest) {
    const normalizedError = error === undefined ? normalizeError(message) : normalizeError(error);
    Logger.error(normalizeMessage(message), normalizedError, context, request);
  },

  debug(message: unknown, data?: unknown, context?: Record<string, unknown>, request?: NextRequest) {
    if (isProduction) {
      return;
    }

    Logger.debug(normalizeMessage(message), data, context, request);
  },
};
