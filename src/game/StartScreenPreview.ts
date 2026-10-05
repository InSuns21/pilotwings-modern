import type { TaskId } from './GameCatalog';

const SVG_OPEN =
  '<svg viewBox="0 0 320 176" role="img" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">';

export function taskPreviewSvg(id: TaskId): string {
  switch (id) {
    case 'ring-training':
      return `${SVG_OPEN}
        <rect width="320" height="176" rx="14" fill="#dff2fc"/>
        <path d="M0 128 C82 105 154 119 320 87 V176 H0Z" fill="#5f874d"/>
        <path d="M20 153 L301 108 L307 126 L27 171Z" fill="#363b42"/>
        <path d="M38 157 L289 117" stroke="#f5f1dc" stroke-width="3" stroke-dasharray="14 10"/>
        <path d="M60 127 C96 70 132 55 166 73 C196 89 219 81 248 45" fill="none" stroke="#315875" stroke-width="4" stroke-dasharray="8 7" stroke-linecap="round"/>
        <g fill="none" stroke="#ff8a4c" stroke-width="6">
          <circle cx="101" cy="83" r="18"/>
          <circle cx="160" cy="68" r="16"/>
          <circle cx="219" cy="73" r="18"/>
        </g>
        <path d="M244 45 L253 49 L248 57" fill="none" stroke="#315875" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M220 120 L281 110 L286 120 L225 130Z" fill="#61d174" opacity=".9"/>
        <g transform="translate(45 111) rotate(-9)">
          <path d="M0 0 L27 -4 L39 1 L27 6 L0 4Z" fill="#fff0bd" stroke="#c9a957"/>
          <path d="M12 -2 L23 -14 L27 -13 L22 0Z" fill="#d94f3d"/>
        </g>
        <text x="20" y="28" fill="#315875" font-size="11" font-weight="800" letter-spacing="1.4">TAKEOFF → RINGS → LANDING</text>
      </svg>`;
  }

  return assertNever(id);
}

function assertNever(value: never): never {
  throw new Error(`Unsupported task preview id: ${String(value)}`);
}
