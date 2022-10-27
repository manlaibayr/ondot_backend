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
import {Faq} from '../models';
import {FaqRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';

export class FaqController {
  constructor(
    @repository(FaqRepository)

    public faqRepository : FaqRepository,
  ) {}

  @get('/faqs')
  @secured(SecuredType.IS_AUTHENTICATED)
  @response(200, {
    description: 'Array of Faq model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Faq, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(Faq) filter?: Filter<Faq>,
  ): Promise<Faq[]> {
    return this.faqRepository.find(filter);
  }

  // @del('/faqs/{id}')
  // @response(204, {
  //   description: 'Faq DELETE success',
  // })
  // async deleteById(@param.path.string('id') id: string): Promise<void> {
  //   await this.faqRepository.deleteById(id);
  // }
}
