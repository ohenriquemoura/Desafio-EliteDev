import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return {
      name: 'elitedev-api',
      status: 'ok',
    };
  }

  getHealth() {
    return {
      status: 'ok',
    };
  }
}
