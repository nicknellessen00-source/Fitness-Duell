// Ergänzt app.json: Für GitHub Pages läuft die Web-Version unter einem Unterordner (/Fitness-Duell).
// Die Pages-Pipeline setzt EXPO_BASE_URL; lokal und bei App-Builds bleibt sie leer.
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}) },
});
