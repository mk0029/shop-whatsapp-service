module.exports = {
  apps: [
    {
      name: "whatsapp-service",
      script: "./server.js",
      instances: 1, // WhatsApp Web can only handle one session per client
      exec_mode: "fork", // Use fork mode for single instance
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_file: "./logs/pm2-combined.log",
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      kill_timeout: 5000,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
};
