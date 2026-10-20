import { createApp } from './app.js';
import { env } from './config/env.js';
import { activeProvider } from './services/ai.js';

createApp().listen(env.port, () => {
  console.log(`EduTrack AI API chạy tại http://localhost:${env.port} (AI: ${activeProvider()})`);
});
