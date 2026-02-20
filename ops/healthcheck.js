const endpoint = process.env.HEALTHCHECK_URL || 'http://127.0.0.1:3000/readyz';

async function main() {
  const response = await fetch(endpoint);
  const body = await response.json().catch(() => ({}));

  if (!response.ok || body?.success !== true || body?.data?.status !== 'ready') {
    // eslint-disable-next-line no-console
    console.error('Healthcheck falló', { endpoint, status: response.status, body });
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log('Healthcheck OK', { endpoint });
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Healthcheck error', { endpoint, message: error.message });
  process.exit(1);
});
