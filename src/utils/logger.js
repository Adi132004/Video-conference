const LOG_ENABLED = import.meta.env.DEV;

export const logger = {
  info: (...args) => {
    if (LOG_ENABLED) console.log('[INFO]', ...args);
  },
  
  warn: (...args) => {
    if (LOG_ENABLED) console.warn('[WARN]', ...args);
  },
  
  error: (...args) => {
    console.error('[ERROR]', ...args);
  },
  
  debug: (...args) => {
    if (LOG_ENABLED) console.debug('[DEBUG]', ...args);
  }
};