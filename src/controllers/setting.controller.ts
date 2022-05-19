import {FilterExcludingWhere, repository} from '@loopback/repository';
import {param, get, getModelSchemaRef, patch, requestBody, response} from '@loopback/rest';
import {Setting} from '../models';
import {SettingRepository} from '../repositories';
import {secured, SecuredType} from '../role-authentication';

export class SettingController {
  constructor(
    @repository(SettingRepository) public settingRepository: SettingRepository,
  ) {
  }

  @get('/settings/{id}')
  @response(200, {
    description: 'Setting model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Setting, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(Setting, {exclude: 'where'}) filter?: FilterExcludingWhere<Setting>,
  ): Promise<Setting> {
    return this.settingRepository.findById(id, filter);
  }

  @patch('/settings/{id}')
  @secured(SecuredType.HAS_ROLES, ['ADMIN'])
  @response(204, {
    description: 'Setting PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody() data: {value: string},
  ): Promise<void> {
    return this.settingRepository.updateById(id, {value: data.value});
  }

  @get('/settings/terms')
  async getTerms() {
    const terms = await this.settingRepository.find({where: {id: {inq: ['serviceUseTerm', 'privacy', 'positionTerm', 'infoCorrectionTerm']}}});
    const data:any = {};
    terms.forEach((v) => {
      data[v.id] = v.value;
    });
    return data;
  }


  // @del('/settings/{id}')
  // @response(204, {
  //   description: 'Setting DELETE success',
  // })
  // async deleteById(@param.path.string('id') id: string): Promise<void> {
  //   await this.settingRepository.deleteById(id);
  // }
}
