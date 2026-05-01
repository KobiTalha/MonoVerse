export const serverConfig = {
  port: Number(process.env.PORT ?? 4001),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000',
  roomCapacity: Number(process.env.ROOM_CAPACITY ?? 4)
};

