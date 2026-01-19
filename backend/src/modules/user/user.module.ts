import { Module } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AnchorService } from './anchor.service';
import { UserController } from './controllers/user.controller';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  providers: [UserService, AnchorService, AuthGuard],
  exports: [UserService, AnchorService],
})
export class UserModule {}
