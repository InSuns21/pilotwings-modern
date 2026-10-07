import {
  AIRCRAFT,
  DEFAULT_GAME_SELECTION_IDS,
  DEFAULT_WORLD_SETTINGS,
  TASKS,
  WORLDS,
  getAvailableTasks,
  resolveGameSelection,
  type AircraftId,
  type CatalogOption,
  type GameSelection,
  type TaskId,
  type WorldId
} from './GameCatalog';
import {
  mountAircraftPreview,
  mountWorldPreview,
  type StartScreen3dPreview
} from './StartScreen3dPreview';
import { taskPreviewSvg } from './StartScreenPreview';

export interface StartScreenController {
  dispose(): void;
}

export function mountStartScreen(
  root: HTMLElement,
  onStart: (selection: GameSelection) => Promise<void> | void
): StartScreenController {
  const initialTasks = getAvailableTasks(
    DEFAULT_GAME_SELECTION_IDS.worldId,
    DEFAULT_GAME_SELECTION_IDS.aircraftId
  );

  root.innerHTML = `
    <main class="start-screen">
      <section class="start-panel" aria-labelledby="start-title">
        <div class="start-brand">
          <span class="start-kicker">ORIGINAL BROWSER FLIGHT GAME</span>
          <h1 id="start-title">PILOTWINGS MODERN</h1>
          <p>飛ぶ場所と機体を選ぶと、その組み合わせで遊べるタスクが表示されます。</p>
        </div>

        <div class="flight-select-grid">
          ${selectorMarkup('WORLD', 'world', WORLDS, DEFAULT_GAME_SELECTION_IDS.worldId)}
          ${selectorMarkup(
            'AIRCRAFT',
            'aircraft',
            AIRCRAFT,
            DEFAULT_GAME_SELECTION_IDS.aircraftId
          )}
          ${selectorMarkup('TASK', 'task', initialTasks, DEFAULT_GAME_SELECTION_IDS.taskId)}
        </div>

        <div class="world-settings" data-world-settings hidden>
          <label>
            <span>HEIGHT EXAGGERATION</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.25"
              value="${DEFAULT_WORLD_SETTINGS.heightExaggeration}"
              data-height-exaggeration
            />
          </label>
          <output data-height-output>${DEFAULT_WORLD_SETTINGS.heightExaggeration.toFixed(2)}×</output>
          <small>DEM地形の高さ倍率。滑走路位置は実座標・実寸のまま維持します。</small>
        </div>

        <div class="start-summary" data-selection-summary></div>

        <div class="start-actions">
          <button class="start-button" type="button" data-start-flight>
            START FLIGHT
          </button>
          <span class="start-note">TASKはWORLD × AIRCRAFTに対応する訓練だけを表示します。</span>
        </div>
      </section>
    </main>
  `;

  const worldSelect = requireSelect<WorldId>(root, '[data-select-world]');
  const aircraftSelect = requireSelect<AircraftId>(root, '[data-select-aircraft]');
  const taskSelect = requireSelect<TaskId>(root, '[data-select-task]');
  const worldPreviewHost = requireElement(root, '[data-preview-world]');
  const aircraftPreviewHost = requireElement(root, '[data-preview-aircraft]');
  const taskPreviewHost = requireElement(root, '[data-preview-task]');
  const worldSettings = requireElement(root, '[data-world-settings]');
  const heightInput = root.querySelector<HTMLInputElement>('[data-height-exaggeration]');
  const heightOutput = root.querySelector<HTMLOutputElement>('[data-height-output]');
  const summary = root.querySelector<HTMLElement>('[data-selection-summary]');
  const startButton = root.querySelector<HTMLButtonElement>('[data-start-flight]');

  if (!summary || !startButton || !heightInput || !heightOutput) {
    throw new Error('Start screen did not initialize');
  }

  let disposed = false;
  let worldPreview: StartScreen3dPreview | null = null;
  let aircraftPreview: StartScreen3dPreview | null = null;

  const syncTaskOptions = (): readonly CatalogOption<TaskId>[] => {
    const availableTasks = getAvailableTasks(
      worldSelect.value as WorldId,
      aircraftSelect.value as AircraftId
    );

    const currentTaskId = taskSelect.value as TaskId;
    const selectedTaskId =
      availableTasks.find((task) => task.id === currentTaskId)?.id ??
      availableTasks[0]?.id;

    if (!selectedTaskId) {
      throw new Error('No tasks are available for the selected world and aircraft');
    }

    taskSelect.innerHTML = optionMarkup(availableTasks, selectedTaskId);
    taskSelect.value = selectedTaskId;
    return availableTasks;
  };

  const currentSelection = (): GameSelection =>
    resolveGameSelection(
      {
        worldId: worldSelect.value as WorldId,
        aircraftId: aircraftSelect.value as AircraftId,
        taskId: taskSelect.value as TaskId
      },
      {
        heightExaggeration: Number(heightInput.value)
      }
    );

  const updateCards = (): void => {
    const worldId = worldSelect.value as WorldId;
    const aircraftId = aircraftSelect.value as AircraftId;
    const taskId = taskSelect.value as TaskId;
    const availableTasks = getAvailableTasks(worldId, aircraftId);

    updateCardText(root, 'world', WORLDS, worldId);
    updateCardText(root, 'aircraft', AIRCRAFT, aircraftId);
    updateCardText(root, 'task', availableTasks, taskId);

    worldSettings.hidden = worldId !== 'matsumoto-real';

    worldPreview?.dispose();
    worldPreview = mountWorldPreview(
      worldPreviewHost,
      worldId,
      Number(heightInput.value)
    );

    aircraftPreview?.dispose();
    aircraftPreview = mountAircraftPreview(aircraftPreviewHost, aircraftId);

    taskPreviewHost.innerHTML = taskPreviewSvg(taskId);
  };

  const updateSummary = (): void => {
    const selection = currentSelection();
    const relief =
      selection.world.id === 'matsumoto-real'
        ? ` · 高さ ${selection.worldSettings.heightExaggeration.toFixed(2)}×`
        : '';
    summary.innerHTML = `
      <div><span>WORLD</span><strong>${selection.world.name}${relief}</strong></div>
      <div><span>AIRCRAFT</span><strong>${selection.aircraft.name}</strong></div>
      <div><span>TASK</span><strong>${selection.task.name}</strong></div>
    `;
  };

  const onChange = (): void => {
    syncTaskOptions();
    updateCards();
    updateSummary();
  };

  const onHeightInput = (): void => {
    heightOutput.value = `${Number(heightInput.value).toFixed(2)}×`;
    updateSummary();
  };

  const onHeightChange = (): void => {
    if (worldSelect.value !== 'matsumoto-real') {
      return;
    }
    worldPreview?.dispose();
    worldPreview = mountWorldPreview(
      worldPreviewHost,
      'matsumoto-real',
      Number(heightInput.value)
    );
  };

  worldSelect.addEventListener('change', onChange);
  aircraftSelect.addEventListener('change', onChange);
  taskSelect.addEventListener('change', onChange);
  heightInput.addEventListener('input', onHeightInput);
  heightInput.addEventListener('change', onHeightChange);

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
  syncTaskOptions();
  updateCards();
  updateSummary();

  return {
    dispose(): void {
      disposed = true;
      worldPreview?.dispose();
      aircraftPreview?.dispose();
      worldPreview = null;
      aircraftPreview = null;
      worldSelect.removeEventListener('change', onChange);
      aircraftSelect.removeEventListener('change', onChange);
      taskSelect.removeEventListener('change', onChange);
      heightInput.removeEventListener('input', onHeightInput);
      heightInput.removeEventListener('change', onHeightChange);
      startButton.removeEventListener('click', onClick);
    }
  };
}

