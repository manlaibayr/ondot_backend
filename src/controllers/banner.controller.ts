import {Filter, repository} from '@loopback/repository';
import {param, get, getModelSchemaRef, response} from '@loopback/rest';
import {Banner} from '../models';
import {BannerRepository} from '../repositories';

export class BannerController {
  constructor(
    @repository(BannerRepository) public bannerRepository : BannerRepository,
  ) {}

  @get('/banners')
  async bannerList() {
    return this.bannerRepository.find({where: {bannerStatus: true}, order: ['createdAt desc'], fields: ['id', 'bannerShowType', 'bannerImgUrl', 'bannerPopupImgUrl', 'bannerLink']});
  }
}
