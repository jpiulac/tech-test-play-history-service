import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CursorRangeDto {
  @ApiProperty({
    description: 'The MongoDB ObjectId of the last item in the previous page.',
    required: false,
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  // TODO: cant get min max to work in swagger
  @ApiProperty({
    description:
      'Maximum number of records to return (defaults to 200), [minimum 1, maximum 5000].',
    default: 200,
    minimum: 1,
    maximum: 5000,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(5000)
  limit: number = 200;
}
