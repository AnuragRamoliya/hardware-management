import { BaseCrudController } from './base_crud.controller';
import { LocationService } from '../Services/location';

export class LocationController extends BaseCrudController {
  constructor(service = new LocationService()) {
    super(service, 'Location');
  }
}
