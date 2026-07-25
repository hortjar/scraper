#!/bin/sh

cat > /usr/share/nginx/html/config.js << EOF
window.__APP_CONFIG__ = {
  apiUrl: "${API_URL}",
  appTitle: "${APP_TITLE}",
  defaultLocale: "${DEFAULT_LOCALE}",
  appVersion: "${APP_VERSION}",
  gitSha: "${GIT_SHA}"
};
EOF

chmod 644 /usr/share/nginx/html/config.js

exec "$@"
