import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateSmsEnabledDto {
  @IsBoolean()
  enabled!: boolean;
}

export class UpdatePaymentReceivedSmsDto {
  @IsBoolean()
  enabled!: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(480)
  template!: string;
}

export class SendLenderSmsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  borrowerIds!: string[];

  @IsString()
  @MinLength(1)
  @MaxLength(480)
  message!: string;
}
