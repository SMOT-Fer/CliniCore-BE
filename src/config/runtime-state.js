let shuttingDown = false;

function isShuttingDown() {
  return shuttingDown;
}

function setShuttingDown(value) {
  shuttingDown = Boolean(value);
}

module.exports = {
  isShuttingDown,
  setShuttingDown
};
