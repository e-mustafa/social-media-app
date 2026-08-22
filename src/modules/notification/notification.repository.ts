import { BaseRepository, IQueryOptions } from '../../DB/base.repository';
import { Notification } from './notification.model';
import { INotification } from './notification.types';


export class NotificationRepository extends BaseRepository<INotification> {
	constructor() {
		super(Notification);
	}
}

export default new NotificationRepository();
