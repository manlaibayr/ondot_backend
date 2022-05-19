import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {juggler} from '@loopback/repository';
import {CONFIG} from '../config';

// Observe application's life cycle to disconnect the datasource when
// application is stopped. This allows the application to be shut down
// gracefully. The `stop()` method is inherited from `juggler.DataSource`.
// Learn more at https://loopback.io/doc/en/lb4/Life-cycle.html
@lifeCycleObserver('datasource')
export class DbDataSource extends juggler.DataSource
  implements LifeCycleObserver {
  static dataSourceName = 'db';
  static readonly defaultConfig = {
    name: 'db',
    connector: 'mysql',
    url: '',
    host: CONFIG.database.host,
    port: CONFIG.database.port,
    user: CONFIG.database.user,
    password: CONFIG.database.password,
    database: CONFIG.database.databaseName,
    charset: 'utf8mb4'
  };

  constructor(
    @inject('datasources.config.db', {optional: true})
    dsConfig: object = DbDataSource.defaultConfig,
  ) {
    super(dsConfig);
  }
}
