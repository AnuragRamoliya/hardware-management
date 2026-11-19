import { BaseCrudService } from './base_crud.service';
import { LocationModel, locationDefinition } from '../Models/location';

export class LocationService extends BaseCrudService {
  constructor() {
    super(LocationModel, locationDefinition);
  }
}
