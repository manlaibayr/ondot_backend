import {Filter, repository} from '@loopback/repository';
import {param, get} from '@loopback/rest';
import {HobbyCategoryRepository, LearningCategoryRepository} from '../repositories';

export class CategoryController {
  constructor(
    @repository(LearningCategoryRepository) public learningCategoryRepository : LearningCategoryRepository,
    @repository(HobbyCategoryRepository) public hobbyCategoryRepository : HobbyCategoryRepository,
  ) {}

  @get('/categories')
  async find(
  ) {
    const learningCategory = await this.learningCategoryRepository.find({order: ['learningCategoryOrder']});
    const learning: any = learningCategory.filter((v) => !v.learningCategoryParentId).map((v) => ({
      id: v.id, label: v.learningCategoryName, img: v.learningCategoryImg, subSubject: []
    }));
    learningCategory.filter((v) => v.learningCategoryParentId).forEach((v) => {
      const index = learning.findIndex((s: any) => s.id === v.learningCategoryParentId);
      if(index !== -1) learning[index].subSubject.push(v.learningCategoryName);
    });
    const hobbyCategory = await this.hobbyCategoryRepository.find({order: ['hobbyCategoryOrder']});
    const hobby = hobbyCategory.map((v) => ({id: v.id, label: v.hobbyCategoryName, img: v.hobbyCategoryImg, activeImg: v.hobbyCategoryActiveImg}))
    return {
      learning, hobby
    }
  }
}
