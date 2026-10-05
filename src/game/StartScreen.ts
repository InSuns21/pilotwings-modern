import {
  AIRCRAFT,
  DEFAULT_GAME_SELECTION_IDS,
  TASKS,
  WORLDS,
  resolveGameSelection,
  type AircraftId,
  type GameSelection,
  type TaskId,
  type WorldId
} from './GameCatalog';

export interface StartScreenController {
  dispose(): void;
}

export function mountStartScreen(
  root: HTMLElement,
  onStart: (selection: GameSelection) => Promise<void> | void
): StartScreenController {
  root.innerHTML = `
    <main class="start-screen">
      <section class="start-panel" aria-labelledby="start-title">
        <div class="start-brand">
          <span class="start-kicker">ORIGINAL BROWSER FLIGHT GAME</span>
          <h1 id="start-title">PILOTWINGS MODERN</h1>
          <p>飛ぶ場所、機体、タスクを選んでフライトを開始します。</p>
        </div>

        <div class="flight-select-grid">
          ${selectorMarkup('WORLD', 'world', WORLDS, DEFAULT_GAME_SELECTION_IDS.worldId)}
          ${selectorMarkup(
            'AIRCRAFT',
            'aircraft',
            AIRCRAFT,
            DEFAULT_GAME_SELECTION_IDS.aircraftId
          )}
          ${selectorMarkup('TASK', 'task', TASKS, DEFAULT_GAME_SELECTION_IDS.taskId)}
        </div>

        <div class="start-summary" data-selection-summary></div>

        <div class="start-actions">
          <button class="start-button" type="button" data-start-flight>
            START FLIGHT
          </button>
          <span class="start-note">現在は各カテゴリ1種類。選択枠は追加コンテンツ用に拡張可能です。</span>
        </div>
      </section>
    </main>
  `;

  const worldSelect = requireSelect<WorldId>(root, '[data-select-world]');
  const aircraftSelect = requireSelect<AircraftId>(root, '[data-select-aircraft]');
  const taskSelect = requireSelect<TaskId>(root, '[data-select-task]');
  const summary = root.querySelector<HTMLElement>('[data-selection-summary]');
  const startButton = root.querySelector<HTMLButtonElement>('[data-start-flight]');

  if (!summary || !startButton) {
    throw new Error('Start screen did not initialize');
  }

  let disposed = false;

  const currentSelection = (): GameSelection =>
    resolveGameSelection({
      worldId: worldSelect.value as WorldId,
      aircraftId: aircraftSelect.value as AircraftId,
      taskId: taskSelect.value as TaskId
    });

  const updateSummary = (): void => {
    const selection = currentSelection();
    summary.innerHTML = `
      <div><span>WORLD</span><strong>${selection.world.name}</strong></div>
      <div><span>AIRCRAFT</span><strong>${selection.aircraft.name}</strong></div>
      <div><span>TASK</span><strong>${selection.task.name}</strong></div>
    `;
  };

  const onChange = (): void => updateSummary();
  worldSelect.addEventListener('change', onChange);
  aircraftSelect.addEventListener('change', onChange);
  taskSelect.addEventListener('change', onChange);

  const onClick = async (): Promise<void> => {
    if (startButton.disabled || disposed) {
      return;
    }

    startButton.disabled = true;
    startButton.textContent = 'LOADING...';

    try {
      await onStart(currentSelection());
    } catch (error) {
      startButton.disabled = false;
      startButton.textContent = 'START FLIGHT';
      throw error;
    }
  };

  startButton.addEventListener('click', onClick);
  updateSummary();

  return {
    dispose(): void {
      disposed = true;
      worldSelect.removeEventListener('change', onChange);
      aircraftSelect.removeEventListener('change', onChange);
      taskSelect.removeEventListener('change', onChange);
      startButton.removeEventListener('click', onClick);
    }
  };
}

function selectorMarkup<Id extends string>(
  label: string,
  kind: string,
  options: readonly { id: Id; name: string; subtitle: string; description: string }[],
  selectedId: Id
): string {
  const optionMarkup = options
    .map(
      (option) =>
        `<option value="${option.id}" ${option.id === selectedId ? 'selected' : ''}>
          ${option.name}
        </option>`
    )
    .join('');

  const selected = options.find((option) => option.id === selectedId) ?? options[0];
  if (!selected) {
    throw new Error(`No options registered for ${kind}`);
  }

  return `
    <label class="flight-select-card">
      <span class="flight-select-label">${label}</span>
      <strong>${selected.subtitle}</strong>
      <select data-select-${kind} aria-label="${label} selection">
        ${optionMarkup}
      </select>
      <small>${selected.description}</small>
    </label>
  `;
}

function requireSelect<Id extends string>(
  root: HTMLElement,
  selector: string
): HTMLSelectElement {
  const element = root.querySelector<HTMLSelectElement>(selector);
  if (!element) {
    throw new Error(`Start screen selector not found: ${selector}`);
  }
  return element;
}
