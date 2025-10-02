// import { Test, TestingModule } from '@nestjs/testing';
// import { PlayController } from '@app/v1/play-events/play.controller';
// import { PlayService } from '@app/v1/play-events/play.service';
// import { PlayEventHistoryResponseDto } from '@app/v1/play-events/dto/play-event-history-response.dto';

// describe('PlayController', () => {
//   let playController: PlayController;

//   beforeEach(async () => {
//     const app: TestingModule = await Test.createTestingModule({
//       controllers: [PlayController],
//       providers: [PlayService],
//     }).compile();

//     playController = app.get<PlayController>(PlayController);
//   });

//   describe('POST /v1/play', () => {
//     it('should create a play event', async () => {
//       const playEventDto: PlayEventHistoryResponseDto = {
//         userId: 'user123',
//         contentId: 'movie456',
//         device: 'mobile',
//         timestamp: '2025-09-30T12:00:00Z',
//         playbackDuration: 120,
//       };

//       const result = await playController.createPlayEvent(
//         playEventDto,
//         '123e4567-e89b-42d3-a456-426614174000',
//       );

//       expect(result).toEqual(playEventDto);
//       expect(result.userId).toBe('user123');
//       expect(result.contentId).toBe('movie456');
//       expect(result.device).toBe('mobile');
//       expect(result.timestamp).toBe('2025-09-30T12:00:00Z');
//       expect(result.playbackDuration).toBe(120);
//     });
//   });
// });
