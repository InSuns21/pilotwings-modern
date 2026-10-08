import type { FlightState } from '../flight/ArcadeFlightModel';
import type { GameSelection, WorldId } from './GameCatalog';
import type { TaskProgress } from './TaskRuntime';
import { GROUND_TARGETS } from './GroundTargetMission';
import { getTrainingCourse } from './TrainingMission';
import {
  MOUNTAINS,
  RUNWAY,
  TRAINING_ISLAND_OUTLINE
} from '../world/WorldGeometry';
import { MATSUMOTO_RUNWAY } from '../world/MatsumotoWorld';

const MAP_WIDTH = 320;
const MAP_HEIGHT = 220;
const BOUNDS = {
  'training-island': { minX: -410, maxX: 680, minZ: -380, maxZ: 380 },
  'matsumoto-real': { minX: -1450, maxX: 1450, minZ: -980, maxZ: 980 }
} as const;

export function worldToIndexMap(
  worldId: WorldId,
  x: number,
  z: number
): { x: number; y: number; outside: boolean } {
  const b = BOUNDS[worldId];
  const rawX = ((x - b.minX) / (b.maxX - b.minX)) * MAP_WIDTH;
  const rawY = ((z - b.minZ) / (b.maxZ - b.minZ)) * MAP_HEIGHT;
  return {
    x: Math.max(7, Math.min(MAP_WIDTH - 7, rawX)),
    y: Math.max(7, Math.min(MAP_HEIGHT - 7, rawY)),
    outside: rawX < 0 || rawX > MAP_WIDTH || rawY < 0 || rawY > MAP_HEIGHT
  };
}

export function instrumentHeading(worldId: WorldId, headingRadians: number): number {
  const localDegrees = headingRadians * 180 / Math.PI;
  // Local +X is the runway axis. Matsumoto's real RWY 18 heading is 171.24°
  // true, while the fictional island has no geographic north reference.
  const trueOffset = worldId === 'matsumoto-real'
    ? MATSUMOTO_RUNWAY.trueBearingDegrees : 0;
  return ((localDegrees + trueOffset) % 360 + 360) % 360;
}

function p(worldId: WorldId, x: number, z: number): string {
  const point = worldToIndexMap(worldId, x, z);
  return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
}

function mapBase(worldId: WorldId): string {
  if (worldId === 'training-island') {
    const outline = TRAINING_ISLAND_OUTLINE
      .map((point) => p(worldId, point.x, point.z)).join(' ');
    const x1 = worldToIndexMap(worldId, RUNWAY.minX, -RUNWAY.halfWidth);
    const x2 = worldToIndexMap(worldId, RUNWAY.maxX, RUNWAY.halfWidth);
    const peaks = MOUNTAINS.map((mountain) => {
      const c = worldToIndexMap(worldId, mountain.x, mountain.z);
      return `<path d="M ${c.x} ${c.y - 5} l -5 10 h 10Z" fill="#8fb293" stroke="#31594f" stroke-width="1"/>`;
    }).join('');
    return `
      <polygon points="${outline}" fill="#244d48" stroke="#8ab39a" stroke-width="1.6"/>
      ${peaks}
      <rect x="${x1.x}" y="${x1.y}" width="${x2.x - x1.x}"
        height="${x2.y - x1.y}" fill="#aabac0" stroke="#ecf6e8" stroke-width=".7"/>
      <path d="M ${p(worldId, RUNWAY.minX, 0)} L ${p(worldId, RUNWAY.maxX, 0)}"
        stroke="#eef7db" stroke-width=".8" stroke-dasharray="5 4"/>`;
  }
  const start = worldToIndexMap(worldId, -MATSUMOTO_RUNWAY.halfLength, -MATSUMOTO_RUNWAY.halfWidth);
  const end = worldToIndexMap(worldId, MATSUMOTO_RUNWAY.halfLength, MATSUMOTO_RUNWAY.halfWidth);
  return `
    <g stroke="#3f665c" stroke-width=".6" opacity=".5">
      <path d="M80 0V220 M160 0V220 M240 0V220 M0 55H320 M0 110H320 M0 165H320"/>
    </g>
    <rect x="${start.x}" y="${start.y}" width="${end.x - start.x}"
      height="${end.y - start.y}" fill="#b6bdc0" stroke="#f1f0d8"/>
    <path d="M${p(worldId, -1000, 0)} L${p(worldId, 1000, 0)}"
      stroke="#f4f2d5" stroke-width=".8" stroke-dasharray="5 4"/>`;
}

