import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { UpdateTransporterDto } from './dto/update-transporter.dto';
import { Serialize } from '../../common/serialize.interceptor';
import { ProfileResponseDto, UserResponseDto } from './dto/user-response.dto';
import { TransporterCompactDto } from './dto/transporter-response.dto';
import { AccessTokenGuard } from '../auth/guard/token.guard';
import { CurrentUser } from './current-user.middleware';
import { AuthResponses, ValidationResponses } from '../../common/api-docs.decorators';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @ApiOperation({
    summary: 'Get user\'s profile info',
  })
  @ApiOkResponse({
    type: ProfileResponseDto
  })
  @AuthResponses()
  @Serialize(ProfileResponseDto)
  @UseGuards(AccessTokenGuard)
  @Get('profile')
  async getUserProfile(
    @CurrentUser('id') id: string
  ) {
    return this.userService.getProfile(id);
  }

  @ApiOperation({
    summary: 'Updates user info',
    description: "For sender and user related transporter info. Update phoneNumber will be ignored."
  })
  @ApiOkResponse({
    type: UserResponseDto
  })
  @AuthResponses()
  @ValidationResponses()
  @Serialize(UserResponseDto)
  @UseGuards(AccessTokenGuard)
  @Patch()
  async updateUser(
    @Body() body: UpdateUserDto,
    @CurrentUser('id') id: string
  ) {
    return this.userService.update(id, body);
  }

  @ApiOperation({
    summary: 'Updates transporter info',
    description: "For transformer related info."
  })
  @ApiOkResponse({
    type: TransporterCompactDto
  })
  @AuthResponses()
  @ValidationResponses()
  @Serialize(TransporterCompactDto)
  @UseGuards(AccessTokenGuard)
  @Patch('transporters')
  async updateTransporter(
    @Body() body: UpdateTransporterDto,
    @CurrentUser('id') id: string,
  ) {
    return this.userService.updateTransporter(id, body);
  }
}
