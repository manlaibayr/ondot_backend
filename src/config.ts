import dotenv from "dotenv"
dotenv.config();

export const CONFIG = {
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    databaseName: process.env.DB_NAME
  },
  jwtSecretKey: 'UDJ84J9954##$k)jd',

  uploadFolder: 'upload',
  uploadBaseUrl: '/api/upload',
  pageLimit: 10,

  GOOGLE_CLIENT_ID: '1032267720178-hplvhon7p3mqs71alttc1fe7hufctts8.apps.googleusercontent.com',

  nice: {
    clientId: '1f355b54-2332-48b0-9ee8-9b56049c5ba3',
    clientSecret: 'e0195898dc12648a34768c3170b0f341',
    organizationToken: 'fd394c6f-8cb3-4abb-abeb-f3e9e325f052',
    productID: '2101979031',
  },
}