function objectives(selection: GameSelection): string {
  const worldId = selection.world.id;
  if (selection.task.id === 'island-ground-targets') {
    return GROUND_TARGETS.map((target, index) => {
      const c = worldToIndexMap(worldId, target.x, target.z);
      return `<g data-objective-index="${index}" class="map-objective">
        <circle cx="${c.x}" cy="${c.y}" r="8" fill="#172c35" stroke="#ffd36a" stroke-width="2"/>
        <circle cx="${c.x}" cy="${c.y}" r="3" fill="#ffd36a"/>
        <text x="${c.x + 10}" y="${c.y - 8}">${index + 1}</text>
      </g>`;
    }).join('');
  }
  return getTrainingCourse(selection.task.id).rings.map((ring, index) => {
    const c = worldToIndexMap(worldId, ring.center.x, ring.center.z);
    return `<g data-objective-index="${index}" class="map-objective">
      <circle cx="${c.x}" cy="${c.y}" r="5" fill="#142831" stroke="#ffb777" stroke-width="2"/>
      <text x="${c.x + 6}" y="${c.y - 6}">${index + 1}</text>
    </g>`;
  }).join('');
}

export function instrumentPanelMarkup(selection: GameSelection): string {
  const geographic = selection.world.id === 'matsumoto-real';
  const roseLabels = geographic ? ['N', 'E', 'S', 'W'] : ['0', '90', '180', '270'];
  const ticks = Array.from({ length: 13 }, (_, index) => {
    const deg = -135 + index * 22.5;
    const angle = deg * Math.PI / 180;
    const x1 = 60 + Math.sin(angle) * 43;
    const y1 = 60 - Math.cos(angle) * 43;
    const x2 = 60 + Math.sin(angle) * (index % 2 === 0 ? 35 : 39);
    const y2 = 60 - Math.cos(angle) * (index % 2 === 0 ? 35 : 39);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d8e6e1" stroke-width="${index % 2 === 0 ? 2 : 1}"/>`;
  }).join('');
  // The glance instruments and navigation map are separate overlays: the
  // flight path stays clear, and checking speed/bank needs only a short saccade.
  return `<aside class="flight-instruments" aria-label="飛行計器">
    <div class="instrument-row">
      <section class="instrument-gauge">
        <span class="instrument-caption">AIRSPEED</span>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="54" fill="#101d27" stroke="#718891" stroke-width="3"/>
          ${ticks}
          <path d="M 31 91 A 43 43 0 0 1 91 31" fill="none" stroke="#78c497" stroke-width="3" opacity=".85"/>
          <path d="M 31 29 A 43 43 0 0 1 91 91" fill="none" stroke="#df815f" stroke-width="3" opacity=".8"/>
          <g data-speed-needle transform="rotate(-135 60 60)">
            <path d="M60 64 L58 28 L62 28Z" fill="#f8c375"/>
          </g>
          <circle cx="60" cy="60" r="5" fill="#d6e3e1"/>
        </svg>
        <strong data-gauge-speed>000</strong><small>km/h</small>
      </section>
      <section class="instrument-gauge">
        <span class="instrument-caption">ATTITUDE</span>
        <div class="attitude-bezel">
          <div class="attitude-horizon" data-attitude-horizon>
            <div class="attitude-sky"></div><div class="attitude-earth"></div>
            <div class="attitude-horizon-line"></div>
            <div class="attitude-pitch-line attitude-pitch-up"></div>
            <div class="attitude-pitch-line attitude-pitch-down"></div>
          </div>
          <div class="attitude-wings">─ ◆ ─</div>
        </div>
        <strong data-gauge-pitch>+0°</strong><small data-gauge-roll>BANK 0°</small>
      </section>
      <section class="instrument-gauge">
        <span class="instrument-caption">${geographic ? 'TRUE HDG' : 'LOCAL HDG'}</span>
        <div class="compass-bezel">
          <div class="compass-rose" data-compass-rose>
            <span class="rose-n">${roseLabels[0]}</span>
            <span class="rose-e">${roseLabels[1]}</span>
            <span class="rose-s">${roseLabels[2]}</span>
            <span class="rose-w">${roseLabels[3]}</span>
          </div>
          <span class="compass-lubber">▼</span>
        </div>
        <strong data-gauge-heading>000°</strong><small>${geographic ? 'TRUE NORTH' : '+X = 000°'}</small>
      </section>
    </div>
  </aside>
  <section class="index-map-panel" data-index-map aria-label="全体索引図">
    <div class="index-map-heading">
      <strong>FLIGHT INDEX</strong>
      <button type="button" class="index-map-toggle" data-map-toggle aria-expanded="true" aria-controls="flight-index-content" aria-label="全体マップの表示切替">HIDE · M</button>
    </div>
    <div class="index-map-content" id="flight-index-content">
      <span class="index-map-world">${geographic ? 'MATSUMOTO · LOCAL GRID' : 'TRAINING ISLAND · LOCAL GRID'}</span>
      <svg class="index-map" viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" role="img"
        aria-label="機体の現在位置と残りのリングまたは標的">
        <rect width="${MAP_WIDTH}" height="${MAP_HEIGHT}" fill="#122b37"/>
        <g stroke="#355669" stroke-width=".65" opacity=".48">
          <path d="M 0 110 H320 M160 0 V220"/>
        </g>
        ${mapBase(worldIdFromSelection(selection))}
        ${objectives(selection)}
        <g data-map-aircraft transform="translate(0 0)">
          <path d="M11 0 L-8 -6 L-4 0 L-8 6Z" fill="#f0f5ef" stroke="#14242d" stroke-width="1.5"/>
        </g>
      </svg>
      <div class="map-footer"><span data-map-status>POS READY</span><span>+X → · +Z ↓</span></div>
    </div>
  </section>`;
}

