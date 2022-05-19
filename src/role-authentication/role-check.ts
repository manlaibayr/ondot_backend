import {Entity, DefaultCrudRepository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';

export async function checkOwner(repositoryClass: any, itemId: string, userId: string): Promise<void> {
  const repoClass = repositoryClass as DefaultCrudRepository<Entity, string>;
  const obj: any = await repoClass.findById(itemId);
  const userIdKey: string | undefined = Object.keys(obj).find((v) => {
    const index = v.indexOf('user_id');
    return (index !== -1 && index === (v.length - 'user_id'.length));
  });
  if(userIdKey !== undefined && userId !== obj[userIdKey]) {
    throw new HttpErrors.Unauthorized('Invalid authorization');
  }
}