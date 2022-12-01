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
  kakaoRestApiKey: '1715c7ad5667d63c3a97de837bd12569',
  appleSignupConfig: {
    // client_id: 'com.ontec.ondot',
    client_id: 'ondot.ontec.com',
    team_id: 'G49XW457HS',
    redirect_uri: 'https://ondot.kr/third-login/apple',
    key_id: '7R45YL87BK',
    scope: 'name email',
  },
  appleClientIdForApp: 'com.ontec.ondot',
  appleClientIfForWeb: 'ondot.ontec.com',
  appleAuthKey: '-----BEGIN PRIVATE KEY-----\n' +
    'MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgB01OcXt+YKrImX4b\n' +
    '1Btn0LYvZXtjGtrNW9FWoDtCss+gCgYIKoZIzj0DAQehRANCAASkzIR1I7J00PUw\n' +
    'qBKrzd8kbUcRzRpQyVq4DirKjs8qEeSGiZ4erxZdfyNXb2NkitTrzBMjRbkwQt5d\n' +
    'keDOXO1Y\n' +
    '-----END PRIVATE KEY-----',
  firebaseAdminServiceKey: {
    "type": "service_account",
    "project_id": "ondot-68281",
    "private_key_id": "6ab8410c8a2f91736c03c732bba32ef27c05e552",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCzsTzW7iGL7gzR\nh7ibj/7uanC8y0ZTQhnJBvAWpZF0WzhAw/7CcmTC0G/vW6B3l9HZja81+SQQNnSh\nvijAnLhLjvQ0Q8bFbUAxm41KxjWam2PgsP7uk3Zs6Lgewab4HpeVuGosMkXdktYl\nGrAvYYjIWnwb8I572Oum+952hxozeYjxFQx2NbcGyFCUwhPtQc/mSuNT2G5JKnt/\nAxVSHpKGqlUMBncvgVYNOMrLF6nLg39wVqDEa3TzxroFhkQxWwplzgx0TA1/jhe4\nqLdxvH3FKHdR1VkJRpt6Eq9rmE5dBhSnzo+jXK3m9l2gqV5S8PzA8ovVIpz9wpcI\nCzuOSpKHAgMBAAECggEAF/InDudV/h0/hQ6mmchzKxdxJZ+bJA47fHAZv5LZ0t0z\nHmJgCU6QQevf9tBJjpZjRzAb6L/mP+jZ2xIJwT1BTARlY6+ihf28n7/AcPX//7X0\ndeVwW5+4GORcYPDijM8a2T9lmrUqXVArjG9FilLflP+F6X1Bp5xtLugCqd3wLmqr\nA4lSkCY6nyP3vFmQOrG/KDfuKdFny++9TbxvZ52OwGeIM3s+FbLOO7K6v9JB9ToV\nPXvZJR6dfHZSL9Vd23f8A6OE1qT5CJALjLwv8PpGAnaryQGi1aUl7l3GMvYLHLm3\nPqxOP+xmyIRkzPF8w9Qb5qxBpbTIHhqz/zT7h6dE7QKBgQDjaYQgmzHNf6TLRG0r\nmWyN2EDguJ2G7zUsDMnRrSRp/Tm7dEwO2rHiH/32Ak4wEsLJcBJeMk4NEjWDeYfo\nnbdFTL+LiVpyuJCRmIN7fGDXvqQrSojgKF0Tq1W8zTADp/WHOEU7C/YwSeUqYWOg\nAkNLIZHebppEexmjkQNBxkdBtQKBgQDKSAWF7+RONIijN8JUFkcVHrNduzy7fXCb\nIa5KOT2Q7yVHU7XY90rUr9YG/ri+mzglNdyfSXEW8oA1HuQllovZ+rejDBoFbfOZ\nL2GGUbcTCAkl8kx2UfTBQm2cm/ekXbf8Yu49nlBLjOGs6cJ570bq8wuac32jIOTG\nU5QRRW6YywKBgEnVkl57xNmxnbGZT9CeCY6sLbRIfGy48YyRwlzfWDlJTBs+kQsp\nmiOOu4fKC9Sz4qZAStZmgszfopxDMwslWcGYP4BwYftpTRbYa6gGI/MoJGkh0/rj\nYATo1fdsrzAgsijq7h9TrOTUuSDfadcjpPGZvqB3TIL7bMGcbXBHjg8ZAoGAZ+uK\nUt4El5zrmZa60kJDsHj+Qyg/Mj9mi3xJMz6m/3+s0jESWm3pVs0jEqLoPJw3wv4h\n4v9zBwv8i83b/eeS36CrmStNbv6myEsMOlpeyHs3X/RUDfFa4bKD55JFLn8rV5Fn\nveZIcBfnlNLfI4+nCmtkyauNnzH19mHXzuuxvvMCgYBEdplelotp9YvkBkIjzyet\nxiybw3EJMuyyMzwr+AlEwbGLLW8qJF0BhG/yiVbYpGd511883HKpwsKfdRxIOL2F\nAG3Ig7HH3saYYlnkokQFzcrgGmWR+5oWhHtHKkcgFSUmUiy6Iri3JdMm1R8rEtdx\ngwibaGiFXgqwU2GEttISyg==\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-v2p2e@ondot-68281.iam.gserviceaccount.com",
    "client_id": "107642962609492527129",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-v2p2e%40ondot-68281.iam.gserviceaccount.com"
  }
};