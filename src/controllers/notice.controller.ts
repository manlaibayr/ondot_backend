import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getModelSchemaRef,
  patch,
  put,
  del,
  requestBody,
  response,
} from '@loopback/rest';
import {Notice} from '../models';
import {NoticeRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';

export class NoticeController {
  constructor(
    @repository(NoticeRepository) public noticeRepository : NoticeRepository,
  ) {}

  @get('/notices')
  @secured(SecuredType.IS_AUTHENTICATED)
  @response(200, {
    description: 'Array of Notice model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Notice, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(Notice) filter?: Filter<Notice>,
  ): Promise<Notice[]> {
    return this.noticeRepository.find(filter);
  }

  // @del('/notices/{id}')
  // @response(204, {
  //   description: 'Notice DELETE success',
  // })
  // async deleteById(@param.path.string('id') id: string): Promise<void> {
  //   await this.noticeRepository.deleteById(id);
  // }
}