function selectorMarkup<Id extends string>(
  label: string,
  kind: string,
  options: readonly CatalogOption<Id>[],
  selectedId: Id
): string {
  const selected = options.find((option) => option.id === selectedId) ?? options[0];
  if (!selected) {
    throw new Error(`No options registered for ${kind}`);
  }

  return `
    <label class="flight-select-card" data-card-${kind}>
      <span class="flight-select-label">${label}</span>
      <div class="flight-select-preview" data-preview-${kind}></div>
      <strong data-subtitle-${kind}>${selected.subtitle}</strong>
      <select data-select-${kind} aria-label="${label} selection">
        ${optionMarkup(options, selected.id)}
      </select>
      <small data-description-${kind}>${selected.description}</small>
    </label>
  `;
}

function optionMarkup<Id extends string>(
  options: readonly CatalogOption<Id>[],
  selectedId: Id
): string {
  return options
    .map(
      (option) =>
        `<option value="${option.id}" ${option.id === selectedId ? 'selected' : ''}>
          ${option.name}
        </option>`
    )
    .join('');
}

function updateCardText<Id extends string>(
  root: HTMLElement,
  kind: string,
  options: readonly CatalogOption<Id>[],
  id: Id
): void {
  const option = options.find((candidate) => candidate.id === id);
  const subtitleElement = root.querySelector<HTMLElement>(`[data-subtitle-${kind}]`);
  const descriptionElement = root.querySelector<HTMLElement>(
    `[data-description-${kind}]`
  );

  if (!option || !subtitleElement || !descriptionElement) {
    throw new Error(`Start screen card did not initialize: ${kind}`);
  }

  subtitleElement.textContent = option.subtitle;
  descriptionElement.textContent = option.description;
}

function requireElement(root: HTMLElement, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`Start screen element not found: ${selector}`);
  }
  return element;
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
