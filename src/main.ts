import './style/main.css';
import { bootstrapGame } from './game/bootstrap';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('#app was not found');
}

bootstrapGame(root).catch((error: unknown) => {
  console.error(error);
  root.innerHTML = `
    <main class="fatal-error">
      <h1>起動に失敗しました</h1>
      <p>開発者ツールのコンソールを確認してください。</p>
    </main>
  `;
});