function worldIdFromSelection(selection: GameSelection): WorldId {
  return selection.world.id;
}

export interface FlightInstrumentPanel {
  update(state: FlightState, progress: TaskProgress): void;
  dispose(): void;
}

export function mountFlightInstruments(
  root: HTMLElement,
  selection: GameSelection
): FlightInstrumentPanel {
  root.innerHTML = instrumentPanelMarkup(selection);
  const speed = root.querySelector<HTMLElement>('[data-gauge-speed]')!;
  const speedNeedle = root.querySelector<SVGGElement>('[data-speed-needle]')!;
  const horizon = root.querySelector<HTMLElement>('[data-attitude-horizon]')!;
  const pitch = root.querySelector<HTMLElement>('[data-gauge-pitch]')!;
  const roll = root.querySelector<HTMLElement>('[data-gauge-roll]')!;
  const compass = root.querySelector<HTMLElement>('[data-compass-rose]')!;
  const heading = root.querySelector<HTMLElement>('[data-gauge-heading]')!;
  const plane = root.querySelector<SVGGElement>('[data-map-aircraft]')!;
  const mapStatus = root.querySelector<HTMLElement>('[data-map-status]')!;
  const objectiveNodes = [...root.querySelectorAll<SVGGElement>('[data-objective-index]')];
  const map = root.querySelector<HTMLElement>('[data-index-map]')!;
  const toggle = root.querySelector<HTMLButtonElement>('[data-map-toggle]')!;
  // On narrow and portrait screens a large map obstructs flight targets. Show
  // the map tab instead and let the pilot reveal it explicitly when needed.
  let mapOpen = !window.matchMedia(
    '(max-width: 760px), (orientation: portrait) and (max-width: 1100px)'
  ).matches;
  const setMapOpen = (open: boolean): void => {
    mapOpen = open;
    map.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'HIDE · M' : 'OPEN · M';
  };
  const onToggle = (): void => setMapOpen(!mapOpen);
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== 'KeyM' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    if (event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) {
      return;
    }
    event.preventDefault();
    onToggle();
  };
  setMapOpen(mapOpen);
  toggle.addEventListener('click', onToggle);
  window.addEventListener('keydown', onKeyDown);

  return {
    dispose() {
      toggle.removeEventListener('click', onToggle);
      window.removeEventListener('keydown', onKeyDown);
    },
    update(state, progress) {
      const kmh = Math.round(state.speed * 3.6);
      const pitchDeg = state.pitch * 180 / Math.PI;
      const rollDeg = state.roll * 180 / Math.PI;
      const hdg = instrumentHeading(selection.world.id, state.heading);
      speed.textContent = String(kmh).padStart(3, '0');
      speedNeedle.setAttribute('transform',
        `rotate(${-135 + Math.min(300, kmh) / 300 * 270} 60 60)`);
      horizon.style.transform = `translateY(${Math.max(-35, Math.min(35, pitchDeg * 1.3))}px) rotate(${-rollDeg}deg)`;
      pitch.textContent = `${pitchDeg >= 0 ? '+' : ''}${Math.round(pitchDeg)}°`;
      roll.textContent = `BANK ${Math.round(rollDeg)}°`;
      compass.style.transform = `rotate(${-hdg}deg)`;
      heading.textContent = `${String(Math.round(hdg) % 360).padStart(3, '0')}°`;
      const point = worldToIndexMap(selection.world.id, state.position.x, state.position.z);
      plane.setAttribute('transform',
        `translate(${point.x} ${point.y}) rotate(${state.heading * 180 / Math.PI})`);
      mapStatus.textContent = point.outside ? 'OUTSIDE INDEX' : 'AIRCRAFT ●';
      const completed = 'kind' in progress ? progress.hitCount : progress.nextRingIndex;
      objectiveNodes.forEach((node, index) => {
        node.style.display = index < completed || progress.phase === 'failed' ? 'none' : '';
        node.classList.toggle('active', index === completed);
      });
    }
  };
}
