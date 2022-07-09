import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    databaseName: process.env.DB_NAME,
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
  iamportInfo: {
    identifyCode: 'imp88172071',
    apiKey: '9395963804566596',
    secretKey: '4c82be986c0c0c45fd8619baf0a95da75f690129b247f6c8531678340e77362ab27e77087085d855',
  },
  gifting: {
    // authUrl: 'http://dev.giftting.co.kr:48081',   //개발서버
    authUrl: 'https://auth.giftting.co.kr',
    // mediaUrl: 'http://dev.giftting.co.kr:8084/media', // 개발서버
    mediaUrl: 'https://gw.giftting.co.kr:4431/media',
    mdCode: 'ontec',
    custId: 'ontec',
    pwd: 'zxc1234!@#$',
    // authKey: '3651ba06724d9cb3eaca19eb8f5b2309e670ef8e06b6fd7976d5c6070fe86a4e', //개발서버
    authKey: '9326df083e0777628132b7425468a305fae45f58668cbb3ad6c92759ea918c70',
    aesKey: 'NcRfUjXn2r5u8x/A?D(G+KbPdSgVkYp3',
    aesIv: 'MjfHe98&#jUjekq7',
    rsaPublicKey: '-----BEGIN PUBLIC KEY-----\n' +
      'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjjBCNJgYRpAY/qOWFiwL5\n' +
      'in17x1SD1vLd8y3d4OIzKT2RaBI/qanLVm+CuT/Kctt/RQYvtFydWETgUckPmbT+0\n' +
      't7v6ifRGu50w3oJgPawG44mYIali/PjaeCln+Le6RWVjlWsjClZPI4lnAodTOriQY\n' +
      'ud3RF73/3yr509jjCwCZW615/z11ZJ/hKwZTa4MFKLkncAvgzp8H9OLEIEKSCDkvj\n' +
      'W42nNGFIvhTo9djPbEGJotm/hBZHJ52ehMhOWekBoymYMIFuhA38vgOLLJxRR4ov3\n' +
      '28Of6+s17M+JFegomBs8ztnmsRuNrXlLkb6bDS8P9CAXOx7Xrh5Q7Ntr7o8PwIDAQ\n' +
      'AB\n' +
      '-----END PUBLIC KEY-----',
    rsaPrivateKey: '',
    // aesKey: 'test20220704test20220704test2022',
    // aesIv: 'test20220704test',
    // rsaPublicKey: '',
    // rsaPrivateKey: ''
  },
};