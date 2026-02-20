function log(level, message, meta) {
  const timestamp = new Date().toISOString();
  const payload = meta ? ` ${JSON.stringify(meta)}` : '';
  // eslint-disable-next-line no-console
  console.log(`[${timestamp}] [${level}] ${message}${payload}`);
}

function info(message, meta) {
  log('INFO', message, meta);
}

function warn(message, meta) {
  log('WARN', message, meta);
}

function error(message, meta) {
  log('ERROR', message, meta);
}

module.exports = {
  info,
  warn,
  error
};
