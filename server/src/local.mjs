import { createServer } from 'node:http';
import handler from './handler.mjs';
const port = Number(process.env.PORT || 8787);
createServer(handler).listen(port, '0.0.0.0', () =>
  console.log(`BrainPal API listening on port ${port}`),
);
