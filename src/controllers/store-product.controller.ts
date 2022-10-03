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
import {StoreProduct} from '../models';
import {StoreProductRepository} from '../repositories';

export class StoreProductController {
  constructor(
    @repository(StoreProductRepository)
    public storeProductRepository : StoreProductRepository,
  ) {}

  @post('/store-products')
  @response(200, {
    description: 'StoreProduct model instance',
    content: {'application/json': {schema: getModelSchemaRef(StoreProduct)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(StoreProduct, {
            title: 'NewStoreProduct',
            exclude: ['id'],
          }),
        },
      },
    })
    storeProduct: Omit<StoreProduct, 'id'>,
  ): Promise<StoreProduct> {
    return this.storeProductRepository.create(storeProduct);
  }

  @get('/store-products/count')
  @response(200, {
    description: 'StoreProduct model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(StoreProduct) where?: Where<StoreProduct>,
  ): Promise<Count> {
    return this.storeProductRepository.count(where);
  }

  @get('/store-products')
  @response(200, {
    description: 'Array of StoreProduct model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(StoreProduct, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(StoreProduct) filter?: Filter<StoreProduct>,
  ): Promise<StoreProduct[]> {
    return this.storeProductRepository.find(filter);
  }

  @patch('/store-products')
  @response(200, {
    description: 'StoreProduct PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(StoreProduct, {partial: true}),
        },
      },
    })
    storeProduct: StoreProduct,
    @param.where(StoreProduct) where?: Where<StoreProduct>,
  ): Promise<Count> {
    return this.storeProductRepository.updateAll(storeProduct, where);
  }

  @get('/store-products/{id}')
  @response(200, {
    description: 'StoreProduct model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(StoreProduct, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(StoreProduct, {exclude: 'where'}) filter?: FilterExcludingWhere<StoreProduct>
  ): Promise<StoreProduct> {
    return this.storeProductRepository.findById(id, filter);
  }

  @patch('/store-products/{id}')
  @response(204, {
    description: 'StoreProduct PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(StoreProduct, {partial: true}),
        },
      },
    })
    storeProduct: StoreProduct,
  ): Promise<void> {
    await this.storeProductRepository.updateById(id, storeProduct);
  }

  @put('/store-products/{id}')
  @response(204, {
    description: 'StoreProduct PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() storeProduct: StoreProduct,
  ): Promise<void> {
    await this.storeProductRepository.replaceById(id, storeProduct);
  }

  @del('/store-products/{id}')
  @response(204, {
    description: 'StoreProduct DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.storeProductRepository.deleteById(id);
  }
}
