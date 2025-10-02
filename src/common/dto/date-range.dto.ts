import { IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DateRangeDto {
  @ApiProperty({
    description: 'Start date of the time range (ISO 8601 format)',
    example: '2025-09-01T00:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  from: string;

  @ApiProperty({
    description: 'End date of the time range (ISO 8601 format)',
    example: '2025-09-30T23:59:59Z',
  })
  @IsDateString()
  @IsNotEmpty()
  to: string;
}
