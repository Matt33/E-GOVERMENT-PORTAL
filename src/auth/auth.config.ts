export default () => ({
  keycloak: {
    issuer:
      process.env.KEYCLOAK_ISSUER ?? 'http://localhost:8080/realms/egov-portal',
    internalUrl:
      process.env.KEYCLOAK_INTERNAL_URL ??
      'http://localhost:8080/realms/egov-portal',
    audience: process.env.KEYCLOAK_AUDIENCE ?? 'account',
    jwksUri:
      process.env.KEYCLOAK_JWKS_URI ??
      'http://localhost:8080/realms/egov-portal/protocol/openid-connect/certs',
    clientId: process.env.KEYCLOAK_CLIENT_ID ?? 'id-renewal-api',
    clientSecret:
      process.env.KEYCLOAK_CLIENT_SECRET ?? 'xPnisDToolKxJGD9GRsBx1Tn3G0zcbKD',
  },
});
