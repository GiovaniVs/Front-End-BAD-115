module.exports = {
  '/api': {
    target: 'http://localhost:8083',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    configure(proxy) {
      proxy.on('proxyRes', (proxyRes) => {
        delete proxyRes.headers['www-authenticate'];
      });
    },
    on: {
      proxyRes(proxyRes) {
        delete proxyRes.headers['www-authenticate'];
      }
    },
    onProxyRes(proxyRes) {
      delete proxyRes.headers['www-authenticate'];
    }
  }
};
