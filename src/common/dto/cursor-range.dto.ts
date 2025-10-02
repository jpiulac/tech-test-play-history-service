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
      'Maximum number of records to return (defaults to 20), [minimum 1, maximum 500].',
    default: 20,
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(500)
  limit: number = 20;
}
