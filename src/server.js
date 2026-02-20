require('./config/env');
const app = require('./app');
const db = require('./config/db');
const runtimeState = require('./config/runtime-state');
const logger = require('./utils/logger');

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
    logger.info('Servidor iniciado', { port });
});

let isShuttingDown = false;

async function shutdown(signal) {
    if (isShuttingDown) {
        return;
    }

    isShuttingDown = true;
    runtimeState.setShuttingDown(true);
    logger.warn('Iniciando cierre graceful', { signal });

    server.close(async (error) => {
        if (error) {
            logger.error('Error al cerrar servidor HTTP', { message: error.message });
            process.exit(1);
            return;
        }

        try {
            await db.close();
            logger.info('Cierre graceful completado');
            process.exit(0);
        } catch (dbError) {
            logger.error('Error al cerrar recursos de aplicación', { message: dbError.message });
            process.exit(1);
        }
    });

    setTimeout(() => {
        logger.error('Tiempo de espera agotado, forzando cierre');
        process.exit(1);
    }, 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));