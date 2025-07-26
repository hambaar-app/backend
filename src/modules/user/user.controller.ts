import { Body, Controller, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiOperation } from '@nestjs/swagger';
import { UpdateTransporterDto } from './dto/update-transporter.dto';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @ApiOperation({
    summary: 'Updates user info',
    description: "For sender and user related transporter info. Update phoneNumber will be ignored."
  })
  @Patch(':id')
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserDto
  ) {
    return this.userService.update(id, body);
  }

  @ApiOperation({
    summary: 'Updates transporter info',
    description: "For transformer related info."
  })
  @Patch('transporters/:userId')
  async updateTransporter(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: UpdateTransporterDto
  ) {
    return this.userService.updateTransporter(userId, body);
  }
}
