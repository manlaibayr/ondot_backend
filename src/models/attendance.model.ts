import {Entity, model, property} from '@loopback/repository';

@model()
export class Attendance extends Entity {
  @property({
    type: 'string',
    id: true,
    defaultFn: 'uuidv4',
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  attendanceUserId: string;

  @property({
    type: 'number',
    required: true,
  })
  attendanceMonth: number;

  @property({
    type: 'number',
    required: true,
  })
  attendanceDay: number;

  @property({
    type: 'date',
    default: "$now"
  })
  createdAt: Date;


  constructor(data?: Partial<Attendance>) {
    super(data);
  }
}

export interface AttendanceRelations {
  // describe navigational properties here
}

export type AttendanceWithRelations = Attendance & AttendanceRelations;
